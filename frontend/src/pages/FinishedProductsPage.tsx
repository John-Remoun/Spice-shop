import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingBag, Search, AlertTriangle, Trash2, Edit3, ChevronDown, ChevronUp, FlaskConical, Eye, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface FinishedProduct {
  _id: string;
  name: string;
  category?: string;
  stockUnits: number;
  lastKnownUnitCost: number;
  sellingPrice: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  lowStockThresholdUnits: number;
  imageUrl?: string;
  isActive: boolean;
}

interface MaterialLine {
  rawMaterial: { name: string; baseUnit: string } | string;
  quantityBase: number;
}

interface PackagingLine {
  packaging: { name: string } | string;
  quantityPcs: number;
}

interface Formula {
  _id: string;
  name: string;
  finishedProduct?: { _id: string; name: string };
  materials: MaterialLine[];
  packagingItems: PackagingLine[];
  targetSellingPrice: number;
  costInfo?: {
    totalUnitCost: number;
    expectedMarginAmount: number;
    expectedMarginPct: number;
  };
}

export default function FinishedProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FinishedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinishedProduct | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Add form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice1, setSellingPrice1] = useState(25);
  const [sellingPrice2, setSellingPrice2] = useState(30);
  const [sellingPrice3, setSellingPrice3] = useState(35);
  const [threshold, setThreshold] = useState(10);
  const [stockUnits, setStockUnits] = useState(0);
  const [purchaseCost, setPurchaseCost] = useState<number | ''>(20);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice1, setEditPrice1] = useState(25);
  const [editPrice2, setEditPrice2] = useState(30);
  const [editPrice3, setEditPrice3] = useState(35);
  const [editStockUnits, setEditStockUnits] = useState(0);
  const [editPurchaseCost, setEditPurchaseCost] = useState<number | ''>(0);
  const [editThreshold, setEditThreshold] = useState(10);

  const { data: products = [], isLoading } = useQuery<FinishedProduct[]>({
    queryKey: ['finished-products'],
    queryFn: async () => (await apiClient.get<FinishedProduct[]>('/finished-products')).data,
  });

  const { data: formulas = [] } = useQuery<Formula[]>({
    queryKey: ['formulas'],
    queryFn: async () => (await apiClient.get<Formula[]>('/formulas')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return (
        await apiClient.post('/finished-products', {
          name,
          category,
          sellingPrice: sellingPrice1,
          sellingPrice1,
          sellingPrice2,
          sellingPrice3,
          lowStockThresholdUnits: threshold,
          stockUnits,
          purchaseCost: purchaseCost === '' ? 0 : Number(purchaseCost),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      setIsAddOpen(false);
      setName('');
      setCategory('');
      setSellingPrice1(25);
      setSellingPrice2(30);
      setSellingPrice3(35);
      setStockUnits(0);
      setPurchaseCost(20);
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      return (
        await apiClient.put(`/finished-products/${editTarget._id}`, {
          name: editName,
          category: editCategory,
          sellingPrice: editPrice1,
          sellingPrice1: editPrice1,
          sellingPrice2: editPrice2,
          sellingPrice3: editPrice3,
          stockUnits: editStockUnits,
          purchaseCost: editPurchaseCost === '' ? 0 : Number(editPurchaseCost),
          lowStockThresholdUnits: editThreshold,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/finished-products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      setDeleteTarget(null);
    },
  });

  const handleOpenEdit = (p: FinishedProduct) => {
    setEditTarget(p);
    setEditName(p.name);
    setEditCategory(p.category || '');
    const p1 = p.sellingPrice1 ?? p.sellingPrice ?? 25;
    const p2 = p.sellingPrice2 ?? p1;
    const p3 = p.sellingPrice3 ?? p1;
    setEditPrice1(p1);
    setEditPrice2(p2);
    setEditPrice3(p3);
    setEditStockUnits(p.stockUnits);
    setEditPurchaseCost(p.lastKnownUnitCost ?? 0);
    setEditThreshold(p.lowStockThresholdUnits);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedItems: visibleItems,
    currentPage,
    totalPages,
    goToPage,
    totalItems,
  } = usePagination(filtered, 8);

  const lowStockCount = products.filter((p) => p.stockUnits <= p.lowStockThresholdUnits).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockUnits, 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand">
            {t('nav.finishedProducts')}
          </h1>
          <p className="text-sm text-brand-sage">{t('finishedProducts.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto text-sm"
        >
          <Plus size={16} />
          <span>{t('finishedProducts.addBtn')}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('finishedProducts.totalSkus')}</p>
          <p className="text-xl font-display mt-1 text-brand-forest dark:text-brand-sand">{products.length}</p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('finishedProducts.readyStock')}</p>
          <p className="text-sm font-display mt-1 text-brand-forest dark:text-brand-sand font-bold">
            {totalStockUnits} <span className="text-xs font-normal">{t('common.pcs')}</span>
          </p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('finishedProducts.lowStockAlerts')}</p>
          <p className="text-xl font-display mt-1 flex items-center gap-1 text-amber-600">
            {lowStockCount > 0 && <AlertTriangle size={16} />}
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
        <input
          type="text"
          placeholder={t('finishedProducts.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
        />
      </div>

      {/* Product Catalog List */}
      <div className="card-botanical overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('finishedProducts.noData')}</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {visibleItems.map((p) => {
                const isLow = p.stockUnits <= p.lowStockThresholdUnits;
                const linkedFormulas = formulas.filter((f) => f.finishedProduct?._id === p._id);
                return (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-xl border border-brand-sage/20 bg-white/50 dark:bg-brand-slate/40 space-y-2.5 shadow-sm"
                  >
                    {/* Name + Stock */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-brand-forest dark:text-brand-sand min-w-0">
                        <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
                          <ShoppingBag size={15} />
                        </span>
                        <span className="text-sm truncate">{p.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isLow ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-brand-sage/15 text-brand-forest dark:text-brand-sand'
                      }`}>
                        {p.stockUnits} {t('common.pcs')}
                      </span>
                    </div>

                    {/* Category + Cost */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-brand-sage/10 pt-2">
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">{t('finishedProducts.colCategory')}</span>
                        <span className="font-medium text-brand-forest dark:text-brand-sand capitalize">{p.category || 'عام'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">{t('finishedProducts.colCost')}</span>
                        <span className="font-mono font-medium text-brand-forest dark:text-brand-sand">{p.lastKnownUnitCost.toFixed(2)} {t('common.currency')}</span>
                      </div>
                    </div>

                    {/* Selling Prices */}
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-2 border border-purple-200/40 dark:border-purple-900/30">
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-center">
                        <div className="text-emerald-700 dark:text-emerald-400">
                          <div className="text-[9px] text-brand-sage font-normal mb-0.5">س1</div>
                          {(p.sellingPrice1 ?? p.sellingPrice).toFixed(2)}
                        </div>
                        <div className="text-amber-700 dark:text-amber-400">
                          <div className="text-[9px] text-brand-sage font-normal mb-0.5">س2</div>
                          {(p.sellingPrice2 ?? p.sellingPrice1 ?? p.sellingPrice).toFixed(2)}
                        </div>
                        <div className="text-sky-700 dark:text-sky-400">
                          <div className="text-[9px] text-brand-sage font-normal mb-0.5">س3</div>
                          {(p.sellingPrice3 ?? p.sellingPrice1 ?? p.sellingPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-sage/10">
                      <button
                        onClick={() => setExpandedProductId(p._id)}
                        className="px-2.5 py-1.5 text-xs rounded-lg bg-brand-sage/15 text-brand-forest dark:text-brand-sand font-medium hover:bg-brand-sage/30 flex items-center gap-1"
                      >
                        <FlaskConical size={12} />
                        <span>{linkedFormulas.length} {t('finishedProducts.formulaCount')}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-sm border-collapse">
                <thead>
                  <tr className="border-b border-brand-sage/20 text-brand-forest dark:text-brand-sand text-start">
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colName')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colCategory')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colStock')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colCost')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colPrice')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.linkedFormulas')}</th>
                    <th className="py-3 px-2 text-end font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((p) => {
                    const isLow = p.stockUnits <= p.lowStockThresholdUnits;
                    const linkedFormulas = formulas.filter((f) => f.finishedProduct?._id === p._id);
                    const isExpanded = expandedProductId === p._id;
                    return (
                      <tr key={p._id} className="border-b border-brand-sage/10 hover:bg-brand-sage/5 transition-colors group">
                        <td
                          onClick={() => setExpandedProductId(isExpanded ? null : p._id)}
                          className="py-3 px-2 font-medium cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingBag size={14} className="text-brand-forest dark:text-brand-sand shrink-0" />
                            <span className="hover:underline">{p.name}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </td>
                        <td className="py-3 px-2 capitalize text-brand-sage">{p.category || 'عام'}</td>
                        <td className="py-3 px-2 font-bold">
                          <span className={isLow ? 'text-red-600' : 'text-brand-forest dark:text-brand-sand'}>
                            {p.stockUnits} {t('common.pcs')}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-brand-sage">{p.lastKnownUnitCost.toFixed(2)} {t('common.currency')}</td>
                        <td className="py-3 px-2 font-semibold text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">س1: {(p.sellingPrice1 ?? p.sellingPrice).toFixed(2)} ج.م</span>
                            <span className="text-amber-700 dark:text-amber-400 font-medium">س2: {(p.sellingPrice2 ?? p.sellingPrice1 ?? p.sellingPrice).toFixed(2)} ج.م</span>
                            <span className="text-sky-700 dark:text-sky-400 font-medium">س3: {(p.sellingPrice3 ?? p.sellingPrice1 ?? p.sellingPrice).toFixed(2)} ج.م</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setExpandedProductId(isExpanded ? null : p._id)}
                            className="px-2.5 py-1 text-xs rounded-full bg-brand-sage/15 text-brand-forest dark:text-brand-sand font-medium hover:bg-brand-sage/30 flex items-center gap-1"
                          >
                            <FlaskConical size={12} />
                            <span>{linkedFormulas.length} {t('finishedProducts.formulaCount')}</span>
                          </button>
                        </td>
                        <td className="py-3 px-2 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-organic transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-organic transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Expanded Linked Formulas Detail Modal */}
      {expandedProductId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {(() => {
              const currentProd = products.find((p) => p._id === expandedProductId);
              const linkedFormulas = formulas.filter((f) => f.finishedProduct?._id === expandedProductId);
              return (
                <>
                  <div className="flex items-center justify-between border-b border-brand-sage/20 pb-3 shrink-0">
                    <h2 className="font-display text-base sm:text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2">
                      <ShoppingBag size={18} />
                      <span className="truncate max-w-[200px] sm:max-w-none">{t('finishedProducts.productFormulasTitle')} {currentProd?.name}</span>
                    </h2>
                    <button
                      onClick={() => setExpandedProductId(null)}
                      className="p-1.5 rounded-lg text-brand-sage hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {linkedFormulas.length === 0 ? (
                    <div className="text-center py-10 text-brand-sage text-sm">
                      <FlaskConical size={28} className="mx-auto mb-2 opacity-50" />
                      <p>{t('finishedProducts.noFormulasForProduct')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto flex-1 mt-3">
                      {linkedFormulas.map((formula) => (
                        <div key={formula._id} className="p-3 sm:p-4 rounded-xl bg-white/70 dark:bg-brand-slate/70 border border-brand-sage/20 space-y-2.5">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-sm text-brand-forest dark:text-brand-sand flex items-center gap-1.5">
                              <FlaskConical size={14} /> {formula.name}
                            </h3>
                            {formula.costInfo && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                {formula.costInfo.expectedMarginPct.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-brand-sage/10 pt-2">
                            <div>
                              <p className="font-semibold mb-1 text-brand-forest dark:text-brand-sand">{t('formulas.rawMaterialsHeader')}</p>
                              <ul className="list-disc list-inside text-brand-sage space-y-0.5">
                                {formula.materials.map((m, idx) => (
                                  <li key={idx}>{typeof m.rawMaterial === 'object' ? m.rawMaterial.name : ''}: {m.quantityBase} {typeof m.rawMaterial === 'object' ? m.rawMaterial.baseUnit : ''}</li>
                                ))}
                              </ul>
                            </div>
                            {formula.packagingItems.length > 0 && (
                              <div>
                                <p className="font-semibold mb-1 text-brand-forest dark:text-brand-sand">{t('formulas.packagingHeader')}</p>
                                <ul className="list-disc list-inside text-brand-sage space-y-0.5">
                                  {formula.packagingItems.map((pkg, idx) => (
                                    <li key={idx}>{typeof pkg.packaging === 'object' ? pkg.packaging.name : ''}: {pkg.quantityPcs} {t('common.pcs')}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {formula.costInfo && (
                            <div className="flex flex-wrap gap-2 text-xs bg-brand-sage/10 p-2 rounded-lg text-brand-forest dark:text-brand-sand">
                              <span>{t('formulas.unitCost')}: <strong>{formula.costInfo.totalUnitCost.toFixed(2)} {t('common.currency')}</strong></span>
                              <span>{t('formulas.sellingPrice')}: <strong>{formula.targetSellingPrice.toFixed(2)} {t('common.currency')}</strong></span>
                              <span className="text-emerald-600 font-bold">{t('formulas.profitPerUnit')}: {formula.costInfo.expectedMarginAmount.toFixed(2)} {t('common.currency')}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative w-full sm:max-w-2xl bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20">
              <h2 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand font-bold flex items-center gap-2">
                <ShoppingBag size={22} className="text-purple-500" />
                <span>{t('finishedProducts.addModalTitle')}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Column 1: Info & Inventory */}
              <div className="space-y-3">
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.nameLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('finishedProducts.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.categoryLabel')}</label>
                  <input
                    type="text"
                    placeholder="Haircare / Skincare / Tea"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.initialStock')}</label>
                    <input
                      type="number"
                      value={stockUnits}
                      onChange={(e) => setStockUnits(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 font-bold focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.thresholdLabel')}</label>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">
                    {t('finishedProducts.purchaseCostLabel')} ({t('common.currency')})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-500/40 outline-none"
                    placeholder={t('finishedProducts.purchaseCostPlaceholder')}
                  />
                </div>
              </div>

              {/* Column 2: 3 Selling Prices */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300/40 dark:border-purple-800/40 space-y-2.5">
                  <label className="block font-bold text-xs text-purple-900 dark:text-purple-200">
                    {t('finishedProducts.productSellingPricesTitle')}
                  </label>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price1Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice1}
                        onChange={(e) => setSellingPrice1(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price2Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice2}
                        onChange={(e) => setSellingPrice2(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price3Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sellingPrice3}
                        onChange={(e) => setSellingPrice3(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
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
                {createMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative w-full sm:max-w-2xl bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20">
              <h2 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand font-bold flex items-center gap-2">
                <Edit3 size={20} className="text-purple-500" />
                <span>{t('common.editProduct')}: {editTarget.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Column 1: Info & Inventory */}
              <div className="space-y-3">
                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.nameLabel')}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.categoryLabel')}</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.availableStockPcs')}</label>
                    <input
                      type="number"
                      value={editStockUnits}
                      onChange={(e) => setEditStockUnits(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 font-bold focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-sage mb-1.5 font-semibold">{t('finishedProducts.thresholdLabel')}</label>
                    <input
                      type="number"
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-purple-500/40 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1.5 font-semibold">
                    {t('finishedProducts.purchaseCostLabel')} ({t('common.currency')})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editPurchaseCost}
                    onChange={(e) => setEditPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-500/40 outline-none"
                  />
                </div>
              </div>

              {/* Column 2: 3 Selling Prices */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300/40 dark:border-purple-800/40 space-y-2.5">
                  <label className="block font-bold text-xs text-purple-900 dark:text-purple-200">
                    {t('finishedProducts.productSellingPricesTitle')}
                  </label>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price1Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice1}
                        onChange={(e) => setEditPrice1(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price2Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice2}
                        onChange={(e) => setEditPrice2(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-brand-sage mb-1 font-semibold">{t('sales.price3Label')} ({t('common.currency')})</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice3}
                        onChange={(e) => setEditPrice3(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-brand-sage/30 bg-white dark:bg-brand-slate text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500 outline-none"
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl">
            <h2 className="font-display text-lg text-red-600 dark:text-red-400 font-bold mb-2">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand mb-1">
              {t('common.confirmDeleteMsg')} ({deleteTarget.name})
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">{t('finishedProducts.deleteProductCascadeWarning')}</p>
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
