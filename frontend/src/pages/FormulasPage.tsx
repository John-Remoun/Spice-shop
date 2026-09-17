import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, FlaskConical, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface MaterialLine {
  rawMaterial?: {
    _id: string;
    name: string;
    baseUnit: 'ml' | 'g';
    weightedAverageCost: number;
  } | string | null;
  quantityBase: number;
}

interface PackagingLine {
  packaging?: {
    _id: string;
    name: string;
    weightedAverageCost: number;
  } | string | null;
  quantityPcs: number;
}

interface FormulaCostInfo {
  materialsCost: number;
  packagingCost: number;
  totalUnitCost: number;
  targetSellingPrice: number;
  expectedMarginAmount: number;
  expectedMarginPct: number;
}

interface Formula {
  _id: string;
  name: string;
  finishedProduct?: { _id: string; name: string; sellingPrice: number; sellingPrice1?: number; sellingPrice2?: number; sellingPrice3?: number };
  yieldPerBatchUnit: number;
  materials: MaterialLine[];
  packagingItems: PackagingLine[];
  targetSellingPrice: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  notes?: string;
  costInfo?: FormulaCostInfo;
}

interface RawMaterialOption {
  _id: string;
  name: string;
  baseUnit: 'ml' | 'g';
}

interface PackagingOption {
  _id: string;
  name: string;
}

