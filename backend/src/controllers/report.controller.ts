import { Request, Response, NextFunction } from 'express';
import { sendDailyReportEmail, sendMonthlyReportEmail } from '../services/email.service';
import { DailySnapshot } from '../models/DailySnapshot';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense from '../models/Expense';
import { formatToDateStr, getDayRange, getMonthRange } from '../utils/dateUtils';

export async function triggerDailyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.body || {};
    const targetDate = date ? new Date(date) : new Date();
    const result = await sendDailyReportEmail(targetDate);
    if (result && result.success === false) {
      res.status(400).json({
        message: result.error || result.message || 'فشل إرسال البريد الإلكتروني. يرجى التحقق من إعدادات SMTP في ملف .env',
        details: result,
      });
      return;
    }
    const dStr = formatToDateStr(targetDate);
    res.status(200).json({
      message: `تم إرسال تقرير يوم ${dStr} بنجاح إلى البريد الإلكتروني للإدارة`,
      details: result,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function triggerMonthlyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { year, month } = req.body || {};
    const targetYear = Number(year) || new Date().getFullYear();
    const targetMonth = Number(month) || (new Date().getMonth() + 1);

    const result = await sendMonthlyReportEmail(targetYear, targetMonth);
    if (result && result.success === false) {
      res.status(400).json({
        message: result.error || result.message || 'فشل إرسال البريد الإلكتروني. يرجى التحقق من إعدادات SMTP في ملف .env',
        details: result,
      });
      return;
    }
    res.status(200).json({
      message: `تم إرسال التقرير الشهري لشهـر ${targetMonth}/${targetYear} بنجاح إلى البريد الإلكتروني للإدارة`,
      details: result,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function getCalendarSnapshots(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    const { startOfMonth, endOfMonth, daysInMonth, datePrefix } = getMonthRange(year, month);

    // Fetch all sales that were either created in this month OR received a payment in this month
    const [sales, batches] = await Promise.all([
      Sale.find({
        $or: [
          { createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { payments: { $elemMatch: { paidAt: { $gte: startOfMonth, $lte: endOfMonth } } } },
        ],
      }).lean(),
      ProductionBatch.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean(),
    ]);

    const dailySalesMap = new Map<string, { totalPaidRevenue: number; totalInvoicedRevenue: number; totalRealizedMargin: number; count: number }>();

    for (const sale of sales) {
      const total = sale.total || 0;
      const margin = sale.grossMargin || 0;
      const ratio = total > 0 ? margin / total : 0;

      // 1. Invoiced revenue & invoice count belong to the day the invoice was created
      const createdDate = new Date(sale.createdAt);
      if (createdDate >= startOfMonth && createdDate <= endOfMonth) {
        const dStr = formatToDateStr(createdDate);
        const current = dailySalesMap.get(dStr) || { totalPaidRevenue: 0, totalInvoicedRevenue: 0, totalRealizedMargin: 0, count: 0 };
        current.totalInvoicedRevenue += total;
        current.count += 1;
        dailySalesMap.set(dStr, current);
      }

      // 2. Paid revenue & realized profit belong strictly to the day each payment was actually received
      const payments = sale.payments || [];
      if (payments.length > 0) {
        for (const p of payments) {
          const pDate = new Date(p.paidAt);
          if (pDate >= startOfMonth && pDate <= endOfMonth) {
            const dStr = formatToDateStr(pDate);
            const current = dailySalesMap.get(dStr) || { totalPaidRevenue: 0, totalInvoicedRevenue: 0, totalRealizedMargin: 0, count: 0 };
            current.totalPaidRevenue += (p.amount || 0);
            current.totalRealizedMargin += (p.amount || 0) * ratio;
            dailySalesMap.set(dStr, current);
          }
        }
      } else if ((sale.paidAmount || 0) > 0 && createdDate >= startOfMonth && createdDate <= endOfMonth) {
        // Fallback for legacy sales without payments array
        const dStr = formatToDateStr(createdDate);
        const current = dailySalesMap.get(dStr) || { totalPaidRevenue: 0, totalInvoicedRevenue: 0, totalRealizedMargin: 0, count: 0 };
        current.totalPaidRevenue += sale.paidAmount;
        current.totalRealizedMargin += sale.paidAmount * ratio;
        dailySalesMap.set(dStr, current);
      }
    }

    const dailyBatchesMap = new Map<string, number>();
    for (const b of batches) {
      const dStr = formatToDateStr(b.createdAt);
      const count = dailyBatchesMap.get(dStr) || 0;
      dailyBatchesMap.set(dStr, count + 1);
    }

    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const fullDate = `${datePrefix}-${dayStr}`;

      const saleData = dailySalesMap.get(fullDate) || { totalPaidRevenue: 0, totalInvoicedRevenue: 0, totalRealizedMargin: 0, count: 0 };
      const batchCount = dailyBatchesMap.get(fullDate) || 0;

      // Fixed expenses belong to the month as a whole and are NOT deducted from the daily view
      result.push({
        date: fullDate,
        totalRevenue: saleData.totalPaidRevenue,
        totalPaidRevenue: saleData.totalPaidRevenue,
        totalInvoicedRevenue: saleData.totalInvoicedRevenue,
        totalProfit: saleData.totalRealizedMargin,
        totalSalesCount: saleData.count,
        totalProductionBatches: batchCount,
      });
    }

    res.status(200).json(result);
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function getDailySnapshotByDate(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.params; // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ message: 'تاريخ غير صالح' });
      return;
    }

    const { startOfDay, endOfDay } = getDayRange(date);

    // Find sales created on this day OR sales that received a payment on this day
    const sales: ISale[] = await Sale.find({
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { payments: { $elemMatch: { paidAt: { $gte: startOfDay, $lte: endOfDay } } } },
      ],
    }).populate('lines.finishedProduct lines.rawMaterial');

    const batches: IProductionBatch[] = await ProductionBatch.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    let totalInvoicedRevenue = 0;
    let totalPaidRevenue = 0;
    let totalRemainingDebt = 0;
    let totalRealizedGrossMargin = 0;
    const invoicesBreakdown: any[] = [];

    for (const sale of sales) {
      const total = sale.total || 0;
      const margin = sale.grossMargin || 0;
      const ratio = total > 0 ? margin / total : 0;

      // Payments received TODAY for this sale
      const paymentsToday = (sale.payments || []).filter((p) => {
        const pDate = new Date(p.paidAt);
        return pDate >= startOfDay && pDate <= endOfDay;
      });
      const paidToday = paymentsToday.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Cumulative payments made ON or BEFORE this day
      const paymentsUpToToday = (sale.payments || []).filter((p) => {
        const pDate = new Date(p.paidAt);
        return pDate <= endOfDay;
      });
      const paidUpToToday = paymentsUpToToday.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingOnDay = Math.max(0, total - paidUpToToday);

      const realizedToday = paidToday * ratio;
      totalPaidRevenue += paidToday;
      totalRealizedGrossMargin += realizedToday;

      // If created today, count towards total invoiced revenue and debt on that day
      const createdToday = new Date(sale.createdAt) >= startOfDay && new Date(sale.createdAt) <= endOfDay;
      if (createdToday) {
        totalInvoicedRevenue += total;
        totalRemainingDebt += remainingOnDay;
      }

      // Determine the payment status of the invoice as of this day
      let paymentStatusOnDay: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
      if (remainingOnDay <= 0 && paidUpToToday > 0) {
        paymentStatusOnDay = 'PAID';
      } else if (paidUpToToday > 0 && remainingOnDay > 0) {
        paymentStatusOnDay = 'PARTIAL';
      } else {
        paymentStatusOnDay = 'UNPAID';
      }

      const items: any[] = [];
      for (const line of sale.lines) {
        let prodName = 'عنصر غير محدد';
        if (line.finishedProduct) {
          prodName = (line.finishedProduct as any).name || 'منتج تام';
        } else if (line.rawMaterial) {
          prodName = (line.rawMaterial as any).name || 'مادة خام';
        }

        items.push({
          productName: prodName,
          quantity: line.quantity,
          unit: line.unit || '',
          unitPrice: line.unitPriceAtSale,
          totalPrice: line.quantity * line.unitPriceAtSale,
        });
      }

      invoicesBreakdown.push({
        saleId: String(sale._id),
        receiptNumber: sale.receiptNumber,
        total,
        paidAmount: paidToday, // Amount paid on this exact day
        remainingAmount: remainingOnDay, // Remaining debt as of this day
        paymentStatus: paymentStatusOnDay,
        grossMargin: realizedToday,
        customerName: sale.customerName || 'عميل نقدي',
        customerPhone: sale.customerPhone || 'غير متوفر',
        soldAt: sale.createdAt,
        items,
      });
    }

    let totalQuantityProduced = 0;
    for (const b of batches) {
      totalQuantityProduced += b.quantityProduced || 0;
    }

    // Fixed expenses belong to the whole month, not deducted from the daily report
    res.status(200).json({
      date,
      totalRevenue: totalPaidRevenue,
      totalPaidRevenue,
      totalInvoicedRevenue,
      totalRemainingDebt,
      totalProfit: totalRealizedGrossMargin,
      totalRealizedProfit: totalRealizedGrossMargin,
      totalInvoicedProfit: totalRealizedGrossMargin,
      totalExpenses: 0,
      totalSalesCount: sales.filter((s) => new Date(s.createdAt) >= startOfDay && new Date(s.createdAt) <= endOfDay).length,
      totalProductionBatches: batches.length,
      totalQuantityProduced,
      invoicesBreakdown,
      expenses: [],
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function clearMonthRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const { year, month } = req.body;

    const targetYear = Number(year);
    const targetMonth = Number(month);

    if (!targetYear || !targetMonth) {
      res.status(400).json({ message: 'يرجى تحديد السنة والشهر بشكل صحيح' });
      return;
    }

    const { startOfMonth, endOfMonth, datePrefix } = getMonthRange(targetYear, targetMonth);

    // 1. مسح فواتير المبيعات لهذا الشهر نهائياً دون إرجاع البضائع للمخزون (حذف مباشر لتوفير المساحة في قاعدة البيانات)
    const salesResult = await Sale.deleteMany({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // 2. مسح دفعات الإنتاج للشهر (سجلات الأرشيف فقط دون التلاعب بالمخزون المتراكم)
    const batchesResult = await ProductionBatch.deleteMany({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // 3. مسح المصاريف المسجلة لهذا الشهر
    const expensesResult = await Expense.deleteMany({
      $or: [
        { year: targetYear, month: targetMonth },
        { date: { $regex: `^${datePrefix}` } },
      ],
    });

    // 4. مسح السجلات والتقارير اليومية المؤرشفة لهذا الشهر
    const snapshotResult = await DailySnapshot.deleteMany({
      date: { $regex: `^${datePrefix}` },
    });

    // تنبيه هام: المواد الخام (RawMaterial) ومواد التعبئة (Packaging) والمنتجات التامة (FinishedProduct) تظل ثابتة تماماً دون أي مساس بها
    res.status(200).json({
      message: `تم مسح سجلات وفواتير ومصاريف شهر ${targetMonth}/${targetYear} نهائياً لتوفير المساحة، مع الحفاظ الكامل على رصيد المخزون للمواد الخام ومواد التعبئة دون تغيير`,
      deletedSales: salesResult.deletedCount,
      deletedBatches: batchesResult.deletedCount,
      deletedExpenses: expensesResult.deletedCount,
      deletedSnapshots: snapshotResult.deletedCount,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
}
