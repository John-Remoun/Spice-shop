import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Droplet,
  ShoppingBag,
  Receipt,
  Factory,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Package,
  X,
  Coins,
  Warehouse,
  FlaskConical,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';

interface RawMaterial {
  _id: string;
  name: string;
  form?: 'liquid' | 'solid';
  stockBase: number;
  weightedAverageCost: number;
  lowStockThresholdBase: number;
  baseUnit: string;
}

interface FinishedProduct {
  _id: string;
  name: string;
  stockUnits: number;
  lastKnownUnitCost: number;
  lowStockThresholdUnits: number;
}

interface Formula {
  _id: string;
  finishedProduct?: { _id: string };
}

interface PackagingMaterial {
  _id: string;
  name: string;
  materialType?: string;
  stockPcs: number;
  weightedAverageCost: number;
  lowStockThresholdPcs: number;
}

interface ProductionBatch {
  _id: string;
  batchNumber: string;
  formula?: { name: string };
  quantityProduced: number;
  createdAt: string;
}

interface Sale {
  _id: string;
  receiptNumber: string;
  totalAmount?: number;
  total?: number;
  grossMargin?: number;
  totalCost?: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: async () => (await apiClient.get<RawMaterial[]>('/raw-materials')).data,
  });

  const { data: finishedProducts = [] } = useQuery<FinishedProduct[]>({
    queryKey: ['finished-products'],
    queryFn: async () => (await apiClient.get<FinishedProduct[]>('/finished-products')).data,
  });

  const { data: packagingMaterials = [] } = useQuery<PackagingMaterial[]>({
    queryKey: ['packaging'],
    queryFn: async () => (await apiClient.get<PackagingMaterial[]>('/packaging')).data,
  });

  const { data: batches = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches'],
    queryFn: async () => (await apiClient.get<ProductionBatch[]>('/production-batches')).data,
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: async () => (await apiClient.get<Sale[]>('/sales')).data,
  });

  const { data: formulas = [] } = useQuery<Formula[]>({
    queryKey: ['formulas'],
    queryFn: async () => (await apiClient.get<Formula[]>('/formulas')).data,
  });

  const totalSalesAmount = sales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0);
  const totalProfitAmount = sales.reduce((acc, s) => acc + (s.grossMargin ?? ((s.totalAmount ?? s.total ?? 0) - (s.totalCost ?? 0))), 0);

  const lowStockRM = rawMaterials.filter((m) => m.stockBase <= m.lowStockThresholdBase);
  const lowStockFP = finishedProducts.filter((p) => p.stockUnits <= p.lowStockThresholdUnits);
  const lowStockPkg = packagingMaterials.filter((p) => p.stockPcs <= p.lowStockThresholdPcs);

  const totalLowStock = lowStockRM.length + lowStockFP.length + lowStockPkg.length;

  // Inventory valuation breakdown
  const rawMaterialsValue = rawMaterials.reduce((acc, m) => acc + m.stockBase * m.weightedAverageCost, 0);
  const packagingValue = packagingMaterials.reduce((acc, p) => acc + p.stockPcs * p.weightedAverageCost, 0);

  const pureFinishedProducts = finishedProducts.filter((p) => formulas.filter((f) => f.finishedProduct?._id === p._id).length === 0);
  const compositeProducts = finishedProducts.filter((p) => formulas.filter((f) => f.finishedProduct?._id === p._id).length >= 1);
  const pureFinishedValue = pureFinishedProducts.reduce((acc, p) => acc + p.stockUnits * p.lastKnownUnitCost, 0);
  const compositeValue = compositeProducts.reduce((acc, p) => acc + p.stockUnits * p.lastKnownUnitCost, 0);

  const totalInventoryValue = rawMaterialsValue + packagingValue + pureFinishedValue + compositeValue;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-brand-forest dark:text-brand-sand">
          {t('nav.dashboard')}
        </h1>
      </div>

      {/* KPI Cards - Row 1: Ingredients | Finished Products | Inventory Value */}
      {/* Row 2: Low Stock | Sales Revenue | Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Ingredients */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-cyan-600"
        >
          <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 flex items-center justify-center shrink-0">
            <Droplet size={24} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage mb-1">{t('rawMaterials.totalIngredients')}</p>
            <p className="text-2xl font-display font-extrabold text-cyan-700 dark:text-cyan-300">
              {rawMaterials.length}
            </p>
          </div>
        </motion.div>

        {/* 2. Finished Products */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-purple-600"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage mb-1">{t('nav.finishedProducts')}</p>
            <p className="text-2xl font-display font-extrabold text-purple-700 dark:text-purple-300">
              {finishedProducts.length}
            </p>
          </div>
        </motion.div>

        {/* 3. Total Inventory Value (Clickable) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowInventoryModal(true)}
          className="bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-indigo-600 cursor-pointer hover:ring-2 hover:ring-indigo-400/40"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Warehouse size={24} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage flex items-center justify-end gap-1 mb-1">
              <span>{t('dashboard.totalInventoryValue')}</span>
              <span className="text-[10px] text-indigo-600 underline font-normal">{t('dashboard.detailsHint')}</span>
            </p>
            <p className="text-xl font-display font-extrabold text-indigo-700 dark:text-indigo-300">
              {totalInventoryValue.toFixed(0)} <span className="text-sm font-bold">{t('common.currency')}</span>
            </p>
          </div>
        </motion.div>

        {/* 4. Low Stock Items (Clickable to open details modal) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setShowLowStockModal(true)}
          className={`bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-amber-500 cursor-pointer ${
            totalLowStock > 0 ? 'ring-2 ring-amber-500/40' : ''
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${totalLowStock > 0 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-brand-sage/20 text-brand-forest dark:text-brand-sand'}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage flex items-center justify-end gap-1 mb-1">
              <span>{t('dashboard.lowStockItems')}</span>
              <span className="text-[10px] text-amber-600 underline font-normal">{t('dashboard.detailsHint')}</span>
            </p>
            <p className={`text-2xl font-display font-extrabold ${totalLowStock > 0 ? 'text-amber-600' : 'text-brand-forest dark:text-brand-sand'}`}>
              {totalLowStock}
            </p>
          </div>
        </motion.div>

        {/* 5. إجمالي إيرادات المبيعات */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-emerald-600"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage mb-1">{t('dashboard.totalSalesRevenue')}</p>
            <p className="text-2xl font-display font-extrabold text-emerald-700 dark:text-emerald-300">
              {totalSalesAmount.toFixed(2)} <span className="text-base font-bold">{t('common.currency')}</span>
            </p>
          </div>
        </motion.div>

        {/* 6. صافي الربح */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#FAF7EF] dark:bg-brand-slate/90 border border-brand-sage/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border-e-[6px] border-e-[#00BFA5]"
        >
          <div className="w-12 h-12 rounded-full bg-[#D4F8F0] dark:bg-teal-950/60 text-[#009688] dark:text-teal-300 flex items-center justify-center shrink-0">
            <Coins size={26} />
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-gray-500 dark:text-brand-sage mb-1">{t('dashboard.netProfit')}</p>
            <p className="text-2xl font-display font-extrabold text-[#009688] dark:text-teal-300">
              {totalProfitAmount.toFixed(2)} <span className="text-base font-bold">{t('common.currency')}</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/production"
          className="card-botanical hover:shadow-lg transition-all group flex items-center justify-between border-s-4 border-s-brand-forest"
        >
          <div className="flex items-center gap-3">
            <Factory size={22} className="text-brand-forest dark:text-brand-sand" />
            <div>
              <h3 className="font-display font-semibold text-brand-forest dark:text-brand-sand">
                {t('dashboard.runProductionBatch')}
              </h3>
              <p className="text-xs text-brand-sage">{t('dashboard.produceSubtitle')}</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-brand-sage group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:rotate-180" />
        </Link>

        <Link
          to="/sales"
          className="card-botanical hover:shadow-lg transition-all group flex items-center justify-between border-s-4 border-s-emerald-600"
        >
          <div className="flex items-center gap-3">
            <Receipt size={22} className="text-emerald-600" />
            <div>
              <h3 className="font-display font-semibold text-brand-forest dark:text-brand-sand">
                {t('dashboard.posRegister')}
              </h3>
              <p className="text-xs text-brand-sage">{t('dashboard.posSubtitle')}</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-brand-sage group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:rotate-180" />
        </Link>

        <Link
          to="/raw-materials"
          className="card-botanical hover:shadow-lg transition-all group flex items-center justify-between border-s-4 border-s-amber-600"
        >
          <div className="flex items-center gap-3">
            <Droplet size={22} className="text-amber-600" />
            <div>
              <h3 className="font-display font-semibold text-brand-forest dark:text-brand-sand">
                {t('dashboard.logPurchases')}
              </h3>
              <p className="text-xs text-brand-sage">{t('dashboard.purchasesSubtitle')}</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-brand-sage group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:rotate-180" />
        </Link>
      </div>

      {/* Interactive Performance Calendar & Daily Report Widget */}
      <CalendarWidget />

      {/* Inventory Value Breakdown Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <Warehouse className="w-5 h-5" />
                <h3 className="text-base font-bold text-gray-900 dark:text-[#F5EFE0]">
                  {t('dashboard.inventoryValueModalTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              {/* Raw Materials */}
              <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 flex items-center justify-center">
                    <Droplet size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t('dashboard.rawMaterialsCategory')}</p>
                    <p className="text-[11px] text-gray-500">{rawMaterials.length} {t('dashboard.itemsCount')}</p>
                  </div>
                </div>
                <p className="font-extrabold text-cyan-700 dark:text-cyan-300 text-sm">
                  {rawMaterialsValue.toFixed(2)} {t('common.currency')}
                </p>
              </div>

              {/* Packaging */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 flex items-center justify-center">
                    <Package size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t('dashboard.packagingCategory')}</p>
                    <p className="text-[11px] text-gray-500">{packagingMaterials.length} {t('dashboard.itemsCount')}</p>
                  </div>
                </div>
                <p className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                  {packagingValue.toFixed(2)} {t('common.currency')}
                </p>
              </div>

              {/* Pure Finished Products */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t('dashboard.pureFinishedCategory')}</p>
                    <p className="text-[11px] text-gray-500">{pureFinishedProducts.length} {t('dashboard.itemsCount')}</p>
                  </div>
                </div>
                <p className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                  {pureFinishedValue.toFixed(2)} {t('common.currency')}
                </p>
              </div>

              {/* Composite Products */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 flex items-center justify-center">
                    <FlaskConical size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t('dashboard.compositeProductsCategory')}</p>
                    <p className="text-[11px] text-gray-500">{compositeProducts.length} {t('dashboard.itemsCount')}</p>
                  </div>
                </div>
                <p className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                  {compositeValue.toFixed(2)} {t('common.currency')}
                </p>
              </div>

              {/* Total Row */}
              <div className="p-3.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{t('dashboard.totalInventoryValue')}</p>
                <p className="font-extrabold text-gray-900 dark:text-white text-base">
                  {totalInventoryValue.toFixed(2)} {t('common.currency')}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-[#263A2A] flex justify-end">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Low Stock Items Details Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-gray-900 dark:text-[#F5EFE0]">
                  {t('dashboard.lowStockModalTitle')} ({totalLowStock})
                </h3>
              </div>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
              {totalLowStock === 0 ? (
                <p className="text-center py-8 text-emerald-600 font-bold">{t('dashboard.noLowStockItems')}</p>
              ) : (
                <>
                  {/* Raw Materials Section */}
                  {lowStockRM.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border-b pb-1">
                        <Droplet size={14} /> {t('dashboard.rawMaterialsCategory')} ({lowStockRM.length})
                      </h4>
                      <div className="space-y-1.5">
                        {lowStockRM.map((m) => (
                          <div key={m._id} className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                            <div>
                              <strong className="text-gray-800 dark:text-gray-100 text-xs block">{m.name}</strong>
                              <span className="text-[11px] text-gray-500">{t('dashboard.minThreshold')} {m.lowStockThresholdBase} {m.baseUnit}</span>
                            </div>
                            <div className="text-end">
                              <span className="font-extrabold text-rose-600 text-xs block">{m.stockBase} {m.baseUnit}</span>
                              <Link to="/raw-materials" onClick={() => setShowLowStockModal(false)} className="text-[10px] text-amber-700 dark:text-amber-400 underline font-bold">
                                {t('dashboard.logSupplyAction')}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packaging Section */}
                  {lowStockPkg.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 border-b pb-1">
                        <Package size={14} /> {t('dashboard.packagingCategory')} ({lowStockPkg.length})
                      </h4>
                      <div className="space-y-1.5">
                        {lowStockPkg.map((p) => (
                          <div key={p._id} className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between">
                            <div>
                              <strong className="text-gray-800 dark:text-gray-100 text-xs block">{p.name}</strong>
                              <span className="text-[11px] text-gray-500">{t('dashboard.minThreshold')} {p.lowStockThresholdPcs} {t('common.pcs')}</span>
                            </div>
                            <div className="text-end">
                              <span className="font-extrabold text-rose-600 text-xs block">{p.stockPcs} {t('common.pcs')}</span>
                              <Link to="/packaging" onClick={() => setShowLowStockModal(false)} className="text-[10px] text-purple-700 dark:text-purple-400 underline font-bold">
                                {t('dashboard.addPackagingAction')}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finished Products Section */}
                  {lowStockFP.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 border-b pb-1">
                        <ShoppingBag size={14} /> {t('dashboard.finishedProductsCategory')} ({lowStockFP.length})
                      </h4>
                      <div className="space-y-1.5">
                        {lowStockFP.map((p) => (
                          <div key={p._id} className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
                            <div>
                              <strong className="text-gray-800 dark:text-gray-100 text-xs block">{p.name}</strong>
                              <span className="text-[11px] text-gray-500">{t('dashboard.minThreshold')} {p.lowStockThresholdUnits} {t('common.pcs')}</span>
                            </div>
                            <div className="text-end">
                              <span className="font-extrabold text-rose-600 text-xs block">{p.stockUnits} {t('common.pcs')}</span>
                              <Link to="/production" onClick={() => setShowLowStockModal(false)} className="text-[10px] text-blue-700 dark:text-blue-400 underline font-bold">
                                {t('dashboard.runProductionAction')}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-[#263A2A] flex justify-end">
              <button
                onClick={() => setShowLowStockModal(false)}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