export default function FormulasPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Formula | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Formula | null>(null);

  // New formula form state
  const [name, setName] = useState('');
  const [yieldUnits, setYieldUnits] = useState(100);
  const [sellingPrice1, setSellingPrice1] = useState<number>(20);
  const [sellingPrice2, setSellingPrice2] = useState<number>(25);
  const [sellingPrice3, setSellingPrice3] = useState<number>(30);
  const [notes, setNotes] = useState('');

  const [selectedMaterials, setSelectedMaterials] = useState<{ rawMaterial: string; quantityBase: number }[]>([
    { rawMaterial: '', quantityBase: 10 },
  ]);
  const [selectedPackaging, setSelectedPackaging] = useState<{ packaging: string; quantityPcs: number }[]>([
    { packaging: '', quantityPcs: 1 },
  ]);

  // Edit formula form state
  const [editName, setEditName] = useState('');
  const [editSellingPrice1, setEditSellingPrice1] = useState<number>(20);
  const [editSellingPrice2, setEditSellingPrice2] = useState<number>(25);
  const [editSellingPrice3, setEditSellingPrice3] = useState<number>(30);
  const [editYieldUnits, setEditYieldUnits] = useState(100);
  const [editNotes, setEditNotes] = useState('');
  const [editMaterials, setEditMaterials] = useState<{ rawMaterial: string; quantityBase: number }[]>([]);
  const [editPackaging, setEditPackaging] = useState<{ packaging: string; quantityPcs: number }[]>([]);

  const { data: formulas = [], isLoading, error: formulasError } = useQuery<Formula[]>({
    queryKey: ['formulas'],
    queryFn: async () => (await apiClient.get<Formula[]>('/formulas')).data,
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterialOption[]>({
    queryKey: ['raw-materials'],
    queryFn: async () => (await apiClient.get<RawMaterialOption[]>('/raw-materials')).data,
  });

  const { data: packagingItems = [] } = useQuery<PackagingOption[]>({
    queryKey: ['packaging'],
    queryFn: async () => (await apiClient.get<PackagingOption[]>('/packaging')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validMaterials = selectedMaterials.filter((m) => m.rawMaterial && m.quantityBase > 0);
      const validPackaging = selectedPackaging.filter((p) => p.packaging && p.quantityPcs > 0);

      return (
        await apiClient.post('/formulas', {
          name,
          yieldPerBatchUnit: yieldUnits,
          targetSellingPrice: sellingPrice1,
          sellingPrice1,
          sellingPrice2,
          sellingPrice3,
          notes,
          materials: validMaterials,
          packagingItems: validPackaging,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      setIsAddOpen(false);
      setName('');
      setYieldUnits(100);
      setSellingPrice1(20);
      setSellingPrice2(25);
      setSellingPrice3(30);
      setSelectedMaterials([{ rawMaterial: '', quantityBase: 10 }]);
      setSelectedPackaging([{ packaging: '', quantityPcs: 1 }]);
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const validMaterials = editMaterials.filter((m) => m.rawMaterial && m.quantityBase > 0);
      const validPackaging = editPackaging.filter((p) => p.packaging && p.quantityPcs > 0);

      return (
        await apiClient.put(`/formulas/${editTarget._id}`, {
          name: editName,
          yieldPerBatchUnit: editYieldUnits,
          targetSellingPrice: editSellingPrice1,
          sellingPrice1: editSellingPrice1,
          sellingPrice2: editSellingPrice2,
          sellingPrice3: editSellingPrice3,
          notes: editNotes,
          materials: validMaterials,
          packagingItems: validPackaging,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/formulas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      setDeleteTarget(null);
    },
  });

  const handleOpenEdit = (formula: Formula) => {
    setEditTarget(formula);
    setEditName(formula.name);
    const p1 = formula.sellingPrice1 ?? formula.targetSellingPrice ?? 20;
    const p2 = formula.sellingPrice2 ?? p1;
    const p3 = formula.sellingPrice3 ?? p1;
    setEditSellingPrice1(p1);
    setEditSellingPrice2(p2);
    setEditSellingPrice3(p3);
    setEditYieldUnits(formula.yieldPerBatchUnit || 100);
    setEditNotes(formula.notes || '');

    setEditMaterials(
      (formula.materials || []).map((m) => ({
        rawMaterial: (m.rawMaterial && typeof m.rawMaterial === 'object') ? m.rawMaterial._id : (m.rawMaterial as string || ''),
        quantityBase: m.quantityBase || 0,
      }))
    );

    setEditPackaging(
      (formula.packagingItems || []).map((p) => ({
        packaging: (p.packaging && typeof p.packaging === 'object') ? p.packaging._id : (p.packaging as string || ''),
        quantityPcs: p.quantityPcs || 0,
      }))
    );
  };

  const getRmName = (m: MaterialLine) => {
    if (m.rawMaterial && typeof m.rawMaterial === 'object') {
      return m.rawMaterial.name || 'مادة خام';
    }
    return 'مادة خام';
  };

  const getRmUnit = (m: MaterialLine) => {
    if (m.rawMaterial && typeof m.rawMaterial === 'object') {
      return m.rawMaterial.baseUnit || '';
    }
    return '';
  };

  const getPkgName = (p: PackagingLine) => {
    if (p.packaging && typeof p.packaging === 'object') {
      return p.packaging.name || 'مادة تعبئة';
    }
    return 'مادة تعبئة';
  };

  const filtered = (formulas || []).filter((f) =>
    (f.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedItems: visibleFormulas,
    currentPage,
    totalPages,
    goToPage,
    totalItems,
  } = usePagination(filtered, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand font-bold">
            {t('formulas.title')}
          </h1>
          <p className="text-sm text-brand-sage">{t('formulas.subtitle')}</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>{t('formulas.createBtn')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
        <input
          type="text"
          placeholder={t('formulas.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
        />
      </div>

      {/* Formula Cards */}
      {isLoading ? (
        <p className="text-sm text-brand-sage text-center py-6">{t('common.loading')}</p>
      ) : formulasError ? (
        <div className="card-botanical text-center py-8 text-rose-600 dark:text-rose-400">
          <p className="text-sm font-semibold">حدث خطأ في تحميل التركيبات. يرجى المحاولة مرة أخرى.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-botanical text-center py-8">
          <FlaskConical size={32} className="mx-auto text-brand-sage mb-2" />
          <p className="text-sm text-brand-sage">{t('formulas.noData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleFormulas.map((formula) => {
            const cost = formula.costInfo;
            const marginPct = cost ? (cost.expectedMarginPct || 0) : 0;
            const unitCost = cost ? (cost.totalUnitCost || 0) : 0;
            const profitAmount = cost ? (cost.expectedMarginAmount || 0) : 0;

            return (
              <div key={formula._id} className="card-botanical space-y-4 flex flex-col justify-between relative group">
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-xl text-brand-forest dark:text-brand-sand flex items-center gap-2 font-bold">
                        <FlaskConical size={20} />
                        {formula.name}
                      </h3>
                      <p className="text-xs text-brand-sage mt-1">
                        {t('formulas.producedQty')}: <span className="font-semibold text-brand-forest dark:text-brand-sand">{formula.yieldPerBatchUnit || 100} {t('common.pcs')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {marginPct.toFixed(1)}% {t('formulas.margin')}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(formula)}
                        className="p-1.5 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20 rounded-organic transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(formula)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-organic transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Ingredients breakdown per single unit */}
                  <div className="mt-4 space-y-3 text-xs border-t border-brand-sage/10 pt-3">
                    {formula.materials && formula.materials.length > 0 && (
                      <div>
                        <p className="font-bold text-brand-forest dark:text-brand-sand mb-1">{t('formulas.rawMaterialsHeader')}</p>
                        <ul className="list-disc list-inside text-brand-sage space-y-1 pr-2 rtl:pr-2 rtl:pl-0 ltr:pl-2 ltr:pr-0">
                          {formula.materials.map((m, idx) => (
                            <li key={idx}>
                              {getRmName(m)} : <span className="font-bold">{m.quantityBase} {getRmUnit(m)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {formula.packagingItems && formula.packagingItems.length > 0 && (
                      <div>
                        <p className="font-bold text-brand-forest dark:text-brand-sand mb-1">{t('formulas.packagingHeader')}</p>
                        <ul className="list-disc list-inside text-brand-sage space-y-1 pr-2 rtl:pr-2 rtl:pl-0 ltr:pl-2 ltr:pr-0">
                          {formula.packagingItems.map((p, idx) => (
                            <li key={idx}>
                              {getPkgName(p)} : <span className="font-bold">{p.quantityPcs} {t('common.pcs')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Metric Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-brand-sage/20 text-center text-xs">
                  <div className="bg-brand-sage/10 p-2.5 rounded-2xl flex flex-col justify-center items-center">
                    <span className="text-brand-sage block mb-1 font-semibold">{t('formulas.unitCost')}</span>
                    <span className="font-bold text-brand-forest dark:text-brand-sand text-sm">{unitCost.toFixed(2)} {t('common.currency')}</span>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2.5 rounded-2xl flex flex-col justify-center items-center">
                    <span className="text-amber-800 dark:text-amber-300 block mb-1 font-bold">أسعار البيع (1 / 2 / 3)</span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-100">
                      <span className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">س1: {formula.sellingPrice1 ?? formula.targetSellingPrice}</span>
                      <span className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">س2: {formula.sellingPrice2 ?? formula.sellingPrice1 ?? formula.targetSellingPrice}</span>
                      <span className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">س3: {formula.sellingPrice3 ?? formula.sellingPrice1 ?? formula.targetSellingPrice}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-2.5 rounded-2xl flex flex-col justify-center items-center">
                    <span className="text-emerald-800 dark:text-emerald-300 block mb-1 font-semibold">{t('formulas.profitPerUnit')} (س1)</span>
                    <span className="font-bold text-emerald-600 text-sm">{((formula.sellingPrice1 ?? formula.targetSellingPrice ?? 0) - unitCost).toFixed(2)} {t('common.currency')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={totalItems}
            itemsPerPage={6}
          />
        </div>
      )}

      {/* Modal Add Formula */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-xl space-y-4 shadow-xl my-8">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand font-bold">
              {t('formulas.addModalTitle')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-medium">{t('formulas.nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('formulas.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-medium">{t('formulas.producedQty')}</label>
                <input
                  type="number"
                  min={1}
                  value={yieldUnits}
                  onChange={(e) => setYieldUnits(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-bold text-brand-forest dark:text-brand-sand">{t('formulas.formulaSellingPricesTitle')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.price1Label')} ({t('common.currency')})</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={sellingPrice1}
                      onChange={(e) => setSellingPrice1(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
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
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
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
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Materials Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-brand-forest dark:text-brand-sand font-bold">
                    {t('formulas.materialsTitle')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedMaterials([...selectedMaterials, { rawMaterial: '', quantityBase: 10 }])}
                    className="text-xs text-brand-forest dark:text-brand-sand font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> {t('formulas.addMaterial')}
                  </button>
                </div>
                {selectedMaterials.map((line, i) => {
                  const selectedRm = rawMaterials.find((rm) => rm._id === line.rawMaterial);
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <select
                        value={line.rawMaterial}
                        onChange={(e) => {
                          const copy = [...selectedMaterials];
                          copy[i].rawMaterial = e.target.value;
                          setSelectedMaterials(copy);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                      >
                        <option value="">{t('formulas.selectMaterial')}</option>
                        {rawMaterials.map((rm) => (
                          <option key={rm._id} value={rm._id}>
                            {rm.name} ({rm.baseUnit})
                          </option>
                        ))}
                      </select>
                      <div className="relative w-28">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={line.quantityBase}
                          onChange={(e) => {
                            const copy = [...selectedMaterials];
                            copy[i].quantityBase = Number(e.target.value);
                            setSelectedMaterials(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs pl-8"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-sage font-bold">
                          {selectedRm?.baseUnit || ''}
                        </span>
                      </div>
                      {selectedMaterials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedMaterials(selectedMaterials.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Packaging Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-brand-forest dark:text-brand-sand font-bold">
                    {t('formulas.packagingTitle')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedPackaging([...selectedPackaging, { packaging: '', quantityPcs: 1 }])}
                    className="text-xs text-brand-forest dark:text-brand-sand font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> {t('formulas.addPackaging')}
                  </button>
                </div>
                {selectedPackaging.map((line, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select
                      value={line.packaging}
                      onChange={(e) => {
                        const copy = [...selectedPackaging];
                        copy[i].packaging = e.target.value;
                        setSelectedPackaging(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                    >
                      <option value="">{t('formulas.selectPackaging')}</option>
                      {packagingItems.map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="pcs"
                      value={line.quantityPcs}
                      onChange={(e) => {
                        const copy = [...selectedPackaging];
                        copy[i].quantityPcs = Number(e.target.value);
                        setSelectedPackaging(copy);
                      }}
                      className="w-24 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                    />
                    {selectedPackaging.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPackaging(selectedPackaging.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
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

      {/* Edit Formula Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-organic p-6 w-full max-w-xl space-y-4 shadow-xl my-8">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand font-bold">
              {t('formulas.editModalTitle')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-medium">{t('formulas.nameLabel')}</label>
                <input
                  type="text"
                  disabled
                  value={editName}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-gray-100 dark:bg-brand-slate/40 text-brand-sage cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-medium">{t('formulas.producedQty')}</label>
                <input
                  type="number"
                  disabled
                  value={editYieldUnits}
                  className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-gray-100 dark:bg-brand-slate/40 text-brand-sage cursor-not-allowed font-medium"
                />
                <p className="text-[11px] text-brand-sage/80 mt-1">
                  * اسم التركيبة وكمية وجبة الإنتاج ثابتتان ولا يمكن تغييرهما بعد الإضافة. يمكنك تعديل الأسعار والمواد المستخدمة أدناه.
                </p>
              </div>

              <div>
                <label className="block text-brand-sage mb-1 font-bold text-brand-forest dark:text-brand-sand">أسعار البيع للتركيبة</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">سعر 1 (ج.م)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editSellingPrice1}
                      onChange={(e) => setEditSellingPrice1(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">سعر 2 (ج.م)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editSellingPrice2}
                      onChange={(e) => setEditSellingPrice2(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">سعر 3 (ج.م)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editSellingPrice3}
                      onChange={(e) => setEditSellingPrice3(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Materials Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-brand-forest dark:text-brand-sand font-bold">
                    {t('formulas.materialsTitle')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditMaterials([...editMaterials, { rawMaterial: '', quantityBase: 10 }])}
                    className="text-xs text-brand-forest dark:text-brand-sand font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> {t('formulas.addMaterial')}
                  </button>
                </div>
                {editMaterials.map((line, i) => {
                  const selectedRm = rawMaterials.find((rm) => rm._id === line.rawMaterial);
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <select
                        value={line.rawMaterial}
                        onChange={(e) => {
                          const copy = [...editMaterials];
                          copy[i].rawMaterial = e.target.value;
                          setEditMaterials(copy);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                      >
                        <option value="">{t('formulas.selectMaterial')}</option>
                        {rawMaterials.map((rm) => (
                          <option key={rm._id} value={rm._id}>
                            {rm.name} ({rm.baseUnit})
                          </option>
                        ))}
                      </select>
                      <div className="relative w-28">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={line.quantityBase}
                          onChange={(e) => {
                            const copy = [...editMaterials];
                            copy[i].quantityBase = Number(e.target.value);
                            setEditMaterials(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs pl-8"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-sage font-bold">
                          {selectedRm?.baseUnit || ''}
                        </span>
                      </div>
                      {editMaterials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditMaterials(editMaterials.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Packaging Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-brand-forest dark:text-brand-sand font-bold">
                    {t('formulas.packagingTitle')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPackaging([...editPackaging, { packaging: '', quantityPcs: 1 }])}
                    className="text-xs text-brand-forest dark:text-brand-sand font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> {t('formulas.addPackaging')}
                  </button>
                </div>
                {editPackaging.map((line, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select
                      value={line.packaging}
                      onChange={(e) => {
                        const copy = [...editPackaging];
                        copy[i].packaging = e.target.value;
                        setEditPackaging(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                    >
                      <option value="">{t('formulas.selectPackaging')}</option>
                      {packagingItems.map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="pcs"
                      value={line.quantityPcs}
                      onChange={(e) => {
                        const copy = [...editPackaging];
                        copy[i].quantityPcs = Number(e.target.value);
                        setEditPackaging(copy);
                      }}
                      className="w-24 px-3 py-1.5 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-xs"
                    />
                    {editPackaging.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditPackaging(editPackaging.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
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
