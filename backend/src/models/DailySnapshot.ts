import { Schema, model, Document } from 'mongoose';

export interface IDailySnapshot extends Document {
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  totalProfit: number;
  totalSalesCount: number;
  totalProductionBatches: number;
  totalQuantityProduced: number;
  lowStockCount: number;
  salesBreakdown: Array<{
    saleId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    soldAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DailySnapshotSchema = new Schema<IDailySnapshot>(
  {
    date: { type: String, required: true, unique: true, index: true },
    totalRevenue: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalSalesCount: { type: Number, default: 0 },
    totalProductionBatches: { type: Number, default: 0 },
    totalQuantityProduced: { type: Number, default: 0 },
    lowStockCount: { type: Number, default: 0 },
    salesBreakdown: [
      {
        saleId: { type: String },
        productName: { type: String },
        quantity: { type: Number },
        unitPrice: { type: Number },
        totalPrice: { type: Number },
        soldAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

export const DailySnapshot = model<IDailySnapshot>('DailySnapshot', DailySnapshotSchema);
