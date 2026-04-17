import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Repeat } from 'lucide-react';
import { type RecurringTemplate, type Interval } from '../lib/recurring';
import type { TranslationKey } from '../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sub: Omit<RecurringTemplate, 'id' | 'createdAt'>) => void;
  t: (key: TranslationKey) => string;
}

const INTERVAL_VALUES: Interval[] = ['daily', 'weekly', 'monthly', 'yearly'];
const INTERVAL_KEYS: Record<Interval, TranslationKey> = {
  daily: 'recurring.interval_daily',
  weekly: 'recurring.interval_weekly',
  monthly: 'recurring.interval_monthly',
  yearly: 'recurring.interval_yearly',
};

const CATEGORIES = ['entertainment', 'home', 'services', 'other'];

function defaultNextDue(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function SubscriptionModal({ isOpen, onClose, onSave, t }: Props) {
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [interval, setInterval] = useState<Interval>('monthly');
  const [category, setCategory] = useState('entertainment');
  const [nextDue, setNextDue]   = useState<string>(defaultNextDue);
  const dialogRef = useRef<HTMLDivElement>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen, trapFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    onSave({
      name: name.trim(),
      amount: parseFloat(amount),
      interval,
      category,
      members: [],
      status: 'active',
      nextDue: new Date(nextDue).getTime(),
    });
    setName('');
    setAmount('');
    setInterval('monthly');
    setCategory('entertainment');
    setNextDue(defaultNextDue());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 id="sub-modal-title" className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Repeat className="text-indigo-500" /> {t('recurring.new_subscription')}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  {t('recurring.service_name')}
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('recurring.service_placeholder')}
                  className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-bold transition-all"
                />
              </div>

              {/* Amount + Interval */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    {t('recurring.amount_label')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-mono font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    {t('recurring.period_label')}
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as Interval)}
                    className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-bold transition-all appearance-none"
                  >
                    {INTERVAL_VALUES.map((v) => (
                      <option key={v} value={v}>{t(INTERVAL_KEYS[v])}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Next due date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  {t('recurring.first_payment_date')}
                </label>
                <input
                  type="date"
                  value={nextDue}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNextDue(e.target.value)}
                  className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-mono font-bold transition-all"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  {t('recurring.category_label')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        category === cat
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-secondary/50 border-border text-muted-foreground hover:border-indigo-500/30'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !amount}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Check size={20} /> {t('recurring.start_btn')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
