import { Schema, model, Document, Types } from 'mongoose';

export interface IFinishedProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  category?: string;
  stockUnits: number; // integer, pieces ready for sale
  lastKnownUnitCost: number; // cached from most recent production batch, informational
  sellingPrice: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  lowStockThresholdUnits: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FinishedProductSchema = new Schema<IFinishedProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    category: String,
    stockUnits: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'stockUnits must be an integer' },
    },
    lastKnownUnitCost: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    sellingPrice1: { type: Number, default: 0, min: 0 },
    sellingPrice2: { type: Number, default: 0, min: 0 },
    sellingPrice3: { type: Number, default: 0, min: 0 },
    lowStockThresholdUnits: { type: Number, required: true, default: 0, min: 0 },
    imageUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FinishedProductSchema.pre('validate', function (next) {
  if (!this.sku) {
    this.sku = 'FP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

export default model<IFinishedProduct>('FinishedProduct', FinishedProductSchema);
