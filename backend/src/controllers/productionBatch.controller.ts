import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { runProductionBatch, InsufficientStockError } from '../services/productionBatch.service';
import ProductionBatch from '../models/ProductionBatch';

/** POST /api/production-batches */
export async function createProductionBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { formulaId, quantityToProduce, note } = req.body;
    const batch = await runProductionBatch({
      formulaId,
      quantityToProduce,
      performedBy: req.user!.id,
      note,
    });
    return res.status(201).json(batch);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return res.status(409).json({ message: err.message, shortages: err.shortages });
    }
    const message = err instanceof Error ? err.message : 'Failed to run production batch';
    return res.status(400).json({ message });
  }
}

/** GET /api/production-batches */
export async function listProductionBatches(_req: AuthenticatedRequest, res: Response) {
  const batches = await ProductionBatch.find()
    .sort({ createdAt: -1 })
    .populate('formula', 'name sku')
    .populate('finishedProduct', 'name sku')
    .populate('performedBy', 'fullName');
  return res.json(batches);
}
