import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { recordSale, recordAdditionalPayment, deleteSale as removeSaleService } from '../services/sale.service';
import Sale from '../models/Sale';

/** POST /api/sales */
export async function createSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { lines, discount, customerName, customerPhone, note, paymentStatus, paidAmount } = req.body;
    const userId = req.user?.id || '';
    const sale = await recordSale({
      lines,
      discount,
      customerName,
      customerPhone,
      note,
      paymentStatus,
      paidAmount,
      performedBy: userId,
    });
    return res.status(201).json(sale);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل إتمام عملية البيع';
    return res.status(400).json({ message });
  }
}

/** PATCH /api/sales/:id/pay */
export async function addSalePayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;
    const updatedSale = await recordAdditionalPayment(id, Number(amount), note);
    return res.status(200).json(updatedSale);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل تسديد الدفعة';
    return res.status(400).json({ message });
  }
}

/** GET /api/sales/customer-ledger/:phone */
export async function getCustomerLedger(req: AuthenticatedRequest, res: Response) {
  try {
    const rawPhone = req.params.phone || '';
    const cleanPhone = rawPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      return res.status(400).json({ message: 'رقم التليفون غير صالِح' });
    }

    // Match sales where customerPhone contains cleanPhone or last 8 digits
    const searchRegex = new RegExp(cleanPhone.slice(-8), 'i');
    const sales = await Sale.find({ customerPhone: { $regex: searchRegex } })
      .sort({ createdAt: -1 })
      .populate('lines.finishedProduct', 'name sku')
      .populate('lines.rawMaterial', 'name baseUnit')
      .populate('performedBy', 'fullName');

    const customerName = sales.find((s) => s.customerName && s.customerName !== 'عميل نقدي')?.customerName || sales[0]?.customerName || 'عميل';
    const totalInvoices = sales.length;
    const totalAmount = sales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalPaid = sales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
    const totalRemaining = sales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

    return res.status(200).json({
      customerPhone: rawPhone,
      customerName,
      totalInvoices,
      totalAmount,
      totalPaid,
      totalRemaining,
      invoices: sales,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل جلب كشف حساب العميل';
    return res.status(500).json({ message });
  }
}

/** GET /api/sales */
export async function listSales(_req: AuthenticatedRequest, res: Response) {
  const sales = await Sale.find()
    .sort({ createdAt: -1 })
    .populate('lines.finishedProduct', 'name sku')
    .populate('lines.rawMaterial', 'name baseUnit')
    .populate('performedBy', 'fullName');
  return res.json(sales);
}

/** DELETE /api/sales/:id */
export async function deleteSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await removeSaleService(id);
    return res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل حذف الفاتورة';
    return res.status(400).json({ message });
  }
}


