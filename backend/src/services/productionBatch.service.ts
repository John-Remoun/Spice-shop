import mongoose, { Types } from 'mongoose';
import RawMaterial from '../models/RawMaterial';
import Packaging from '../models/Packaging';
import ProductFormula from '../models/ProductFormula';
import FinishedProduct from '../models/FinishedProduct';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import { queueLowStockCheck } from './alert.service';
import { BatchStatus } from '../types/enums';

export class InsufficientStockError extends Error {
  constructor(public shortages: { name: string; needed: number; available: number; unit: string }[]) {
    super('Insufficient stock to run this production batch');
    this.name = 'InsufficientStockError';
  }
}

interface RunBatchInput {
  formulaId: string;
  quantityToProduce: number; // integer finished units requested
  performedBy: string; // user id
  note?: string;
}

/**
 * Atomically runs a production batch:
 *   1. Load the formula and multiply every line by quantityToProduce.
 *   2. Validate every raw material and packaging line has enough stock —
 *      if ANY line is short, abort before touching the database.
 *   3. Inside a single ClientSession transaction:
 *        - Decrement each RawMaterial.stockBase
 *        - Decrement each Packaging.stockPcs
 *        - Increment FinishedProduct.stockUnits
 *        - Insert the ProductionBatch audit record
 *      All writes commit together or none do.
 *   4. After commit, queue (non-blocking) low-stock alert checks.
 */
export async function runProductionBatch(input: RunBatchInput): Promise<IProductionBatch> {
  const { formulaId, quantityToProduce, performedBy, note } = input;

  if (!Number.isInteger(quantityToProduce) || quantityToProduce <= 0) {
    throw new Error('quantityToProduce must be a positive integer');
  }

  const formula = await ProductFormula.findById(formulaId)
    .populate('materials.rawMaterial')
    .populate('packagingItems.packaging');

  if (!formula || !formula.isActive) {
    throw new Error('Formula not found or inactive');
  }

  // --- 1. Compute required quantities & pre-flight stock validation --------
  const shortages: { name: string; needed: number; available: number; unit: string }[] = [];

  const materialRequirements = formula.materials.map((line) => {
    const rm = line.rawMaterial as unknown as {
      _id: Types.ObjectId;
      name: string;
      stockBase: number;
      weightedAverageCost: number;
      baseUnit: string;
    };
    const needed = line.quantityBase * quantityToProduce;
    if (rm.stockBase < needed) {
      shortages.push({ name: rm.name, needed, available: rm.stockBase, unit: rm.baseUnit });
    }
    return { rawMaterialId: rm._id, needed, unitCost: rm.weightedAverageCost };
  });

  const packagingRequirements = formula.packagingItems.map((line) => {
    const pkg = line.packaging as unknown as {
      _id: Types.ObjectId;
      name: string;
      stockPcs: number;
      weightedAverageCost: number;
    };
    const needed = line.quantityPcs * quantityToProduce;
    if (pkg.stockPcs < needed) {
      shortages.push({ name: pkg.name, needed, available: pkg.stockPcs, unit: 'pcs' });
    }
    return { packagingId: pkg._id, needed, unitCost: pkg.weightedAverageCost };
  });

  if (shortages.length > 0) {
    // Blocking alert — abort before opening a transaction at all.
    throw new InsufficientStockError(shortages);
  }

  // --- 2. Atomic transaction (with fallback for standalone MongoDB) -------
  let batch: IProductionBatch;

  const executeBatchOperations = async (sessionRef: mongoose.ClientSession | null) => {
    let totalCost = 0;

    const materialsConsumed = [];
    for (const req of materialRequirements) {
      const updated = await RawMaterial.findOneAndUpdate(
        { _id: req.rawMaterialId, stockBase: { $gte: req.needed } },
        { $inc: { stockBase: -req.needed } },
        { new: true, session: sessionRef }
      );
      if (!updated) {
        throw new InsufficientStockError([
          { name: req.rawMaterialId.toString(), needed: req.needed, available: 0, unit: '' },
        ]);
      }
      totalCost += req.needed * req.unitCost;
      materialsConsumed.push({
        rawMaterial: req.rawMaterialId,
        quantityBaseConsumed: req.needed,
        unitCostAtConsumption: req.unitCost,
      });
    }

    const packagingConsumed = [];
    for (const req of packagingRequirements) {
      const updated = await Packaging.findOneAndUpdate(
        { _id: req.packagingId, stockPcs: { $gte: req.needed } },
        { $inc: { stockPcs: -req.needed } },
        { new: true, session: sessionRef }
      );
      if (!updated) {
        throw new InsufficientStockError([
          { name: req.packagingId.toString(), needed: req.needed, available: 0, unit: 'pcs' },
        ]);
      }
      totalCost += req.needed * req.unitCost;
      packagingConsumed.push({
        packaging: req.packagingId,
        quantityPcsConsumed: req.needed,
        unitCostAtConsumption: req.unitCost,
      });
    }

    const unitCostAtProduction = totalCost / quantityToProduce;

    await FinishedProduct.findByIdAndUpdate(
      formula.finishedProduct,
      {
        $inc: { stockUnits: quantityToProduce },
        $set: { lastKnownUnitCost: unitCostAtProduction },
      },
      { session: sessionRef }
    );

    const createdDocs = [
      {
        formula: formula._id,
        finishedProduct: formula.finishedProduct,
        quantityProduced: quantityToProduce,
        materialsConsumed,
        packagingConsumed,
        totalCost,
        unitCostAtProduction,
        performedBy,
        note,
      },
    ];

    const createdBatch = sessionRef
      ? (await ProductionBatch.create(createdDocs, { session: sessionRef }))[0]
      : await ProductionBatch.create(createdDocs[0]);

    return createdBatch;
  };

  try {
    const session = await mongoose.startSession();
    try {
      batch = await session.withTransaction(async () => {
        return await executeBatchOperations(session);
      });
    } catch (txErr: any) {
      if (txErr?.message?.includes('Transaction numbers are only allowed') || txErr?.message?.includes('replica set')) {
        batch = await executeBatchOperations(null);
      } else {
        throw txErr;
      }
    } finally {
      await session.endSession();
    }
  } catch (err: any) {
    if (err?.message?.includes('Transaction numbers are only allowed') || err?.message?.includes('replica set')) {
      batch = await executeBatchOperations(null);
    } else {
      throw err;
    }
  }

  // --- 3. Post-commit side effects (never block/rollback the transaction) --
  const affectedMaterialIds = materialRequirements.map((r) => r.rawMaterialId.toString());
  const affectedPackagingIds = packagingRequirements.map((r) => r.packagingId.toString());
  queueLowStockCheck({ rawMaterialIds: affectedMaterialIds, packagingIds: affectedPackagingIds });

  return batch;
}

