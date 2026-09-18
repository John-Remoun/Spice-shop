import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, Package, Trash2, ShoppingCart, Edit3, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface PackagingItem {
  _id: string;
  name: string;
  category: 'bottle' | 'jar' | 'cap' | 'sprayer' | 'bag' | 'label' | 'other';
  capacityMl?: number;
  stockPcs: number;
  weightedAverageCost: number;
  lowStockThresholdPcs: number;
  isActive: boolean;
}

export default function PackagingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PackagingItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PackagingItem | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<PackagingItem | null>(null);

  // Form states for creating packaging
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PackagingItem['category']>('bottle');
  const [capacityMl, setCapacityMl] = useState<number | ''>('');
  const [initialQtyPcs, setInitialQtyPcs] = useState(100);
  const [initialCost, setInitialCost] = useState(25);
  const [supplier, setSupplier] = useState('');
  const [threshold, setThreshold] = useState(50);

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<PackagingItem['category']>('bottle');
  const [editCapacityMl, setEditCapacityMl] = useState<number | ''>('');
  const [editStockPcs, setEditStockPcs] = useState(0);
  const [editCost, setEditCost] = useState(0);
  const [editThreshold, setEditThreshold] = useState(50);

  // Form states for extra purchase
  const [purchaseQty, setPurchaseQty] = useState(100);
  const [purchaseCost, setPurchaseCost] = useState(25);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  const { data: items = [], isLoading } = useQuery<PackagingItem[]>({
    queryKey: ['packaging'],
    queryFn: async () => (await apiClient.get<PackagingItem[]>('/packaging')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return (
        await apiClient.post('/packaging', {
          name,
          category,
          capacityMl: capacityMl === '' ? undefined : Number(capacityMl),
          lowStockThresholdPcs: threshold,
          initialQuantityPcs: initialQtyPcs,
          initialTotalCost: initialCost,
          supplier,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      setIsAddOpen(false);
      setName('');
      setCapacityMl('');
      setInitialQtyPcs(100);
      setInitialCost(25);
      setSupplier('');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      return (
        await apiClient.put(`/packaging/${editTarget._id}`, {
          name: editName,
          category: editCategory,
          capacityMl: editCapacityMl === '' ? undefined : Number(editCapacityMl),
          stockPcs: editStockPcs,
          weightedAverageCost: editCost,
          lowStockThresholdPcs: editThreshold,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/packaging/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      setDeleteTarget(null);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseTarget) return;
      return (
        await apiClient.post(`/packaging/${purchaseTarget._id}/purchase`, {
          quantityPcs: purchaseQty,
          totalCost: purchaseCost,
          supplier: purchaseSupplier,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      setPurchaseTarget(null);
    },
  });

  const handleOpenEdit = (item: PackagingItem) => {
    setEditTarget(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditCapacityMl(item.capacityMl ?? '');
    setEditStockPcs(item.stockPcs);
    setEditCost(item.weightedAverageCost);
    setEditThreshold(item.lowStockThresholdPcs);
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedItems: visibleItems,
    currentPage,
    totalPages,
    goToPage,
    totalItems,
  } = usePagination(filtered, 8);

  const lowStockCount = items.filter((i) => i.stockPcs <= i.lowStockThresholdPcs).length;
  const totalValuation = items.reduce((acc, i) => acc + i.stockPcs * i.weightedAverageCost, 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-brand-forest dark:text-brand-sand">
            {t('nav.packaging')}
          </h1>
          <p className="text-sm text-brand-sage">{t('packaging.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto text-sm"
        >
          <Plus size={16} />
          <span>{t('packaging.addBtn')}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('packaging.totalItems')}</p>
          <p className="text-xl font-display mt-1 text-brand-forest dark:text-brand-sand">{items.length}</p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('packaging.lowStockItems')}</p>
          <p className="text-xl font-display mt-1 flex items-center gap-1 text-amber-600">
            {lowStockCount > 0 && <AlertTriangle size={16} />}
            {lowStockCount}
          </p>
        </div>
        <div className="card-botanical p-3">
          <p className="text-xs text-brand-sage leading-tight">{t('packaging.valuation')}</p>
          <p className="text-sm font-display mt-1 text-brand-forest dark:text-brand-sand font-bold">
            {totalValuation.toFixed(0)} <span className="text-xs font-normal">{t('common.currency')}</span>
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
        <input
          type="text"
          placeholder={t('packaging.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
        />
      </div>

      {/* Content */}
      <div className="card-botanical overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-sage py-8 text-center">{t('packaging.noData')}</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {visibleItems.map((item) => {
                const isLow = item.stockPcs <= item.lowStockThresholdPcs;
                return (
                  <div
                    key={item._id}
                    className="p-3.5 rounded-xl border border-brand-sage/20 bg-white/50 dark:bg-brand-slate/40 space-y-2.5 shadow-sm"
                  >
                    {/* Name + Stock */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-brand-forest dark:text-brand-sand min-w-0">
                        <span className="p-1.5 rounded-lg bg-brand-sage/15 text-brand-forest dark:text-brand-sand shrink-0">
                          <Package size={15} />
                        </span>
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isLow
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-brand-sage/15 text-brand-forest dark:text-brand-sand'
                        }`}
                      >
                        {item.stockPcs.toLocaleString()} {t('common.pcs')}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-brand-sage/10 pt-2">
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">
                          {t('packaging.colCategory')}
                        </span>
                        <span className="font-medium text-brand-forest dark:text-brand-sand capitalize">
                          {item.category}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">
                          {t('packaging.colCapacity')}
                        </span>
                        <span className="font-medium text-brand-forest dark:text-brand-sand">
                          {item.capacityMl ? `${item.capacityMl} مل` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">
                          {t('packaging.colWac')}
                        </span>
                        <span className="font-mono font-medium text-brand-forest dark:text-brand-sand">
                          {item.weightedAverageCost.toFixed(2)} {t('common.currency')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-brand-sage uppercase tracking-wide mb-0.5">
                          {t('packaging.colThreshold')}
                        </span>
                        <span className="font-medium text-brand-forest dark:text-brand-sand">
                          {item.lowStockThresholdPcs} {t('common.pcs')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-brand-sage/10">
                      <button
                        onClick={() => setPurchaseTarget(item)}
                        className="px-2.5 py-1.5 text-xs rounded-lg bg-brand-forest text-brand-sand hover:opacity-90 inline-flex items-center gap-1 font-semibold"
                      >
                        <ShoppingCart size={12} />
                        <span>{t('common.extraPurchase')}</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
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
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colName')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colCategory')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colCapacity')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colStock')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colWac')}</th>
                    <th className="py-3 px-2 text-start font-medium">{t('packaging.colThreshold')}</th>
                    <th className="py-3 px-2 text-end font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const isLow = item.stockPcs <= item.lowStockThresholdPcs;
                    return (
                      <tr key={item._id} className="border-b border-brand-sage/10 hover:bg-brand-sage/5">
                        <td className="py-3 px-2 font-medium">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-brand-forest dark:text-brand-sand shrink-0" />
                            {item.name}
                          </div>
                        </td>
                        <td className="py-3 px-2 capitalize">{item.category}</td>
                        <td className="py-3 px-2 text-brand-sage">
                          {item.capacityMl ? `${item.capacityMl} مل` : '—'}
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          <span className={isLow ? 'text-red-600 font-bold' : ''}>
                            {item.stockPcs.toLocaleString()} {t('common.pcs')}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-brand-sage font-mono">
                          {item.weightedAverageCost.toFixed(2)} {t('common.currency')}
                        </td>
                        <td className="py-3 px-2 text-brand-sage">{item.lowStockThresholdPcs} {t('common.pcs')}</td>
                        <td className="py-3 px-2 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPurchaseTarget(item)}
                              className="px-2.5 py-1 text-xs rounded-organic bg-brand-forest text-brand-sand hover:opacity-90 inline-flex items-center gap-1"
                              title={t('packaging.purchaseModalTitle')}
                            >
                              <ShoppingCart size={13} />
                              <span>{t('common.extraPurchase')}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-organic transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
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

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20 shrink-0">
              <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand font-bold">
                {t('packaging.addModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('packaging.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.categoryLabel')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  >
                    <option value="bottle">{t('packaging.catBottle')}</option>
                    <option value="jar">{t('packaging.catJar')}</option>
                    <option value="cap">{t('packaging.catCap')}</option>
                    <option value="sprayer">{t('packaging.catSprayer')}</option>
                    <option value="bag">{t('packaging.catBag')}</option>
                    <option value="label">{t('packaging.catLabel')}</option>
                    <option value="other">{t('packaging.catOther')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.capacityLabel')}</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={capacityMl}
                    onChange={(e) => setCapacityMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.initialQtyLabel')}</label>
                  <input
                    type="number"
                    min={0}
                    value={initialQtyPcs}
                    onChange={(e) => setInitialQtyPcs(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.thresholdLabel')}</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.initialCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={initialCost}
                  onChange={(e) => setInitialCost(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('rawMaterials.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder="شركة العبوات والزجاج"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={!name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('packaging.savePackaging')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20 shrink-0">
              <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand font-bold">
                {t('common.editPackaging')}
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.nameLabel')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.categoryLabel')}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  >
                    <option value="bottle">{t('packaging.catBottle')}</option>
                    <option value="jar">{t('packaging.catJar')}</option>
                    <option value="cap">{t('packaging.catCap')}</option>
                    <option value="sprayer">{t('packaging.catSprayer')}</option>
                    <option value="bag">{t('packaging.catBag')}</option>
                    <option value="label">{t('packaging.catLabel')}</option>
                    <option value="other">{t('packaging.catOther')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.capacityLabel')}</label>
                  <input
                    type="number"
                    value={editCapacityMl}
                    onChange={(e) => setEditCapacityMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('common.currentStock')} ({t('common.pcs')})</label>
                  <input
                    type="number"
                    min={0}
                    value={editStockPcs}
                    onChange={(e) => setEditStockPcs(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('common.costPerPiece')} ({t('common.currency')})</label>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.thresholdLabel')}</label>
                <input
                  type="number"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm font-medium"
              >
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

      {/* Purchase Modal */}
      {purchaseTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-sage/20 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand-forest dark:text-brand-sand" />
                <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand font-bold">
                  {t('common.addSupply')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseTarget(null)}
                className="p-1.5 rounded-lg text-brand-sage hover:text-brand-forest dark:hover:text-brand-sand hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-brand-sage mt-1 shrink-0">{purchaseTarget.name}</p>

            <div className="overflow-y-auto flex-1 py-4 space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('packaging.qtyPcs')}</label>
                <input
                  type="number"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('common.totalSupplyPrice')} ({t('common.currency')})</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-semibold text-xs">{t('rawMaterials.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder="شركة الزجاج والعبوات"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 focus:ring-2 focus:ring-brand-forest outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-sage/20 shrink-0">
              <button
                onClick={() => setPurchaseTarget(null)}
                className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={purchaseQty <= 0 || purchaseMutation.isPending}
                onClick={() => purchaseMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {purchaseMutation.isPending ? t('common.loading') : t('packaging.savePurchase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-2xl">
            <h2 className="font-display text-lg text-red-600 dark:text-red-400 font-bold mb-2">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand mb-4">
              {t('common.confirmDeleteMsg')} ({deleteTarget.name})
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm font-medium"
              >
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
