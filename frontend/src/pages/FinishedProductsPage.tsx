import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingBag, Search, AlertTriangle, Trash2, Edit3, ChevronDown, ChevronUp, FlaskConical, Eye } from 'lucide-react';
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

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice1, setEditPrice1] = useState(25);
  const [editPrice2, setEditPrice2] = useState(30);
  const [editPrice3, setEditPrice3] = useState(35);
  const [editStockUnits, setEditStockUnits] = useState(0);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand">
            {t('nav.finishedProducts')}
          </h1>
          <p className="text-sm text-brand-sage">
            {t('finishedProducts.subtitle')}
          </p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>{t('finishedProducts.addBtn')}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('finishedProducts.totalSkus')}</p>
          <p className="text-2xl font-display mt-1 text-brand-forest dark:text-brand-sand">{products.length}</p>
        </div>
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('finishedProducts.readyStock')}</p>
          <p className="text-2xl font-display mt-1 text-brand-forest dark:text-brand-sand">{totalStockUnits} قطعة</p>
        </div>
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('finishedProducts.lowStockAlerts')}</p>
          <p className="text-2xl font-display mt-1 flex items-center gap-2 text-amber-600">
            {lowStockCount > 0 && <AlertTriangle size={20} />}
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
        <input
          type="text"
          placeholder={t('finishedProducts.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
        />
      </div>

      {/* Product Catalog List */}
      <div className="card-botanical overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-brand-sage py-4 text-center">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-sage py-4 text-center">{t('finishedProducts.noData')}</p>
        ) : (
          <table className="w-full text-start text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-sage/20 text-brand-forest dark:text-brand-sand text-start">
                <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colName')}</th>
                <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colCategory')}</th>
                <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colStock')}</th>
                <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colCost')}</th>
                <th className="py-3 px-2 text-start font-medium">{t('finishedProducts.colPrice')}</th>
                <th className="py-3 px-2 text-start font-medium">التركيبات المرتبطة</th>
                <th className="py-3 px-2 text-end font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((p) => {
                const isLow = p.stockUnits <= p.lowStockThresholdUnits;
                const linkedFormulas = formulas.filter(
                  (f) => f.finishedProduct?._id === p._id
                );
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
                    <td className="py-3 px-2 text-end flex items-center justify-end gap-2">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={totalItems}
          itemsPerPage={8}
        />
      </div>

      {/* Expanded Linked Formulas Detail Modal / Drawer */}
      {expandedProductId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-2xl space-y-4 shadow-2xl my-8">
            {(() => {
              const currentProd = products.find((p) => p._id === expandedProductId);
              const linkedFormulas = formulas.filter((f) => f.finishedProduct?._id === expandedProductId);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-brand-sage/20 pb-3">
                    <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand flex items-center gap-2">
                      <ShoppingBag size={20} /> {t('finishedProducts.productFormulasTitle')} {currentProd?.name}
                    </h2>
                    <button
                      onClick={() => setExpandedProductId(null)}
                      className="px-3 py-1 text-xs rounded border border-brand-sage/30"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>

                  {linkedFormulas.length === 0 ? (
                    <div className="text-center py-6 text-brand-sage text-sm">
                      <FlaskConical size={28} className="mx-auto mb-2 opacity-50" />
                      <p>{t('finishedProducts.noFormulasForProduct')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                      {linkedFormulas.map((formula) => (
                        <div key={formula._id} className="p-4 rounded-organic bg-white/70 dark:bg-brand-slate/70 border border-brand-sage/20 space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-base text-brand-forest dark:text-brand-sand flex items-center gap-2">
                              <FlaskConical size={16} /> {formula.name}
                            </h3>
                            {formula.costInfo && (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                {t('formulas.margin')} {formula.costInfo.expectedMarginPct.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs border-t border-brand-sage/10 pt-2">
                            <div>
                              <p className="font-semibold mb-1 text-brand-forest dark:text-brand-sand">{t('formulas.rawMaterialsHeader')}</p>
                              <ul className="list-disc list-inside text-brand-sage space-y-0.5">
                                {formula.materials.map((m, idx) => (
                                  <li key={idx}>
                                    {typeof m.rawMaterial === 'object' ? m.rawMaterial.name : ''}: {m.quantityBase} {typeof m.rawMaterial === 'object' ? m.rawMaterial.baseUnit : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {formula.packagingItems.length > 0 && (
                              <div>
                                <p className="font-semibold mb-1 text-brand-forest dark:text-brand-sand">{t('formulas.packagingHeader')}</p>
                                <ul className="list-disc list-inside text-brand-sage space-y-0.5">
                                  {formula.packagingItems.map((pkg, idx) => (
                                    <li key={idx}>
                                      {typeof pkg.packaging === 'object' ? pkg.packaging.name : ''}: {pkg.quantityPcs} {t('common.pcs')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {formula.costInfo && (
                            <div className="flex justify-between items-center text-xs bg-brand-sage/10 p-2 rounded text-brand-forest dark:text-brand-sand pt-2">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand">
              {t('finishedProducts.addModalTitle')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1">{t('finishedProducts.nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('finishedProducts.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-medium">{t('finishedProducts.categoryLabel')}</label>
                <input
                  type="text"
                  placeholder="Haircare / Skincare / Tea"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-bold text-brand-forest dark:text-brand-sand">{t('finishedProducts.productSellingPricesTitle')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price1Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={sellingPrice1}
                      onChange={(e) => setSellingPrice1(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price2Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={sellingPrice2}
                      onChange={(e) => setSellingPrice2(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price3Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={sellingPrice3}
                      onChange={(e) => setSellingPrice3(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1">{t('finishedProducts.initialStock')}</label>
                  <input
                    type="number"
                    value={stockUnits}
                    onChange={(e) => setStockUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1">{t('finishedProducts.thresholdLabel')}</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-organic border border-brand-sage/30 text-sm">
                {t('common.cancel')}
              </button>
              <button
                disabled={!name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand">
              {t('common.editProduct')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1">{t('finishedProducts.nameLabel')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('finishedProducts.categoryLabel')}</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-bold text-brand-forest dark:text-brand-sand">{t('finishedProducts.productSellingPricesTitle')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price1Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editPrice1}
                      onChange={(e) => setEditPrice1(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price2Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editPrice2}
                      onChange={(e) => setEditPrice2(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price3Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editPrice3}
                      onChange={(e) => setEditPrice3(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1">{t('finishedProducts.availableStockPcs')}</label>
                  <input
                    type="number"
                    value={editStockUnits}
                    onChange={(e) => setEditStockUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1">{t('finishedProducts.thresholdLabel')}</label>
                  <input
                    type="number"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-organic border border-brand-sage/30 text-sm">
                {t('common.cancel')}
              </button>
              <button
                disabled={!editName || editMutation.isPending}
                onClick={() => editMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {editMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-red-600 dark:text-red-400 font-bold">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand">
              {t('common.confirmDeleteMsg')} ({deleteTarget.name}) — {t('finishedProducts.deleteProductCascadeWarning')}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-organic border border-brand-sage/30 text-sm">
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                className="px-4 py-2 rounded-organic bg-red-600 text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50"
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
