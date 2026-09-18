import mongoose from 'mongoose';
import FinishedProduct from '../models/FinishedProduct';
import RawMaterial from '../models/RawMaterial';
import ProductionBatch from '../models/ProductionBatch';
import Sale, { ISale } from '../models/Sale';
import Setting from '../models/Setting';
import User from '../models/User';
import { queueLowStockCheck, queueSaleAlert } from './alert.service';
import { UNIT_TO_BASE } from '../types/enums';

export interface SaleLineInput {
  finishedProductId?: string;
  finishedProduct?: string;
  rawMaterialId?: string;
  rawMaterial?: string;
  itemType?: 'finishedProduct' | 'rawMaterial';
  quantity: number;
  unit?: string; // ml, l, g, kg, pcs
  unitPriceOverride?: number;
}

export interface RecordSaleInput {
  lines: SaleLineInput[];
  discount?: number;
  performedBy: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  paidAmount?: number;
}

async function executeSaleOperations(input: RecordSaleInput, session: mongoose.ClientSession | null): Promise<ISale> {
  const setting = await Setting.findOne({ singleton: 'GLOBAL' }).session(session);
  const currency = setting?.defaultCurrency ?? 'EGP';

  let subtotal = 0;
  let totalCost = 0;
  const lines = [];
  const affectedProductIds: string[] = [];
  const affectedMaterialIds: string[] = [];

  let userId = input.performedBy;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const defaultUser = await User.findOne().session(session);
    if (defaultUser) userId = defaultUser._id.toString();
  }

  for (const line of input.lines) {
    if (!line.quantity || line.quantity <= 0) {
      throw new Error('الكمية يجب أن تكون أكبر من صفر');
    }

    const isRawMaterial = line.itemType === 'rawMaterial' || Boolean(line.rawMaterialId || line.rawMaterial);

    if (isRawMaterial) {
      const rmId = line.rawMaterialId || line.rawMaterial;
      if (!rmId) throw new Error('Raw material ID is missing');

      const mat = await RawMaterial.findById(rmId).session(session);
      if (!mat) throw new Error(`المادة الخام غير موجودة`);

      const unit = line.unit || mat.baseUnit || 'ml';
      const factor = UNIT_TO_BASE[unit] ?? 1;
      const qtyBaseToDeduct = line.quantity * factor;

      if (mat.stockBase < qtyBaseToDeduct) {
        throw new Error(`الكمية المتوفرة من ${mat.name} غير كافية. المتوفر: ${mat.stockBase} ${mat.baseUnit}`);
      }

      const updatedMat = await RawMaterial.findOneAndUpdate(
        { _id: rmId, stockBase: { $gte: qtyBaseToDeduct } },
        { $inc: { stockBase: -qtyBaseToDeduct } },
        { new: true, session }
      );

      if (!updatedMat) {
        throw new Error(`الكمية المتوفرة من ${mat.name} غير كافية`);
      }

      const wac = updatedMat.weightedAverageCost ?? 0;
      let defaultPrice = 0;
      if (updatedMat.sellingPrice1 && updatedMat.sellingPrice1 > 0) {
        defaultPrice = (unit === 'l' || unit === 'kg') ? updatedMat.sellingPrice1 : updatedMat.sellingPrice1 / 1000;
      } else {
        defaultPrice = wac * factor > 0 ? wac * factor * 1.3 : 10;
      }
      const unitPrice = line.unitPriceOverride !== undefined ? line.unitPriceOverride : defaultPrice;
      const unitCost = wac * factor;
      const lineCost = unitCost * line.quantity;
      const lineSubtotal = unitPrice * line.quantity;

      subtotal += lineSubtotal;
      totalCost += lineCost;
      affectedMaterialIds.push(updatedMat._id.toString());

      lines.push({
        rawMaterial: updatedMat._id,
        quantity: line.quantity,
        unit,
        unitPriceAtSale: Number(unitPrice) || 0,
        unitCostAtSale: Number(unitCost) || 0,
      });
    } else {
      const productId = line.finishedProductId || line.finishedProduct;
      if (!productId) throw new Error('Product ID is missing');

      const product = await FinishedProduct.findOneAndUpdate(
        { _id: productId, stockUnits: { $gte: line.quantity } },
        { $inc: { stockUnits: -line.quantity } },
        { new: true, session }
      );

      if (!product) {
        throw new Error(`الكمية المتوفرة من هذا المنتج غير كافية في المخزون`);
      }

      // Consume produced stock tracking from production batches (FIFO)
      let qtyToDeductFromBatches = line.quantity;
      const batches = await ProductionBatch.find({
        finishedProduct: productId,
        $or: [
          { remainingQuantity: { $gt: 0 } },
          { remainingQuantity: { $exists: false } },
        ],
      })
        .sort({ createdAt: 1 })
        .session(session);

      for (const batch of batches) {
        if (qtyToDeductFromBatches <= 0) break;
        const availableInBatch = batch.remainingQuantity ?? batch.quantityProduced;
        if (availableInBatch <= 0) continue;

        const takeQty = Math.min(qtyToDeductFromBatches, availableInBatch);
        batch.remainingQuantity = availableInBatch - takeQty;
        await batch.save({ session });
        qtyToDeductFromBatches -= takeQty;
      }

      const unitPrice = line.unitPriceOverride ?? product.sellingPrice ?? 0;
      const unitCost = product.lastKnownUnitCost ?? 0;
      const lineSubtotal = unitPrice * line.quantity;
      const lineCost = unitCost * line.quantity;

      subtotal += lineSubtotal;
      totalCost += lineCost;
      affectedProductIds.push(product._id.toString());

      lines.push({
        finishedProduct: product._id,
        quantity: line.quantity,
        unitPriceAtSale: Number(unitPrice) || 0,
        unitCostAtSale: Number(unitCost) || 0,
      });
    }
  }

  const discount = Math.max(0, input.discount ?? 0);
  const total = Math.max(0, subtotal - discount);
  const grossMargin = total - totalCost;
  const grossMarginPct = total > 0 ? (grossMargin / total) * 100 : 0;

  // Calculate payment status & amounts
  let paymentStatus = input.paymentStatus ?? 'PAID';
  let paidAmount = total;

  if (paymentStatus === 'UNPAID') {
    paidAmount = 0;
  } else if (paymentStatus === 'PARTIAL') {
    paidAmount = Math.min(total, Math.max(0, input.paidAmount ?? 0));
    if (paidAmount >= total) {
      paymentStatus = 'PAID';
      paidAmount = total;
    } else if (paidAmount <= 0) {
      paymentStatus = 'UNPAID';
      paidAmount = 0;
    }
  } else {
    paymentStatus = 'PAID';
    paidAmount = total;
  }

  const remainingAmount = Math.max(0, total - paidAmount);
  const initialPayments = paidAmount > 0 ? [{ amount: paidAmount, paidAt: new Date(), note: 'الدفعة الأولى عند إنشاء الفاتورة' }] : [];
  const receiptNumber = String(Math.floor(10000 + Math.random() * 90000));

  const createDocs = [
    {
      receiptNumber,
      lines,
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      total: Number(total) || 0,
      totalCost: Number(totalCost) || 0,
      grossMargin: Number(grossMargin) || 0,
      grossMarginPct: Number(grossMarginPct) || 0,
      paymentStatus,
      paidAmount: Number(paidAmount) || 0,
      remainingAmount: Number(remainingAmount) || 0,
      payments: initialPayments,
      currency,
      performedBy: userId,
      customerName: (input.customerName && input.customerName.trim()) ? input.customerName.trim() : 'عميل نقدي',
      customerPhone: (input.customerPhone && input.customerPhone.trim()) ? input.customerPhone.trim() : '',
      note: input.note,
    },
  ];

  const created = session
    ? (await Sale.create(createDocs, { session }))[0]
    : await Sale.create(createDocs[0]);

  return created;
}

