import { Request, Response } from 'express';
import Packaging from '../models/Packaging';
import { logPackagingPurchase } from '../services/purchasing.service';

/** GET /api/packaging */
export async function listPackaging(_req: Request, res: Response) {
  const items = await Packaging.find().sort({ name: 1 });
  return res.json(items);
}

/** GET /api/packaging/:id */
export async function getPackaging(req: Request, res: Response) {
  const item = await Packaging.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Packaging item not found' });
  return res.json(item);
}

/** POST /api/packaging */
export async function createPackaging(req: Request, res: Response) {
  try {
    const {
      name,
      sku,
      category,
      capacityMl,
      lowStockThresholdPcs,
      initialQuantityPcs,
      initialTotalCost,
      supplier,
    } = req.body;

    let item = await Packaging.create({
      name,
      sku,
      category,
      capacityMl,
      stockPcs: 0,
      weightedAverageCost: 0,
      lowStockThresholdPcs: lowStockThresholdPcs ?? 0,
    });

    if (initialQuantityPcs && Number(initialQuantityPcs) > 0 && initialTotalCost !== undefined) {
      item = await logPackagingPurchase({
        packagingId: item._id.toString(),
        quantityPcs: Number(initialQuantityPcs),
        totalCost: Number(initialTotalCost),
        supplier,
        note: 'Initial Stock Entry',
      });
    }

    return res.status(201).json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create packaging item';
    return res.status(400).json({ message });
  }
}

/** PUT /api/packaging/:id */
export async function updatePackaging(req: Request, res: Response) {
  try {
    const { name, sku, category, capacityMl, stockPcs, weightedAverageCost, lowStockThresholdPcs, isActive } = req.body;
    const updateData: Record<string, any> = { name, sku, category, capacityMl, lowStockThresholdPcs, isActive };
    if (stockPcs !== undefined) updateData.stockPcs = stockPcs;
    if (weightedAverageCost !== undefined) updateData.weightedAverageCost = weightedAverageCost;

    const item = await Packaging.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Packaging item not found' });
    return res.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update packaging item';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/packaging/:id */
export async function deletePackaging(req: Request, res: Response) {
  const item = await Packaging.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Packaging item not found' });
  return res.status(204).send();
}

/** POST /api/packaging/:id/purchase */
export async function purchasePackaging(req: Request, res: Response) {
  try {
    const { quantityPcs, totalCost, supplier, note } = req.body;
    const item = await logPackagingPurchase({
      packagingId: req.params.id,
      quantityPcs: Number(quantityPcs),
      totalCost: Number(totalCost),
      supplier,
      note,
    });
    return res.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to log packaging purchase';
    return res.status(400).json({ message });
  }
}
