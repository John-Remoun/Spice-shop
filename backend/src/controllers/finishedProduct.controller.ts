import { Request, Response } from 'express';
import FinishedProduct from '../models/FinishedProduct';
import ProductFormula from '../models/ProductFormula';

/** GET /api/finished-products */
export async function listFinishedProducts(_req: Request, res: Response) {
  const products = await FinishedProduct.find().sort({ name: 1 });
  return res.json(products);
}

/** GET /api/finished-products/:id */
export async function getFinishedProduct(req: Request, res: Response) {
  const product = await FinishedProduct.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Finished product not found' });
  return res.json(product);
}

/** POST /api/finished-products */
export async function createFinishedProduct(req: Request, res: Response) {
  try {
    const { name, sku, category, stockUnits, sellingPrice, sellingPrice1, sellingPrice2, sellingPrice3, lowStockThresholdUnits, imageUrl } = req.body;
    const p1 = sellingPrice1 ?? sellingPrice ?? 0;
    const p2 = sellingPrice2 ?? p1;
    const p3 = sellingPrice3 ?? p1;
    const product = await FinishedProduct.create({
      name,
      sku,
      category,
      stockUnits: stockUnits ?? 0,
      sellingPrice: p1,
      sellingPrice1: p1,
      sellingPrice2: p2,
      sellingPrice3: p3,
      lowStockThresholdUnits: lowStockThresholdUnits ?? 0,
      imageUrl,
    });
    return res.status(201).json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create finished product';
    return res.status(400).json({ message });
  }
}

/** PUT /api/finished-products/:id */
export async function updateFinishedProduct(req: Request, res: Response) {
  try {
    const { name, sku, category, stockUnits, sellingPrice, sellingPrice1, sellingPrice2, sellingPrice3, lowStockThresholdUnits, imageUrl, isActive } = req.body;
    const updateData: any = { name, sku, category, stockUnits, lowStockThresholdUnits, imageUrl, isActive };
    if (sellingPrice1 !== undefined || sellingPrice !== undefined) {
      const p1 = sellingPrice1 ?? sellingPrice ?? 0;
      updateData.sellingPrice = p1;
      updateData.sellingPrice1 = p1;
    }
    if (sellingPrice2 !== undefined) updateData.sellingPrice2 = sellingPrice2;
    if (sellingPrice3 !== undefined) updateData.sellingPrice3 = sellingPrice3;

    const product = await FinishedProduct.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Finished product not found' });
    return res.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update finished product';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/finished-products/:id */
export async function deleteFinishedProduct(req: Request, res: Response) {
  const productId = req.params.id;
  const product = await FinishedProduct.findByIdAndDelete(productId);
  if (!product) return res.status(404).json({ message: 'Finished product not found' });

  // Cascade delete all formulas belonging to this finished product
  await ProductFormula.deleteMany({ finishedProduct: productId });

  return res.status(204).send();
}
