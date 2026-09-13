import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, Package, Trash2, ShoppingCart, Edit3 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand">
            {t('nav.packaging')}
          </h1>
          <p className="text-sm text-brand-sage">{t('packaging.subtitle')}</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>{t('packaging.addBtn')}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('packaging.totalItems')}</p>
          <p className="text-2xl font-display mt-1 text-brand-forest dark:text-brand-sand">{items.length}</p>
        </div>
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('packaging.lowStockItems')}</p>
          <p className="text-2xl font-display mt-1 flex items-center gap-2 text-amber-600">
            {lowStockCount > 0 && <AlertTriangle size={20} />}
            {lowStockCount}
          </p>
        </div>
        <div className="card-botanical">
          <p className="text-sm text-brand-sage">{t('packaging.valuation')}</p>
          <p className="text-2xl font-display mt-1 text-brand-forest dark:text-brand-sand">
            {totalValuation.toFixed(2)} {t('common.currency')}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={t('packaging.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card-botanical overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-brand-sage py-4 text-center">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-sage py-4 text-center">{t('packaging.noData')}</p>
        ) : (
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
                    <td className="py-3 px-2 font-medium flex items-center gap-2">
                      <Package size={14} className="text-brand-forest dark:text-brand-sand shrink-0" />
                      {item.name}
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
                    <td className="py-3 px-2 text-brand-sage font-mono">{item.weightedAverageCost.toFixed(2)} {t('common.currency')}</td>
                    <td className="py-3 px-2 text-brand-sage">{item.lowStockThresholdPcs} قطعة</td>
                    <td className="py-3 px-2 text-end flex items-center justify-end gap-2">
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

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand">
              {t('packaging.addModalTitle')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('packaging.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1">{t('packaging.categoryLabel')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  >
                    <option value="bottle">زجاجة / Bottle</option>
                    <option value="jar">برطمان / Jar</option>
                    <option value="cap">غطاء / قطّارة / Cap</option>
                    <option value="sprayer">بخاخ / Sprayer</option>
                    <option value="bag">كيس / Bag</option>
                    <option value="label">ملصق / Label</option>
                    <option value="other">أخرى / Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-brand-sage mb-1">{t('packaging.capacityLabel')}</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={capacityMl}
                    onChange={(e) => setCapacityMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.initialQtyLabel')}</label>
                <input
                  type="number"
                  min={0}
                  value={initialQtyPcs}
                  onChange={(e) => setInitialQtyPcs(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.initialCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={initialCost}
                  onChange={(e) => setInitialCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('rawMaterials.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder="شركة العبوات والزجاج"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.thresholdLabel')}</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
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
                {createMutation.isPending ? t('common.loading') : t('packaging.savePackaging')}
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
              {t('common.editPackaging')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.nameLabel')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1">{t('packaging.categoryLabel')}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
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
                  <label className="block text-brand-sage mb-1">{t('packaging.capacityLabel')}</label>
                  <input
                    type="number"
                    value={editCapacityMl}
                    onChange={(e) => setEditCapacityMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1">{t('common.currentStock')} ({t('common.pcs')})</label>
                  <input
                    type="number"
                    min={0}
                    value={editStockPcs}
                    onChange={(e) => setEditStockPcs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
                <div>
                  <label className="block text-brand-sage mb-1">{t('common.costPerPiece')} ({t('common.currency')})</label>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.thresholdLabel')}</label>
                <input
                  type="number"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
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

      {/* Additional Purchase Modal */}
      {purchaseTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand">
              {t('common.addSupply')}: {purchaseTarget.name}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1">{t('packaging.qtyPcs')}</label>
                <input
                  type="number"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1">{t('common.totalSupplyPrice')} ({t('common.currency')})</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1">{t('rawMaterials.supplierLabel')}</label>
                <input
                  type="text"
                  placeholder="شركة الزجاج والعبوات"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPurchaseTarget(null)} className="px-4 py-2 rounded-organic border border-brand-sage/30 text-sm">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-red-600 dark:text-red-400 font-bold">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand">
              {t('common.confirmDeleteMsg')} ({deleteTarget.name})
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
