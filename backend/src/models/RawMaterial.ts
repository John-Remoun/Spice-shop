import { Schema, model, Document, Types } from 'mongoose';
import { RawMaterialForm } from '../types/enums';

export interface IPurchaseLogEntry {
  date: Date;
  quantityBase: number; // normalized to ml or g
  unitCostAtPurchase: number; // cost per base unit (ml or g)
  totalCost: number;
  supplier?: string;
  note?: string;
}

export interface IRawMaterial extends Document {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  form: RawMaterialForm; // liquid -> ml, solid -> g
  baseUnit: 'ml' | 'g'; // derived from `form`, stored for query convenience
  stockBase: number; // current stock, always in base unit
  weightedAverageCost: number; // cost per base unit
  sellingPrice1?: number; // selling price per major unit (L for liquid, kg for solid)
  sellingPrice2?: number;
  sellingPrice3?: number;
  lowStockThresholdBase: number;
  purchaseLog: IPurchaseLogEntry[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseLogEntrySchema = new Schema<IPurchaseLogEntry>(
  {
    date: { type: Date, default: Date.now },
    quantityBase: { type: Number, required: true, min: 0 },
    unitCostAtPurchase: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    supplier: String,
    note: String,
  },
  { _id: false }
);

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    form: { type: String, enum: Object.values(RawMaterialForm), required: true },
    baseUnit: { type: String, enum: ['ml', 'g'], required: true },
    stockBase: { type: Number, required: true, default: 0, min: 0 },
    weightedAverageCost: { type: Number, required: true, default: 0, min: 0 },
    sellingPrice1: { type: Number, default: 0, min: 0 },
    sellingPrice2: { type: Number, default: 0, min: 0 },
    sellingPrice3: { type: Number, default: 0, min: 0 },
    lowStockThresholdBase: { type: Number, required: true, default: 0, min: 0 },
    purchaseLog: { type: [PurchaseLogEntrySchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RawMaterialSchema.pre('validate', function (next) {
  // Keep baseUnit in lockstep with form so downstream conversion logic never drifts.
  this.baseUnit = this.form === RawMaterialForm.LIQUID ? 'ml' : 'g';
  if (!this.sku) {
    this.sku = 'RM-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

export default model<IRawMaterial>('RawMaterial', RawMaterialSchema);
