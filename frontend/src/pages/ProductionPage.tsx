import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Factory, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface FormulaOption {
  _id: string;
  name: string;
  finishedProduct?: { name: string };
}

interface BatchResult {
  _id: string;
  quantityProduced: number;
  totalCost: number;
  unitCostAtProduction: number;
}

export default function ProductionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formulaId, setFormulaId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [justCompleted, setJustCompleted] = useState(false);

  const { data: formulas } = useQuery({
    queryKey: ['formulas'],
    queryFn: async () => (await apiClient.get<FormulaOption[]>('/formulas')).data,
  });

  const runBatch = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<BatchResult>('/production-batches', {
          formulaId,
          quantityToProduce: quantity,
        })
      ).data,
    onSuccess: () => {
      setJustCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      setTimeout(() => setJustCompleted(false), 3000);
    },
  });

  const shortages =
    runBatch.isError &&
    (runBatch.error as { response?: { data?: { shortages?: { name: string; needed: number; available: number; unit: string }[] } } })
      ?.response?.data?.shortages;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand flex items-center gap-2">
          <Factory size={24} /> {t('production.runBatch')}
        </h1>
        <p className="text-sm text-brand-sage">{t('production.subtitle')}</p>
      </div>

      <div className="card-botanical space-y-4 relative overflow-hidden">
        <AnimatePresence>
          {justCompleted && (
            <motion.div
              key="liquid-fill"
              initial={{ height: '0%', opacity: 0.85 }}
              animate={{ height: '100%', opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute bottom-0 start-0 w-full bg-brand-sage/40 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="relative">
          <label className="text-sm block mb-1 font-medium">{t('production.formulaLabel')}</label>
          <select
            value={formulaId}
            onChange={(e) => setFormulaId(e.target.value)}
            className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm"
          >
            <option value="">{t('production.selectFormula')}</option>
            {formulas?.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} {f.finishedProduct ? `(${t('production.productLabel')} ${f.finishedProduct.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-sm block mb-1 font-medium">{t('production.quantity')} ({t('common.pcs')})</label>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/60 dark:bg-brand-slate/60 text-sm"
          />
        </div>

        <button
          disabled={!formulaId || runBatch.isPending}
          onClick={() => runBatch.mutate()}
          className="btn-primary w-full relative disabled:opacity-60 font-semibold py-2.5 text-sm"
        >
          {runBatch.isPending ? t('common.loading') : t('production.runBtn')}
        </button>

        {shortages && (
          <div className="text-sm text-red-600 space-y-1 p-3 bg-red-50 dark:bg-red-950/40 rounded-organic border border-red-200">
            <p className="font-bold flex items-center gap-1">
              <AlertCircle size={16} /> {t('production.insufficientStock')}
            </p>
            {shortages.map((s, i) => (
              <p key={i} className="text-xs">
                • {s.name}: {s.needed} {s.unit} / {s.available} {s.unit}
              </p>
            ))}
          </div>
        )}

        {runBatch.isSuccess && (
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-organic text-xs space-y-1 font-medium">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>{t('production.success')} (+{runBatch.data.quantityProduced} {t('common.pcs')})</span>
            </div>
            <p className="ps-6 rtl:pr-6 rtl:pl-0">
              {t('formulas.unitCost')}: <strong>{runBatch.data.unitCostAtProduction.toFixed(2)} {t('common.currency')}</strong> — {t('common.total')}: <strong>{runBatch.data.totalCost.toFixed(2)} {t('common.currency')}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
