import { Schema, model, Document, Types } from 'mongoose';

export interface ISaleLine {
  finishedProduct?: Types.ObjectId;
  rawMaterial?: Types.ObjectId;
  quantity: number;
  unit?: string;
  unitPriceAtSale: number;
  unitCostAtSale: number;
}

export interface ISalePayment {
  amount: number;
  paidAt: Date;
  note?: string;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  receiptNumber: string;
  lines: ISaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paidAmount: number;
  remainingAmount: number;
  payments: ISalePayment[];
  currency: string;
  performedBy: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleLineSchema = new Schema<ISaleLine>(
  {
    finishedProduct: { type: Schema.Types.ObjectId, ref: 'FinishedProduct', required: false },
    rawMaterial: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: false },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: false },
    unitPriceAtSale: { type: Number, required: true, min: 0 },
    unitCostAtSale: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SalePaymentSchema = new Schema<ISalePayment>(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paidAt: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    receiptNumber: { type: String, required: true },
    lines: {
      type: [SaleLineSchema],
      validate: { validator: (a: unknown[]) => a.length > 0, message: 'Sale needs at least one line' },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    grossMargin: { type: Number, required: true },
    grossMarginPct: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'UNPAID', 'PARTIAL'],
      default: 'PAID',
    },
    paidAmount: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0, default: 0 },
    payments: { type: [SalePaymentSchema], default: [] },
    currency: { type: String, required: true, default: 'EGP' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: String,
    customerPhone: String,
    note: String,
  },
  { timestamps: true }
);

export default model<ISale>('Sale', SaleSchema);
