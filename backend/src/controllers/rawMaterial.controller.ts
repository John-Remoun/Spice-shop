import { Request, Response } from 'express';
import RawMaterial from '../models/RawMaterial';
import { logRawMaterialPurchase } from '../services/purchasing.service';

/** GET /api/raw-materials */
export async function listRawMaterials(_req: Request, res: Response) {
  const materials = await RawMaterial.find().sort({ name: 1 });
  return res.json(materials);
}

/** GET /api/raw-materials/:id */
export async function getRawMaterial(req: Request, res: Response) {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ message: 'Raw material not found' });
  return res.json(material);
}

/** POST /api/raw-materials */
export async function createRawMaterial(req: Request, res: Response) {
  try {
    const {
      name,
      sku,
      form,
      lowStockThresholdBase,
      initialQuantity,
      unit,
      initialTotalCost,
      supplier,
    } = req.body;

    let material = await RawMaterial.create({
      name,
      sku,
      form,
      stockBase: 0,
      weightedAverageCost: 0,
      lowStockThresholdBase: lowStockThresholdBase ?? 0,
    });

    if (initialQuantity && Number(initialQuantity) > 0 && initialTotalCost !== undefined) {
      const purchaseUnit = unit || (form === 'liquid' ? 'ml' : 'g');
      material = await logRawMaterialPurchase({
        rawMaterialId: material._id.toString(),
        quantity: Number(initialQuantity),
        unit: purchaseUnit,
        totalCost: Number(initialTotalCost),
        supplier,
        note: 'Initial Stock Entry',
      });
    }

    return res.status(201).json(material);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create raw material';
    return res.status(400).json({ message });
  }
}

/** PUT /api/raw-materials/:id */
export async function updateRawMaterial(req: Request, res: Response) {
  try {
    const { name, sku, form, stockBase, weightedAverageCost, lowStockThresholdBase, isActive } = req.body;
    const updateData: Record<string, any> = { name, sku, form, lowStockThresholdBase, isActive };
    if (stockBase !== undefined) updateData.stockBase = stockBase;
    if (weightedAverageCost !== undefined) updateData.weightedAverageCost = weightedAverageCost;

    const material = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Raw material not found' });
    return res.json(material);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update raw material';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/raw-materials/:id */
export async function deleteRawMaterial(req: Request, res: Response) {
  const material = await RawMaterial.findByIdAndDelete(req.params.id);
  if (!material) return res.status(404).json({ message: 'Raw material not found' });
  return res.status(204).send();
}

/** POST /api/raw-materials/:id/purchase */
export async function purchaseRawMaterial(req: Request, res: Response) {
  try {
    const { quantity, unit, totalCost, supplier, note } = req.body;
    const material = await logRawMaterialPurchase({
      rawMaterialId: req.params.id,
      quantity: Number(quantity),
      unit,
      totalCost: Number(totalCost),
      supplier,
      note,
    });
    return res.json(material);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to log raw material purchase';
    return res.status(400).json({ message });
  }
}
