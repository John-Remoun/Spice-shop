export enum UserRole {
  SUPER_ADMIN = 'superadmin',
  STAFF = 'staff', // reserved for future granular roles
}

export enum RawMaterialForm {
  LIQUID = 'liquid', // base unit: ml
  SOLID = 'solid', // base unit: g
}

export enum PurchaseUnit {
  // Liquids
  ML = 'ml',
  L = 'l',
  // Solids
  G = 'g',
  KG = 'kg',
  // Packaging
  PCS = 'pcs',
}

export enum BatchStatus {
  COMPLETED = 'completed',
  REVERSED = 'reversed', // soft-cancel that restocks materials
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  SALE_COMPLETED = 'sale_completed',
}

export enum AlertChannel {
  PUSH = 'push',
  EMAIL = 'email',
}

// Conversion factors into base units (ml / g). Packaging is always pcs=1.
export const UNIT_TO_BASE: Record<string, number> = {
  ml: 1,
  l: 1000,
  g: 1,
  kg: 1000,
  pcs: 1,
  'مل': 1,
  'لتر': 1000,
  'جرام': 1,
  'كجم': 1000,
  'قطعة': 1,
};
