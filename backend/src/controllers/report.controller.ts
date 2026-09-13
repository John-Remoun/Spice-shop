import { Request, Response, NextFunction } from 'express';
import { sendDailyReportEmail, sendMonthlyReportEmail } from '../services/email.service';
import { DailySnapshot } from '../models/DailySnapshot';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense, { IExpense } from '../models/Expense';

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
    const dStr = targetDate.toISOString().split('T')[0];
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

    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const datePrefix = `${year}-${monthStr}`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

    // Run queries in parallel for maximum performance and speed
    const [snapshots, sales, batches, expenses] = await Promise.all([
      DailySnapshot.find({
        date: { $gte: `${datePrefix}-01`, $lte: `${datePrefix}-${daysInMonth < 10 ? '0' + daysInMonth : daysInMonth}` },
      }).lean(),
      Sale.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean(),
      ProductionBatch.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean(),
      Expense.find({ year, month }).lean(),
    ]);

    const snapshotMap = new Map(snapshots.map((s: any) => [s.date, s]));

    const dailySalesMap = new Map<string, { totalRevenue: number; totalProfit: number; count: number }>();
    for (const sale of sales) {
      const dStr = sale.createdAt.toISOString().split('T')[0];
      const current = dailySalesMap.get(dStr) || { totalRevenue: 0, totalProfit: 0, count: 0 };
      current.totalRevenue += sale.total || 0;
      current.totalProfit += sale.grossMargin || 0;
      current.count += 1;
      dailySalesMap.set(dStr, current);
    }

    const dailyBatchesMap = new Map<string, number>();
    for (const b of batches) {
      const dStr = b.createdAt.toISOString().split('T')[0];
      const count = dailyBatchesMap.get(dStr) || 0;
      dailyBatchesMap.set(dStr, count + 1);
    }

    const dailyExpensesMap = new Map<string, number>();
    for (const e of expenses) {
      const current = dailyExpensesMap.get(e.date) || 0;
      dailyExpensesMap.set(e.date, current + e.amount);
    }

    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const fullDate = `${datePrefix}-${dayStr}`;

      if (snapshotMap.has(fullDate)) {
        const snap = snapshotMap.get(fullDate)!;
        const dayExpense = dailyExpensesMap.get(fullDate) || 0;
        result.push({
          date: fullDate,
          totalRevenue: snap.totalRevenue,
          totalProfit: snap.totalProfit - dayExpense,
          totalSalesCount: snap.totalSalesCount,
          totalProductionBatches: snap.totalProductionBatches,
        });
      } else {
        const saleData = dailySalesMap.get(fullDate) || { totalRevenue: 0, totalProfit: 0, count: 0 };
        const batchCount = dailyBatchesMap.get(fullDate) || 0;
        const dayExpense = dailyExpensesMap.get(fullDate) || 0;
        result.push({
          date: fullDate,
          totalRevenue: saleData.totalRevenue,
          totalProfit: saleData.totalProfit - dayExpense,
          totalSalesCount: saleData.count,
          totalProductionBatches: batchCount,
        });
      }
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
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({ message: 'تاريخ غير صالح' });
      return;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sales: ISale[] = await Sale.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).populate('lines.finishedProduct lines.rawMaterial');

    const batches: IProductionBatch[] = await ProductionBatch.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const expenses: IExpense[] = await Expense.find({ date });

    let totalRevenue = 0;
    let totalGrossMargin = 0;
    const invoicesBreakdown: any[] = [];

    for (const sale of sales) {
      totalRevenue += sale.total || 0;
      totalGrossMargin += sale.grossMargin || 0;

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
          unitPrice: line.unitPriceAtSale,
          totalPrice: line.quantity * line.unitPriceAtSale,
        });
      }

      invoicesBreakdown.push({
        saleId: String(sale._id),
        receiptNumber: sale.receiptNumber,
        total: sale.total,
        grossMargin: sale.grossMargin,
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

    let totalExpenses = 0;
    for (const e of expenses) {
      totalExpenses += e.amount;
    }

    const netProfit = totalGrossMargin - totalExpenses;

    res.status(200).json({
      date,
      totalRevenue,
      totalProfit: netProfit,
      totalExpenses,
      totalSalesCount: sales.length,
      totalProductionBatches: batches.length,
      totalQuantityProduced,
      invoicesBreakdown,
      expenses,
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

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth - 1, daysInMonth, 23, 59, 59, 999);

    const monthStr = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;
    const datePrefix = `${targetYear}-${monthStr}`;

    // Delete Sales, Production Batches, Expenses, Snapshots for the month
    const salesResult = await Sale.deleteMany({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const batchesResult = await ProductionBatch.deleteMany({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const expensesResult = await Expense.deleteMany({
      year: targetYear,
      month: targetMonth,
    });

    const snapshotResult = await DailySnapshot.deleteMany({
      date: { $regex: `^${datePrefix}` },
    });

    res.status(200).json({
      message: `تم مسح جميع سجلات شهر ${targetMonth}/${targetYear} (المبيعات، الإنتاج، المصاريف) نهائياً لتوفير المساحة`,
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
