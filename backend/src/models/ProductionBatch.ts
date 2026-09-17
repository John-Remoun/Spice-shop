import { Schema, model, Document, Types } from 'mongoose';
import { BatchStatus } from '../types/enums';

export interface IBatchMaterialConsumption {
  rawMaterial: Types.ObjectId;
  quantityBaseConsumed: number;
  unitCostAtConsumption: number;
}

export interface IBatchPackagingConsumption {
  packaging: Types.ObjectId;
  quantityPcsConsumed: number;
  unitCostAtConsumption: number;
}

export interface IProductionBatch extends Document {
  _id: Types.ObjectId;
  formula: Types.ObjectId;
  finishedProduct: Types.ObjectId;
  quantityProduced: number; // integer units manufactured
  remainingQuantity: number; // remaining unsold/unreverted units in inventory
  materialsConsumed: IBatchMaterialConsumption[];
  packagingConsumed: IBatchPackagingConsumption[];
  totalCost: number; // sum of all consumption at time of batch
  unitCostAtProduction: number; // totalCost / quantityProduced
  status: BatchStatus;
  performedBy: Types.ObjectId; // ref User
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BatchMaterialConsumptionSchema = new Schema<IBatchMaterialConsumption>(
  {
    rawMaterial: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantityBaseConsumed: { type: Number, required: true, min: 0 },
    unitCostAtConsumption: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BatchPackagingConsumptionSchema = new Schema<IBatchPackagingConsumption>(
  {
    packaging: { type: Schema.Types.ObjectId, ref: 'Packaging', required: true },
    quantityPcsConsumed: { type: Number, required: true, min: 0 },
    unitCostAtConsumption: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ProductionBatchSchema = new Schema<IProductionBatch>(
  {
    formula: { type: Schema.Types.ObjectId, ref: 'ProductFormula', required: true },
    finishedProduct: { type: Schema.Types.ObjectId, ref: 'FinishedProduct', required: true },
    quantityProduced: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'quantityProduced must be an integer' },
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'remainingQuantity must be an integer' },
      default: function (this: any) {
        return this.quantityProduced;
      },
    },
    materialsConsumed: { type: [BatchMaterialConsumptionSchema], required: true },
    packagingConsumed: { type: [BatchPackagingConsumptionSchema], default: [] },
    totalCost: { type: Number, required: true, min: 0 },
    unitCostAtProduction: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(BatchStatus), default: BatchStatus.COMPLETED },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: String,
  },
  { timestamps: true }
);

export default model<IProductionBatch>('ProductionBatch', ProductionBatchSchema);
