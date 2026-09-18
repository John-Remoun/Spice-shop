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
      sellingPrice1,
      sellingPrice2,
      sellingPrice3,
    } = req.body;

    const p1 = (sellingPrice1 !== undefined && Number(sellingPrice1) > 0) ? Number(sellingPrice1) : 20;
    const p2 = (sellingPrice2 !== undefined && Number(sellingPrice2) > 0) ? Number(sellingPrice2) : (p1 > 0 ? p1 : 25);
    const p3 = (sellingPrice3 !== undefined && Number(sellingPrice3) > 0) ? Number(sellingPrice3) : (p2 > 0 ? p2 : 30);

    let material = await RawMaterial.create({
      name,
      sku,
      form,
      stockBase: 0,
      weightedAverageCost: 0,
      sellingPrice1: p1,
      sellingPrice2: p2,
      sellingPrice3: p3,
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
    const {
      name,
      sku,
      form,
      stockBase,
      weightedAverageCost,
      lowStockThresholdBase,
      isActive,
      sellingPrice1,
      sellingPrice2,
      sellingPrice3,
    } = req.body;
    const updateData: Record<string, any> = { name, sku, form, lowStockThresholdBase, isActive };
    if (stockBase !== undefined) updateData.stockBase = stockBase;
    if (weightedAverageCost !== undefined) updateData.weightedAverageCost = weightedAverageCost;
    if (sellingPrice1 !== undefined) updateData.sellingPrice1 = Number(sellingPrice1) > 0 ? Number(sellingPrice1) : 20;
    if (sellingPrice2 !== undefined) updateData.sellingPrice2 = Number(sellingPrice2) > 0 ? Number(sellingPrice2) : (updateData.sellingPrice1 || 25);
    if (sellingPrice3 !== undefined) updateData.sellingPrice3 = Number(sellingPrice3) > 0 ? Number(sellingPrice3) : (updateData.sellingPrice2 || updateData.sellingPrice1 || 30);

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
