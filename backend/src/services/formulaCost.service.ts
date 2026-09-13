import ProductFormula from '../models/ProductFormula';

export interface FormulaCostBreakdown {
  formulaId: string;
  materialsCost: number;
  packagingCost: number;
  totalUnitCost: number;
  targetSellingPrice: number;
  expectedMarginAmount: number;
  expectedMarginPct: number;
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

  return {
    formulaId: formula._id.toString(),
    materialsCost,
    packagingCost,
    totalUnitCost,
    targetSellingPrice,
    expectedMarginAmount,
    expectedMarginPct,
  };
}
