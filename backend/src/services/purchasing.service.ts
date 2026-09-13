import RawMaterial from '../models/RawMaterial';
import Packaging from '../models/Packaging';
import { UNIT_TO_BASE } from '../types/enums';

/**
 * Log an inbound raw-material purchase. Converts the given quantity/unit
 * (ml, l, g, or kg) to the material's base unit, recomputes the Weighted
 * Average Cost, and appends a purchase log entry.
 *
 *   newWAC = (currentStock * currentWAC + incomingBaseQty * incomingUnitCostBase)
 *            / (currentStock + incomingBaseQty)
 */
export async function logRawMaterialPurchase(args: {
  rawMaterialId: string;
  quantity: number; // in `unit`, not yet normalized
  unit: 'ml' | 'l' | 'g' | 'kg';
  totalCost: number; // total cost of this shipment, in store currency
  supplier?: string;
  note?: string;
}) {
  const material = await RawMaterial.findById(args.rawMaterialId);
  if (!material) throw new Error('Raw material not found');

  const factor = UNIT_TO_BASE[args.unit];
  if (!factor) throw new Error(`Unsupported unit "${args.unit}" for a raw material`);

  const quantityBase = args.quantity * factor;
  const unitCostBase = args.totalCost / quantityBase;

  const currentStock = material.stockBase;
  const currentWAC = material.weightedAverageCost;
  const newStock = currentStock + quantityBase;
  const newWAC = newStock === 0 ? 0 : (currentStock * currentWAC + quantityBase * unitCostBase) / newStock;

  material.stockBase = newStock;
  material.weightedAverageCost = newWAC;
  material.purchaseLog.push({
    date: new Date(),
    quantityBase,
    unitCostAtPurchase: unitCostBase,
    totalCost: args.totalCost,
    supplier: args.supplier,
    note: args.note,
  });

  await material.save();
  return material;
}

/** Same WAC logic for packaging, where quantity is always integer pcs. */
export async function logPackagingPurchase(args: {
  packagingId: string;
  quantityPcs: number;
  totalCost: number;
  supplier?: string;
  note?: string;
}) {
  if (!Number.isInteger(args.quantityPcs) || args.quantityPcs <= 0) {
    throw new Error('quantityPcs must be a positive integer');
  }

  const pkg = await Packaging.findById(args.packagingId);
  if (!pkg) throw new Error('Packaging item not found');

  const unitCost = args.totalCost / args.quantityPcs;
  const currentStock = pkg.stockPcs;
  const currentWAC = pkg.weightedAverageCost;
  const newStock = currentStock + args.quantityPcs;
  const newWAC = newStock === 0 ? 0 : (currentStock * currentWAC + args.quantityPcs * unitCost) / newStock;

  pkg.stockPcs = newStock;
  pkg.weightedAverageCost = newWAC;
  pkg.purchaseLog.push({
    date: new Date(),
    quantityPcs: args.quantityPcs,
    unitCostAtPurchase: unitCost,
    totalCost: args.totalCost,
    supplier: args.supplier,
    note: args.note,
  });

  await pkg.save();
  return pkg;
}
