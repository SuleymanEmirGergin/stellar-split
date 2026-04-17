import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandCoins, X, Loader2 } from 'lucide-react';
import { truncateAddress } from '../lib/stellar';
import { paymentRequestsApi } from '../lib/api';
import type { TranslationKey } from '../lib/i18n';

interface PaymentRequestModalProps {
  /** User ID of the member we're requesting payment FROM */
  toUserId: string;
  /** Wallet address of that member (for display) */
  toWallet: string;
  groupId: string;
  currencyLabel: string;
  onSuccess: () => void;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

export default function PaymentRequestModal({
  toUserId,
  toWallet,
  groupId,
  currencyLabel,
  onSuccess,
  onClose,
  t,
}: PaymentRequestModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<'XLM' | 'USDC'>(currencyLabel === 'USDC' ? 'USDC' : 'XLM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await paymentRequestsApi.create({
        groupId,
        toUserId,
        amount: amt,
        currency,
        note: note.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum due date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

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
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-card border border-white/10 rounded-[32px] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <HandCoins className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-black text-base tracking-tight">
                  {t('pay_req.modal_title')}
                </h2>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {truncateAddress(toWallet)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount + Currency */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t('pay_req.amount_label')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.0000001"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="flex-1 bg-secondary/50 border border-white/5 rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                <div className="flex rounded-2xl overflow-hidden border border-white/10">
                  {(['XLM', 'USDC'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`px-4 text-xs font-black transition-all ${
                        currency === c
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t('pay_req.note_label')}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('pay_req.note_placeholder')}
                maxLength={200}
                className="w-full bg-secondary/50 border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t('pay_req.due_date_label')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDateStr}
                className="w-full bg-secondary/50 border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-muted-foreground [color-scheme:dark]"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || submitting}
              className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? t('pay_req.sending') : t('pay_req.send_btn')}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
