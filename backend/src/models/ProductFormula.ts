import { Schema, model, Document, Types } from 'mongoose';

export interface IFormulaMaterialLine {
  rawMaterial: Types.ObjectId;
  quantityBase: number; // ml or g, per single finished unit
}

export interface IFormulaPackagingLine {
  packaging: Types.ObjectId;
  quantityPcs: number; // per single finished unit
}

export interface IProductFormula extends Document {
  _id: Types.ObjectId;
  name: string; // e.g. "Lavender Calming Shampoo 250ml"
  sku: string;
  finishedProduct: Types.ObjectId; // ref FinishedProduct this formula produces
  yieldPerBatchUnit: number; // usually 1 — how many finished units one "line" of the recipe yields
  materials: IFormulaMaterialLine[];
  packagingItems: IFormulaPackagingLine[];
  targetSellingPrice: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormulaMaterialLineSchema = new Schema<IFormulaMaterialLine>(
  {
    rawMaterial: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantityBase: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const FormulaPackagingLineSchema = new Schema<IFormulaPackagingLine>(
  {
    packaging: { type: Schema.Types.ObjectId, ref: 'Packaging', required: true },
    quantityPcs: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'quantityPcs must be an integer' },
    },
  },
  { _id: false }
);

const ProductFormulaSchema = new Schema<IProductFormula>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    finishedProduct: { type: Schema.Types.ObjectId, ref: 'FinishedProduct', required: true },
    yieldPerBatchUnit: { type: Number, required: true, default: 0, min: 0 },
    materials: {
      type: [FormulaMaterialLineSchema],
      validate: {
        validator: (arr: unknown[]) => arr.length > 0,
        message: 'A formula needs at least one raw material line',
      },
    },
    packagingItems: { type: [FormulaPackagingLineSchema], default: [] },
    targetSellingPrice: { type: Number, required: true, min: 0 },
    sellingPrice1: { type: Number, default: 0, min: 0 },
    sellingPrice2: { type: Number, default: 0, min: 0 },
    sellingPrice3: { type: Number, default: 0, min: 0 },
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// NOTE: unit cost & margin are intentionally NOT stored here.
// They are derived at read-time in formula.service.ts from the *current*
// weightedAverageCost of every referenced RawMaterial/Packaging, so the
// figure shown is always live, never stale.

ProductFormulaSchema.pre('validate', function (next) {
  if (!this.sku) {
    this.sku = 'FORM-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

export default model<IProductFormula>('ProductFormula', ProductFormulaSchema);
