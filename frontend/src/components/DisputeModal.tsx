import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import type { Expense } from '../lib/contract';
import type { TranslationKey } from '../lib/i18n';

interface DisputeModalProps {
  expense: Expense;
  onSubmit: (expenseId: string, amount: number, category: string, description: string) => void;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

const DISPUTE_CATEGORIES = [
  { value: 'WRONG_AMOUNT', labelKey: 'group.dispute_category_wrong_amount' },
  { value: 'WRONG_PAYER',  labelKey: 'group.dispute_category_wrong_payer' },
  { value: 'DUPLICATE',    labelKey: 'group.dispute_category_duplicate' },
  { value: 'OTHER',        labelKey: 'group.dispute_category_other' },
] as const;

export default function DisputeModal({ expense, onSubmit, onClose, t }: DisputeModalProps) {
  const [category, setCategory] = useState<string>('WRONG_AMOUNT');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountXlm = (expense.amount / 10_000_000).toFixed(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      onSubmit(expense.id.toString(), expense.amount, category, description.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#0e1118]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient orbs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/[0.04] rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-black text-base tracking-tight">{t('group.dispute_modal_title')}</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                  {t('group.dispute_initiate')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/[0.07] border border-white/[0.08] transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Expense summary */}
          <div className="relative bg-white/[0.025] border border-white/[0.07] rounded-2xl p-4 mb-6">
            <p className="font-bold text-sm truncate">{expense.description}</p>
            <p className="text-[10px] text-amber-400 font-black mt-1 uppercase tracking-widest">
              {amountXlm} XLM
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t('group.dispute_category_label')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DISPUTE_CATEGORIES.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                      category === value
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                        : 'bg-white/[0.04] border border-white/[0.08] text-foreground/70 hover:bg-white/[0.07]'
                    }`}
                  >
                    {t(labelKey as TranslationKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t('group.dispute_description_label')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('group.dispute_description_placeholder')}
                rows={3}
                required
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-foreground/70 hover:bg-white/[0.07] rounded-xl font-bold text-sm transition-all"
              >
                {t('group.cancel') ?? 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!description.trim() || submitting}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(245,158,11,0.25)]"
              >
                {submitting ? '...' : t('group.dispute_submit')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
