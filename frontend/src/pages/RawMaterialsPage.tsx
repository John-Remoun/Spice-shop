import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, Droplet, Box, Trash2, ShoppingCart, Edit3, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface RawMaterial {
  _id: string;
  name: string;
  form: 'liquid' | 'solid';
  baseUnit: 'ml' | 'g';
  stockBase: number;
  weightedAverageCost: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  lowStockThresholdBase: number;
  isActive: boolean;
}

export default function RawMaterialsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<RawMaterial | null>(null);

  // Form states for creating raw material
  const [name, setName] = useState('');
  const [form, setForm] = useState<'liquid' | 'solid'>('liquid');
  const [initialQty, setInitialQty] = useState(100);
  const [unit, setUnit] = useState<'ml' | 'l' | 'g' | 'kg'>('l');
  const [initialCost, setInitialCost] = useState(100);
  const [sellingPrice1, setSellingPrice1] = useState(20);
  const [sellingPrice2, setSellingPrice2] = useState(25);
  const [sellingPrice3, setSellingPrice3] = useState(30);
  const [supplier, setSupplier] = useState('');
  const [threshold, setThreshold] = useState(1);

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editForm, setEditForm] = useState<'liquid' | 'solid'>('liquid');
  const [editStock, setEditStock] = useState(0);
  const [editCost, setEditCost] = useState(0);
  const [editPrice1, setEditPrice1] = useState(20);
  const [editPrice2, setEditPrice2] = useState(25);
  const [editPrice3, setEditPrice3] = useState(30);
  const [editThreshold, setEditThreshold] = useState(1);

  // Form states for logging extra purchase
  const [purchaseQty, setPurchaseQty] = useState(100);
  const [purchaseUnit, setPurchaseUnit] = useState<'ml' | 'l' | 'g' | 'kg'>('ml');
  const [purchaseCost, setPurchaseCost] = useState(10);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: async () => (await apiClient.get<RawMaterial[]>('/raw-materials')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return (
        await apiClient.post('/raw-materials', {
          name,
          form,
          lowStockThresholdBase: (Number(threshold) || 0) * 1000,
          initialQuantity: initialQty,
          unit,
          initialTotalCost: initialCost,
          sellingPrice1,
          sellingPrice2,
          sellingPrice3,
          supplier,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setIsAddOpen(false);
      setName('');
      setInitialQty(100);
      setInitialCost(100);
      setSellingPrice1(20);
      setSellingPrice2(25);
      setSellingPrice3(30);
      setThreshold(1);
      setSupplier('');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      return (
        await apiClient.put(`/raw-materials/${editTarget._id}`, {
          name: editName,
          form: editForm,
          stockBase: (Number(editStock) || 0) * 1000,
          weightedAverageCost: (Number(editCost) || 0) / 1000,
          sellingPrice1: editPrice1,
          sellingPrice2: editPrice2,
          sellingPrice3: editPrice3,
          lowStockThresholdBase: (Number(editThreshold) || 0) * 1000,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/raw-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setDeleteTarget(null);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseTarget) return;
      return (
        await apiClient.post(`/raw-materials/${purchaseTarget._id}/purchase`, {
          quantity: purchaseQty,
          unit: purchaseUnit,
          totalCost: purchaseCost,
          supplier: purchaseSupplier,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setPurchaseTarget(null);
    },
  });

  const handleOpenEdit = (m: RawMaterial) => {
    setEditTarget(m);
    setEditName(m.name);
    setEditForm(m.form);
    const majorStock = m.stockBase >= 0 ? Number((m.stockBase / 1000).toFixed(2)) : 0;
    setEditStock(majorStock);
    const majorCost = m.weightedAverageCost >= 0 ? Number((m.weightedAverageCost * 1000).toFixed(2)) : 0;
    setEditCost(majorCost);
    const p1 = m.sellingPrice1 ?? 20;
    const p2 = m.sellingPrice2 ?? p1;
    const p3 = m.sellingPrice3 ?? p1;
    setEditPrice1(p1);
    setEditPrice2(p2);
    setEditPrice3(p3);
    setEditThreshold(m.lowStockThresholdBase >= 1000 ? m.lowStockThresholdBase / 1000 : (m.lowStockThresholdBase || 1));
  };

  const formatStock = (m: RawMaterial) => {
    const isAr = i18n.language === 'ar';
    if (m.form === 'liquid') {
      if (m.stockBase >= 1000) {
        const liters = m.stockBase / 1000;
        return `${liters.toLocaleString()} ${isAr ? 'لتر' : 'L'}`;
      }
      return `${m.stockBase.toLocaleString()} ml`;
    } else {
      if (m.stockBase >= 1000) {
        const kg = m.stockBase / 1000;
        return `${kg.toLocaleString()} ${isAr ? 'كجم' : 'kg'}`;
      }
      return `${m.stockBase.toLocaleString()} g`;
    }
  };

  const formatWac = (m: RawMaterial) => {
    const isAr = i18n.language === 'ar';
    const curr = t('common.currency');
    if (m.form === 'liquid') {
      const costPerLiter = m.weightedAverageCost * 1000;
      return `${costPerLiter.toFixed(2)} ${curr} / ${isAr ? 'لتر' : 'L'}`;
    } else {
      const costPerKg = m.weightedAverageCost * 1000;
      return `${costPerKg.toFixed(2)} ${curr} / ${isAr ? 'كجم' : 'kg'}`;
    }
  };

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedItems: visibleMaterials,
    currentPage,
    totalPages,
    goToPage,
    totalItems,
  } = usePagination(filtered, 8);

  const lowStockCount = materials.filter((m) => m.stockBase <= m.lowStockThresholdBase).length;
  const totalValuation = materials.reduce((acc, m) => acc + m.stockBase * m.weightedAverageCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand">
            {t('nav.rawMaterials')}
          </h1>
          <p className="text-sm text-brand-sage">{t('rawMaterials.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto text-sm"
        >
          <Plus size={16} />
          <span>{t('rawMaterials.addBtn')}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('rawMaterials.totalIngredients')}</p>
          <p className="text-xl font-display mt-1 text-brand-forest dark:text-brand-sand">{materials.length}</p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('rawMaterials.lowStockAlerts')}</p>
          <p className="text-xl font-display mt-1 flex items-center gap-1 text-amber-600">
            {lowStockCount > 0 && <AlertTriangle size={16} />}
            {lowStockCount}
          </p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('rawMaterials.valuation')}</p>
          <p className="text-sm font-display mt-1 text-brand-forest dark:text-brand-sand font-bold">
            {totalValuation.toFixed(0)} <span className="text-xs font-normal">{t('common.currency')}</span>
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={t('rawMaterials.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
          />
        </div>
      </div>

      {/* Materials List (Responsive Table on Desktop / Elegant Cards on Mobile) */}
      <div className="card-botanical overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('rawMaterials.noData')}</p>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden space-y-3">
              {visibleMaterials.map((m) => {
                const isLow = m.stockBase <= m.lowStockThresholdBase;
                const majorUnit = m.form === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg');
                return (
                  <div key={m._id} className="p-3.5 rounded-xl border border-brand-sage/20 bg-white/50 dark:bg-brand-slate/40 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-brand-forest dark:text-brand-sand">
                        {m.form === 'liquid' ? (
                          <span className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 shrink-0"><Droplet size={16} /></span>
                        ) : (
                          <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0"><Box size={16} /></span>
                        )}
                        <span className="text-base">{m.name}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isLow ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-brand-sage/15 text-brand-forest dark:text-brand-sand'}`}>
                        {formatStock(m)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-brand-sage pt-1 border-t border-brand-sage/10">
                      <div>
                        <span className="block text-[11px] font-semibold text-brand-sage">{t('rawMaterials.colWac')}</span>
                        <span className="font-mono text-brand-forest dark:text-brand-sand font-medium">{formatWac(m)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-brand-sage">{t('rawMaterials.colThreshold')}</span>
                        <span className="text-brand-forest dark:text-brand-sand font-medium">
                          {m.lowStockThresholdBase >= 1000
                            ? `${m.lowStockThresholdBase / 1000} ${majorUnit}`
                            : `${m.lowStockThresholdBase} ${m.baseUnit}`}
                        </span>
                      </div>
                    </div>

                    {m.sellingPrice1 ? (
                      <div className="rounded-xl overflow-hidden border border-brand-sage/20">
                        {/* Header */}
                        <div className="bg-brand-sage/10 dark:bg-brand-olive/50 px-2.5 py-1 text-[10px] font-bold text-brand-sage uppercase tracking-wide">
                          {t('rawMaterials.colSellingPrices')}
                        </div>
                        {/* 3-column price grid */}
                        <div className="grid grid-cols-3 divide-x divide-brand-sage/15 rtl:divide-x-reverse">
                          <div className="p-2 text-center bg-emerald-50/60 dark:bg-emerald-950/20">
                            <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                              {i18n.language === 'ar' ? 'س١' : 'P1'}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-tight">
                              {m.sellingPrice1.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-brand-sage mt-0.5">{t('common.currency')}/{majorUnit}</div>
                          </div>
                          <div className="p-2 text-center bg-amber-50/60 dark:bg-amber-950/20">
                            <div className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
                              {i18n.language === 'ar' ? 'س٢' : 'P2'}
                            </div>
                            <div className="text-xs font-bold text-amber-700 dark:text-amber-300 leading-tight">
                              {(m.sellingPrice2 ?? m.sellingPrice1).toFixed(2)}
                            </div>
                            <div className="text-[9px] text-brand-sage mt-0.5">{t('common.currency')}/{majorUnit}</div>
                          </div>
                          <div className="p-2 text-center bg-sky-50/60 dark:bg-sky-950/20">
                            <div className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 mb-0.5">
                              {i18n.language === 'ar' ? 'س٣' : 'P3'}
                            </div>
                            <div className="text-xs font-bold text-sky-700 dark:text-sky-300 leading-tight">
                              {(m.sellingPrice3 ?? m.sellingPrice1).toFixed(2)}
                            </div>
                            <div className="text-[9px] text-brand-sage mt-0.5">{t('common.currency')}/{majorUnit}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-brand-sage/10">
                      <button
                        onClick={() => {
                          setPurchaseTarget(m);
                          setPurchaseUnit(m.form === 'liquid' ? 'l' : 'kg');
                        }}
                        className="px-2.5 py-1 text-xs rounded-organic bg-brand-forest text-brand-sand hover:opacity-90 inline-flex items-center gap-1 font-semibold"
                      >
                        <ShoppingCart size={13} />
                        <span>{t('common.extraPurchase')}</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-organic transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-organic transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-sm border-collapse">
                <thead>
                  <tr className="border-b border-brand-sage/20 text-brand-forest dark:text-brand-sand text-start">
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colName')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colForm')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colStock')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colWac')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colSellingPrices')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('rawMaterials.colThreshold')}</th>
                    <th className="py-3 px-2 text-end font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMaterials.map((m) => {
                    const isLow = m.stockBase <= m.lowStockThresholdBase;
                    const majorUnit = m.form === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg');
                    return (
                      <tr key={m._id} className="border-b border-brand-sage/10 hover:bg-brand-sage/5">
                        <td className="py-3 px-2 font-medium flex items-center gap-2">
                          {m.form === 'liquid' ? (
                            <span title="مادة سائلة"><Droplet size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" /></span>
                          ) : (
                            <span title="مادة صلبة"><Box size={15} className="text-amber-700 dark:text-amber-400 shrink-0" /></span>
                          )}
                          {m.name}
                        </td>
                        <td className="py-3 px-2 capitalize">
                          {m.form === 'liquid' ? t('rawMaterials.formLiquid') : t('rawMaterials.formSolid')}
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          <span className={isLow ? 'text-red-600 font-bold' : ''}>
                            {formatStock(m)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-brand-sage font-mono">
                          {formatWac(m)}
                        </td>
                        <td className="py-3 px-2 text-xs font-semibold">
                          {m.sellingPrice1 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{i18n.language === 'ar' ? 'س1' : 'P1'}: {m.sellingPrice1.toFixed(2)} {t('common.currency')} / {majorUnit}</span>
                              <span className="text-amber-700 dark:text-amber-400 text-[11px]">{i18n.language === 'ar' ? 'س2' : 'P2'}: {(m.sellingPrice2 ?? m.sellingPrice1).toFixed(2)} {t('common.currency')}</span>
                              <span className="text-sky-700 dark:text-sky-400 text-[11px]">{i18n.language === 'ar' ? 'س3' : 'P3'}: {(m.sellingPrice3 ?? m.sellingPrice1).toFixed(2)} {t('common.currency')}</span>
                            </div>
                          ) : (
                            <span className="text-brand-sage italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-brand-sage">
                          {m.lowStockThresholdBase >= 1000
                            ? `${m.lowStockThresholdBase / 1000} ${majorUnit}`
                            : `${m.lowStockThresholdBase} ${m.baseUnit}`}
                        </td>
                        <td className="py-3 px-2 text-end flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setPurchaseTarget(m);
                              setPurchaseUnit(m.form === 'liquid' ? 'l' : 'kg');
                            }}
                            className="px-2.5 py-1 text-xs rounded-organic bg-brand-forest text-brand-sand hover:opacity-90 inline-flex items-center gap-1"
                            title={t('rawMaterials.purchaseModalTitle')}
                          >
                            <ShoppingCart size={13} />
                            <span>{t('common.extraPurchase')}</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-organic transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-organic transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={totalItems}
          itemsPerPage={8}
        />
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative w-full sm:max-w-3xl bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-4 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20">
              <h2 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand font-bold flex items-center gap-2">
                {form === 'liquid' ? <Droplet size={22} className="text-amber-500" /> : <Box size={22} className="text-emerald-500" />}
                <span>{t('rawMaterials.addModalTitle')}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Column 1: Basic Specifications */}
              <div className="space-y-4">
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.nameLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('rawMaterials.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.formLabel')}</label>
                  <select
                    value={form}
                    onChange={(e) => {
                      const f = e.target.value as 'liquid' | 'solid';
                      setForm(f);
                      setUnit(f === 'liquid' ? 'l' : 'kg');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  >
                    <option value="liquid">{t('rawMaterials.formLiquid')}</option>
                    <option value="solid">{t('rawMaterials.formSolid')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">
                    {t('rawMaterials.thresholdLabel')} ({form === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.supplierLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('rawMaterials.supplierPlaceholder')}
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Column 2: Initial Stock, Cost & 3 Selling Prices */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.initialQtyLabel')}</label>
                    <input
                      type="number"
                      min={0}
                      value={initialQty}
                      onChange={(e) => setInitialQty(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.unitLabel')}</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                    >
                      {form === 'liquid' ? (
                        <>
                          <option value="l">{i18n.language === 'ar' ? 'لتر (L)' : 'Liter (L)'}</option>
                          <option value="ml">{i18n.language === 'ar' ? 'مليلتر (ml)' : 'Milliliter (ml)'}</option>
                        </>
                      ) : (
                        <>
                          <option value="kg">{i18n.language === 'ar' ? 'كيلوجرام (kg)' : 'Kilogram (kg)'}</option>
                          <option value="g">{i18n.language === 'ar' ? 'جرام (g)' : 'Gram (g)'}</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.initialCostLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={initialCost}
                    onChange={(e) => setInitialCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>

                {/* 3 Selling Prices Box */}
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-800/40 space-y-2.5">
                  <label className="block font-bold text-xs text-amber-900 dark:text-amber-200">
                    {t('rawMaterials.sellingPricesTitle')} ({i18n.language === 'ar' ? 'لكل' : 'per'} {form === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice1')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice1}
                        onChange={(e) => setSellingPrice1(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice2')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice2}
                        onChange={(e) => setSellingPrice2(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice3')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice3}
                        onChange={(e) => setSellingPrice3(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-sage/30 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="btn-primary text-sm px-5 py-2.5 shadow-md disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('rawMaterials.saveMaterial')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative w-full sm:max-w-3xl bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-4 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20">
              <h2 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand font-bold flex items-center gap-2">
                <Edit3 size={20} className="text-amber-500" />
                <span>{t('common.editMaterial')}: {editTarget.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Column 1: Basic Specifications */}
              <div className="space-y-4">
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.nameLabel')}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.formLabel')}</label>
                  <select
                    value={editForm}
                    onChange={(e) => setEditForm(e.target.value as 'liquid' | 'solid')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  >
                    <option value="liquid">{t('rawMaterials.formLiquid')}</option>
                    <option value="solid">{t('rawMaterials.formSolid')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">
                    {t('rawMaterials.thresholdLabel')} ({editForm === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Column 2: Stock, Cost & Selling Prices */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">
                      {t('common.currentStock')} ({editForm === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editStock}
                      onChange={(e) => setEditStock(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">
                      {t('common.costPerUnit')} ({t('common.currency')} / {editForm === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editCost}
                      onChange={(e) => setEditCost(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Edit 3 Selling Prices */}
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-800/40 space-y-2.5">
                  <label className="block font-bold text-xs text-amber-900 dark:text-amber-200">
                    {t('rawMaterials.sellingPricesTitle')} ({i18n.language === 'ar' ? 'لكل' : 'per'} {editForm === 'liquid' ? (i18n.language === 'ar' ? 'لتر' : 'L') : (i18n.language === 'ar' ? 'كجم' : 'kg')})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice1')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice1}
                        onChange={(e) => setEditPrice1(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice2')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice2}
                        onChange={(e) => setEditPrice2(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('rawMaterials.sellingPrice3')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice3}
                        onChange={(e) => setEditPrice3(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-brand-sage/30 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!editName || editMutation.isPending}
                onClick={() => editMutation.mutate()}
                className="btn-primary text-sm px-5 py-2.5 shadow-md disabled:opacity-50"
              >
                {editMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Purchase Modal */}
      {purchaseTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative w-full sm:max-w-xl bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-4 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20">
              <h2 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand font-bold flex items-center gap-2">
                <ShoppingCart size={22} className="text-amber-500" />
                <span>{t('common.addSupply')}: {purchaseTarget.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setPurchaseTarget(null)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-2 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.qtyReceived')}</label>
                  <input
                    type="number"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.unitLabel')}</label>
                  <select
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                  >
                    {purchaseTarget.form === 'liquid' ? (
                      <>
                        <option value="l">{i18n.language === 'ar' ? 'لتر (L)' : 'Liter (L)'}</option>
                        <option value="ml">{i18n.language === 'ar' ? 'مليلتر (ml)' : 'Milliliter (ml)'}</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">{i18n.language === 'ar' ? 'كيلوجرام (kg)' : 'Kilogram (kg)'}</option>
                        <option value="g">{i18n.language === 'ar' ? 'جرام (g)' : 'Gram (g)'}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.initialCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1.5 font-semibold">{t('rawMaterials.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder={t('rawMaterials.supplierPlaceholder')}
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-amber-500/40 outline-none font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                type="button"
                onClick={() => setPurchaseTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-brand-sage/30 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={purchaseQty <= 0 || purchaseMutation.isPending}
                onClick={() => purchaseMutation.mutate()}
                className="btn-primary text-sm px-5 py-2.5 shadow-md disabled:opacity-50"
              >
                {purchaseMutation.isPending ? t('common.loading') : t('rawMaterials.savePurchase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl">
            <h2 className="font-display text-lg text-red-600 dark:text-red-400 font-bold mb-2">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand mb-4">
              {t('common.confirmDeleteMsg')} ({deleteTarget.name})
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm font-medium">
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50"
              >
                {deleteMutation.isPending ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
