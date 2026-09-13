import { Schema, model, Document, Types } from 'mongoose';

export interface IPackagingPurchaseLogEntry {
  date: Date;
  quantityPcs: number;
  unitCostAtPurchase: number;
  totalCost: number;
  supplier?: string;
  note?: string;
}

export type PackagingCategory =
  | 'bottle'
  | 'jar'
  | 'cap'
  | 'sprayer'
  | 'bag'
  | 'label'
  | 'other';

export interface IPackaging extends Document {
  _id: Types.ObjectId;
  name: string; // e.g. "Amber Glass Bottle 250ml"
  sku: string;
  category: PackagingCategory;
  capacityMl?: number; // relevant for bottles/jars/sprayers, informational only
  stockPcs: number;
  weightedAverageCost: number; // cost per piece
  lowStockThresholdPcs: number;
  purchaseLog: IPackagingPurchaseLogEntry[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PackagingPurchaseLogEntrySchema = new Schema<IPackagingPurchaseLogEntry>(
  {
    date: { type: Date, default: Date.now },
    quantityPcs: { type: Number, required: true, min: 0 },
    unitCostAtPurchase: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    supplier: String,
    note: String,
  },
  { _id: false }
);

const PackagingSchema = new Schema<IPackaging>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    category: {
      type: String,
      enum: ['bottle', 'jar', 'cap', 'sprayer', 'bag', 'label', 'other'],
      required: true,
    },
    capacityMl: { type: Number, min: 0 },
    stockPcs: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'stockPcs must be an integer' },
    },
    weightedAverageCost: { type: Number, required: true, default: 0, min: 0 },
    lowStockThresholdPcs: { type: Number, required: true, default: 0, min: 0 },
    purchaseLog: { type: [PackagingPurchaseLogEntrySchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PackagingSchema.pre('validate', function (next) {
  if (!this.sku) {
    this.sku = 'PKG-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

export default model<IPackaging>('Packaging', PackagingSchema);
