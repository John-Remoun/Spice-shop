import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductFormula from '../models/ProductFormula';
import FinishedProduct from '../models/FinishedProduct';
import { computeFormulaCost } from '../services/formulaCost.service';

/** GET /api/formulas */
export async function listFormulas(_req: Request, res: Response) {
  const formulas = await ProductFormula.find()
    .sort({ name: 1 })
    .populate('finishedProduct', 'name sku sellingPrice sellingPrice1 sellingPrice2 sellingPrice3')
    .populate('materials.rawMaterial', 'name sku baseUnit weightedAverageCost')
    .populate('packagingItems.packaging', 'name sku weightedAverageCost');

  const detailedFormulas = await Promise.all(
    formulas.map(async (f) => {
      try {
        const costInfo = await computeFormulaCost(f._id.toString());
        return { ...f.toObject(), costInfo };
      } catch {
        return f.toObject();
      }
    })
  );

  return res.json(detailedFormulas);
}

/** GET /api/formulas/:id */
export async function getFormula(req: Request, res: Response) {
  const formula = await ProductFormula.findById(req.params.id)
    .populate('finishedProduct', 'name sku sellingPrice sellingPrice1 sellingPrice2 sellingPrice3')
    .populate('materials.rawMaterial', 'name sku baseUnit weightedAverageCost')
    .populate('packagingItems.packaging', 'name sku weightedAverageCost');

  if (!formula) return res.status(404).json({ message: 'Formula not found' });
  const costInfo = await computeFormulaCost(formula._id.toString());
  return res.json({ ...formula.toObject(), costInfo });
}

/** GET /api/formulas/:id/cost */
export async function getFormulaCost(req: Request, res: Response) {
  try {
    const costInfo = await computeFormulaCost(req.params.id);
    return res.json(costInfo);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to calculate formula cost';
    return res.status(400).json({ message });
  }
}

/** Helper to resolve or sync a finished product from name or ID */
async function syncFinishedProduct(
  formulaName: string,
  stockUnits: number,
  sellingPrice: number,
  sellingPrice1?: number,
  sellingPrice2?: number,
  sellingPrice3?: number,
  existingProductId?: string
): Promise<string> {
  let product: any = null;
  if (existingProductId && mongoose.Types.ObjectId.isValid(existingProductId)) {
    product = await FinishedProduct.findById(existingProductId);
  }
  if (!product) {
    product = await FinishedProduct.findOne({
      name: { $regex: new RegExp(`^${formulaName.trim()}$`, 'i') },
    });
  }

  const p1 = sellingPrice1 ?? sellingPrice ?? 0;
  const p2 = sellingPrice2 ?? p1;
  const p3 = sellingPrice3 ?? p1;
  const mainPrice = p1;

  if (!product) {
    product = await FinishedProduct.create({
      name: formulaName.trim(),
      sellingPrice: mainPrice,
      sellingPrice1: p1,
      sellingPrice2: p2,
      sellingPrice3: p3,
      stockUnits: stockUnits || 0,
      lowStockThresholdUnits: 10,
    });
  } else {
    product.name = formulaName.trim();
    product.sellingPrice = mainPrice;
    product.sellingPrice1 = p1;
    product.sellingPrice2 = p2;
    product.sellingPrice3 = p3;
    await product.save();
  }

  return product._id.toString();
}

/** POST /api/formulas */
export async function createFormula(req: Request, res: Response) {
  try {
    const {
      name,
      sku,
      finishedProduct,
      finishedProductName,
      yieldPerBatchUnit,
      materials,
      packagingItems,
      targetSellingPrice,
      sellingPrice1,
      sellingPrice2,
      sellingPrice3,
      notes,
    } = req.body;

    const formulaName = name || finishedProductName || 'تركيبة جديدة';
    const prodQty = yieldPerBatchUnit ?? 100;
    const p1 = sellingPrice1 ?? targetSellingPrice ?? 0;
    const p2 = sellingPrice2 ?? p1;
    const p3 = sellingPrice3 ?? p1;

    const productId = await syncFinishedProduct(
      formulaName,
      prodQty,
      p1,
      p1,
      p2,
      p3,
      finishedProduct
    );

    const formula = await ProductFormula.create({
      name: formulaName,
      sku,
      finishedProduct: productId,
      yieldPerBatchUnit: prodQty,
      materials,
      packagingItems: packagingItems ?? [],
      targetSellingPrice: p1,
      sellingPrice1: p1,
      sellingPrice2: p2,
      sellingPrice3: p3,
      notes,
    });

    // Compute live cost and sync back to FinishedProduct
    try {
      const costInfo = await computeFormulaCost(formula._id.toString());
      await FinishedProduct.findByIdAndUpdate(productId, {
        lastKnownUnitCost: costInfo.totalUnitCost,
      });
    } catch (e) {
      console.error('Failed to sync unit cost to finished product:', e);
    }

    const costInfo = await computeFormulaCost(formula._id.toString());
    return res.status(201).json({ ...formula.toObject(), costInfo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create formula';
    return res.status(400).json({ message });
  }
}

/** PUT /api/formulas/:id */
export async function updateFormula(req: Request, res: Response) {
  try {
    const {
      name,
      sku,
      finishedProduct,
      yieldPerBatchUnit,
      materials,
      packagingItems,
      targetSellingPrice,
      sellingPrice1,
      sellingPrice2,
      sellingPrice3,
      notes,
      isActive,
    } = req.body;

    const existingFormula = await ProductFormula.findById(req.params.id);
    if (!existingFormula) return res.status(404).json({ message: 'Formula not found' });

    const formulaName = name || existingFormula.name;
    const prodQty = yieldPerBatchUnit ?? existingFormula.yieldPerBatchUnit;
    const p1 = sellingPrice1 ?? targetSellingPrice ?? existingFormula.sellingPrice1 ?? existingFormula.targetSellingPrice ?? 0;
    const p2 = sellingPrice2 ?? existingFormula.sellingPrice2 ?? p1;
    const p3 = sellingPrice3 ?? existingFormula.sellingPrice3 ?? p1;

    const productId = await syncFinishedProduct(
      formulaName,
      prodQty,
      p1,
      p1,
      p2,
      p3,
      finishedProduct || existingFormula.finishedProduct?.toString()
    );

    const formula = await ProductFormula.findByIdAndUpdate(
      req.params.id,
      {
        name: formulaName,
        sku,
        finishedProduct: productId,
        yieldPerBatchUnit: prodQty,
        materials,
        packagingItems,
        targetSellingPrice: p1,
        sellingPrice1: p1,
        sellingPrice2: p2,
        sellingPrice3: p3,
        notes,
        isActive,
      },
      { new: true, runValidators: true }
    );

    if (!formula) return res.status(404).json({ message: 'Formula not found' });

    // Compute live cost and sync back to FinishedProduct
    try {
      const costInfo = await computeFormulaCost(formula._id.toString());
      await FinishedProduct.findByIdAndUpdate(productId, {
        lastKnownUnitCost: costInfo.totalUnitCost,
      });
    } catch (e) {
      console.error('Failed to sync unit cost to finished product:', e);
    }

    const costInfo = await computeFormulaCost(formula._id.toString());
    return res.json({ ...formula.toObject(), costInfo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update formula';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/formulas/:id */
export async function deleteFormula(req: Request, res: Response) {
  const formula = await ProductFormula.findByIdAndDelete(req.params.id);
  if (!formula) return res.status(404).json({ message: 'Formula not found' });
  return res.status(204).send();
}