export async function recordSale(input: RecordSaleInput): Promise<ISale> {
  let sale: ISale;

  try {
    const session = await mongoose.startSession();
    try {
      sale = await session.withTransaction(async () => {
        return await executeSaleOperations(input, session);
      });
    } catch (txErr: any) {
      if (txErr?.message?.includes('Transaction numbers are only allowed') || txErr?.message?.includes('replica set')) {
        sale = await executeSaleOperations(input, null);
      } else {
        throw txErr;
      }
    } finally {
      await session.endSession();
    }
  } catch (err: any) {
    if (err?.message?.includes('Transaction numbers are only allowed') || err?.message?.includes('replica set')) {
      sale = await executeSaleOperations(input, null);
    } else {
      throw err;
    }
  }

  // Populate references so returned object has product/rawMaterial names for receipt printing
  await sale.populate(['lines.finishedProduct', 'lines.rawMaterial', 'performedBy']);

  // Post-commit side effects
  const performer = await User.findById(input.performedBy);
  queueSaleAlert({
    total: sale.total,
    currency: sale.currency,
    performedByName: performer?.fullName ?? 'A partner',
  });

  const finishedProductIds = input.lines
    .map((l) => l.finishedProductId || l.finishedProduct)
    .filter((id): id is string => Boolean(id));

  if (finishedProductIds.length > 0) {
    queueLowStockCheck({ finishedProductIds });
  }

  return sale;
}

export async function recordAdditionalPayment(saleId: string, amount: number, note?: string): Promise<ISale> {
  if (!amount || amount <= 0) {
    throw new Error('المبلغ المدفوع يجب أن يكون أكبر من صفر');
  }

  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new Error('الفاتورة غير موجودة');
  }

  if (sale.remainingAmount <= 0 || sale.paymentStatus === 'PAID') {
    throw new Error('هذه الفاتورة مدفوعة بالكامل بالفعل');
  }

  const payAmt = Math.min(amount, sale.remainingAmount);
  sale.paidAmount = Number((sale.paidAmount + payAmt).toFixed(2));
  sale.remainingAmount = Number(Math.max(0, sale.total - sale.paidAmount).toFixed(2));
  
  if (sale.remainingAmount <= 0) {
    sale.paymentStatus = 'PAID';
    sale.remainingAmount = 0;
  } else {
    sale.paymentStatus = 'PARTIAL';
  }

  sale.payments.push({
    amount: payAmt,
    paidAt: new Date(),
    note: note || 'تحصيل دُفعة إضافية',
  });

  await sale.save();
  await sale.populate(['lines.finishedProduct', 'lines.rawMaterial', 'performedBy']);
  return sale;
}

export async function deleteSale(saleId: string): Promise<void> {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new Error('الفاتورة غير موجودة');
  }

  // Restore inventory stocks if needed
  for (const line of sale.lines) {
    if (line.finishedProduct) {
      await FinishedProduct.findByIdAndUpdate(line.finishedProduct, {
        $inc: { stockUnits: line.quantity },
      });
    } else if (line.rawMaterial) {
      const factor = UNIT_TO_BASE[line.unit || ''] ?? 1;
      const qtyBaseToRestore = line.quantity * factor;
      await RawMaterial.findByIdAndUpdate(line.rawMaterial, {
        $inc: { stockBase: qtyBaseToRestore },
      });
    }
  }

  await Sale.findByIdAndDelete(saleId);
}