/**
 * Reverts up to `quantityToRevert` units of produced stock for a finished product,
 * refunding raw materials and packaging materials for any produced batches.
 * Returns the total quantity actually reverted from production batches.
 */
export async function revertProducedStock(
  finishedProductId: string,
  quantityToRevert: number,
  sessionRef?: mongoose.ClientSession | null
): Promise<number> {
  if (quantityToRevert <= 0) return 0;

  // Find batches for this product that have remaining produced units
  // LIFO: revert newest batches first
  const batches = await ProductionBatch.find({
    finishedProduct: finishedProductId,
    $or: [
      { remainingQuantity: { $gt: 0 } },
      { remainingQuantity: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .session(sessionRef || null);

  let needed = quantityToRevert;
  let totalReverted = 0;
  const affectedMaterialIds: string[] = [];
  const affectedPackagingIds: string[] = [];

  for (const batch of batches) {
    if (needed <= 0) break;

    const availableInBatch = batch.remainingQuantity ?? batch.quantityProduced;
    if (availableInBatch <= 0) continue;

    const takeQty = Math.min(needed, availableInBatch);
    const ratio = takeQty / batch.quantityProduced;

    // Refund raw materials
    for (const mat of batch.materialsConsumed) {
      const refundAmount = mat.quantityBaseConsumed * ratio;
      if (refundAmount > 0) {
        await RawMaterial.findByIdAndUpdate(
          mat.rawMaterial,
          { $inc: { stockBase: refundAmount } },
          { session: sessionRef || null }
        );
        affectedMaterialIds.push(mat.rawMaterial.toString());
      }
    }

    // Refund packaging
    for (const pkg of batch.packagingConsumed) {
      const refundAmount = pkg.quantityPcsConsumed * ratio;
      if (refundAmount > 0) {
        await Packaging.findByIdAndUpdate(
          pkg.packaging,
          { $inc: { stockPcs: refundAmount } },
          { session: sessionRef || null }
        );
        affectedPackagingIds.push(pkg.packaging.toString());
      }
    }

    const newRemaining = availableInBatch - takeQty;
    batch.remainingQuantity = newRemaining;
    if (newRemaining === 0) {
      batch.status = BatchStatus.REVERSED;
    }
    await batch.save({ session: sessionRef || null });

    needed -= takeQty;
    totalReverted += takeQty;
  }

  if (affectedMaterialIds.length > 0 || affectedPackagingIds.length > 0) {
    queueLowStockCheck({
      rawMaterialIds: affectedMaterialIds,
      packagingIds: affectedPackagingIds,
    });
  }

  return totalReverted;
}

