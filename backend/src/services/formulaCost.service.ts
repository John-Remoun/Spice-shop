import ProductFormula from '../models/ProductFormula';

export interface FormulaCostBreakdown {
  formulaId: string;
  materialsCost: number;
  packagingCost: number;
  totalUnitCost: number;
  targetSellingPrice: number;
  expectedMarginAmount: number;
  expectedMarginPct: number;
  maxProducibleUnits: number;
}

/**
 * Computes a formula's unit cost & margin live, from the CURRENT
 * weightedAverageCost of every referenced raw material / packaging item —
 * never from a cached figure, so ingredient price changes are reflected
 * immediately without needing to re-save every formula.
 */
export async function computeFormulaCost(formulaId: string): Promise<FormulaCostBreakdown> {
  const formula = await ProductFormula.findById(formulaId)
    .populate('materials.rawMaterial')
    .populate('packagingItems.packaging');

  if (!formula) throw new Error('Formula not found');

  const materialsCost = formula.materials.reduce((sum, line) => {
    const rm = line.rawMaterial as unknown as { weightedAverageCost?: number } | null;
    const wac = rm?.weightedAverageCost ?? 0;
    return sum + (line.quantityBase || 0) * wac;
  }, 0);

  const packagingCost = (formula.packagingItems || []).reduce((sum, line) => {
    const pkg = line.packaging as unknown as { weightedAverageCost?: number } | null;
    const wac = pkg?.weightedAverageCost ?? 0;
    return sum + (line.quantityPcs || 0) * wac;
  }, 0);

  const totalUnitCost = materialsCost + packagingCost;
  const targetSellingPrice = formula.targetSellingPrice || 0;
  const expectedMarginAmount = targetSellingPrice - totalUnitCost;
  const expectedMarginPct =
    targetSellingPrice > 0 ? (expectedMarginAmount / targetSellingPrice) * 100 : 0;

  // Calculate maximum units that can be produced from current available raw materials and packaging
  let maxProducible = Infinity;

  for (const line of formula.materials) {
    const rm = line.rawMaterial as unknown as { stockBase?: number } | null;
    const currentStock = rm?.stockBase ?? 0;
    const needed = line.quantityBase || 0;
    if (needed > 0) {
      const canMake = Math.floor(currentStock / needed);
      if (canMake < maxProducible) {
        maxProducible = canMake;
      }
    }
  }

  for (const line of formula.packagingItems || []) {
    const pkg = line.packaging as unknown as { stockPcs?: number } | null;
    const currentStock = pkg?.stockPcs ?? 0;
    const needed = line.quantityPcs || 0;
    if (needed > 0) {
      const canMake = Math.floor(currentStock / needed);
      if (canMake < maxProducible) {
        maxProducible = canMake;
      }
    }
  }

  if (maxProducible === Infinity) {
    maxProducible = 0;
  }

  return {
    formulaId: formula._id.toString(),
    materialsCost,
    packagingCost,
    totalUnitCost,
    targetSellingPrice,
    expectedMarginAmount,
    expectedMarginPct,
    maxProducibleUnits: maxProducible,
  };
}
