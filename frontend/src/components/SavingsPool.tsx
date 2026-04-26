import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PiggyBank,
  Plus,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Coins,
  Trophy,
} from 'lucide-react';
import { savingsApi, type BackendSavingsPool } from '../lib/api';
import { createSavingsPool as createPoolOnChain, contributeToPool as contributePoolOnChain } from '../lib/contract';
import { truncateAddress } from '../lib/stellar';
import { useI18n } from '../lib/i18n';
import { useToast } from './Toast';
import Confetti from './Confetti';
import SavingsStatsHero from './savings/SavingsStatsHero';
import SavingsLeaderboard from './savings/SavingsLeaderboard';
import StatusFilterChips, { type SavingsFilterStatus } from './savings/StatusFilterChips';
import { useSavingsPools } from './savings/useSavingsPools';

interface SavingsPoolProps {
  groupId: string;
  walletAddress: string;
  currencyLabel: string;
}

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
  const color = pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : pct >= 66 ? 'bg-gradient-to-r from-indigo-400 to-blue-400' : pct >= 33 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-pink-400';
  return (
    <div className="w-full h-2 bg-white/[0.07] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ─── Create Pool Modal ────────────────────────────────────────────────────────
function CreatePoolModal({
  groupId,
  walletAddress,
  onSuccess,
  onClose,
}: {
  groupId: string;
  walletAddress: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [currency, setCurrency] = useState<'XLM' | 'USDC'>('XLM');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: () =>
      savingsApi.create({
        groupId,
        title: title.trim(),
        goalAmount: parseFloat(goalAmount),
        currency,
        deadline: deadline || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['savings', groupId] });
      // Fire on-chain contract call — best effort, does not block UX
      createPoolOnChain(
        walletAddress,
        parseInt(groupId),
        parseFloat(goalAmount),
        deadline ? new Date(deadline).getTime() : 0,
      ).catch((err: unknown) => {
        console.warn('On-chain createSavingsPool failed (non-blocking):', err);
        addToast('Pool saved locally; on-chain sync failed', 'error');
      });
      onSuccess();
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="savings-create-title"
        className="relative w-full max-w-md bg-[#0e1118]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 id="savings-create-title" className="font-black text-base tracking-tight">{t('savings.create_title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t('savings.pool_title_label')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('savings.pool_title_placeholder')}
              required
              maxLength={100}
              className="w-full bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Goal Amount + Currency */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t('savings.goal_amount_label')}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.0000001"
                step="any"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="0.00"
                required
                className="flex-1 bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <div className="flex rounded-2xl overflow-hidden border border-white/10">
                {(['XLM', 'USDC'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-4 text-xs font-black transition-all ${
                      currency === c
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t('savings.deadline_label')}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDateStr}
              className="w-full bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all text-muted-foreground [color-scheme:dark]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || !goalAmount || createMutation.isPending}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] hover:-translate-y-px text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {t('savings.create_btn')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Pool Card ────────────────────────────────────────────────────────────────
function PoolCard({
  pool,
  walletAddress,
  onContribute,
  onCancel,
}: {
  pool: BackendSavingsPool;
  walletAddress: string;
  onContribute: (pool: BackendSavingsPool) => void;
  onCancel: (id: string) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const current = parseFloat(pool.currentAmount);
  const goal = parseFloat(pool.goalAmount);
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const days = daysLeft(pool.deadline);
  const isCreator = pool.createdBy?.walletAddress === walletAddress;
  const isCompleted = pool.status === 'COMPLETED';
  const isCancelled = pool.status === 'CANCELLED';

  return (
    <motion.div
      layout
      className={`bg-white/[0.025] border rounded-2xl overflow-hidden transition-colors ${
        isCompleted
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : isCancelled
          ? 'border-white/[0.07] opacity-60'
          : 'border-white/[0.07]'
      }`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isCompleted ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20' : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20'
              }`}
            >
              {isCompleted ? (
                <Trophy size={20} className="text-emerald-400" />
              ) : isCancelled ? (
                <X size={20} className="text-muted-foreground" />
              ) : (
                <PiggyBank size={20} className="text-indigo-400" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm">{pool.title}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {isCompleted
                  ? t('savings.status_completed')
                  : isCancelled
                  ? t('savings.status_cancelled')
                  : days !== null
                  ? `${days} ${t('savings.days_left')}`
                  : t('savings.status_active')}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${
              isCompleted
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black'
                : isCancelled
                ? 'bg-white/5 border-white/10 text-muted-foreground'
                : days !== null && days <= 3
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : days !== null
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}
          >
            {pool.status}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="font-black text-foreground">
              {current.toFixed(4)} <span className="opacity-50 text-[9px]">{pool.currency}</span>
            </span>
            <span className="text-muted-foreground">
              / {goal.toFixed(4)} <span className="opacity-50 text-[9px]">{pool.currency}</span>
            </span>
          </div>
          <ProgressBar current={current} goal={goal} />
          <p className="text-[10px] text-muted-foreground text-right">
            {pct.toFixed(1)}% {t('savings.funded')}
          </p>
        </div>

        {/* Actions */}
        {!isCancelled && !isCompleted && (
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => onContribute(pool)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 transition-all"
            >
              <Coins size={14} />
              {t('savings.contribute_btn')}
            </button>
            {isCreator && (
              <button
                type="button"
                onClick={() => onCancel(pool.id)}
                className="px-3 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black hover:bg-rose-500/20 transition-all"
                title={t('savings.cancel_btn')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contributors (expandable) */}
      {(pool.contributions?.length ?? 0) > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="w-full flex items-center justify-between px-5 py-3 border-t border-white/5 text-xs text-muted-foreground hover:bg-white/5 transition-all"
          >
            <span className="font-bold">
              {pool.contributions!.length} {t('savings.contributions')}
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {pool.contributions!.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <p className="text-xs font-bold font-mono">
                          {truncateAddress(c.user.walletAddress)}
                        </p>
                        {c.note && (
                          <p className="text-[10px] text-muted-foreground">{c.note}</p>
                        )}
                      </div>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        +{parseFloat(c.amount).toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ─── Contribute Modal ─────────────────────────────────────────────────────────
function ContributeModal({
  pool,
  walletAddress,
  onSuccess,
  onClose,
}: {
  pool: BackendSavingsPool;
  walletAddress: string;
  onSuccess: (goalReached: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const qc = useQueryClient();
  const contributeMutation = useMutation({
    mutationFn: () =>
      savingsApi.contribute(pool.id, parseFloat(amount), note.trim() || undefined),
    onSuccess: ({ goalReached }) => {
      void qc.invalidateQueries({ queryKey: ['savings', pool.groupId] });
      // Fire on-chain contract call — best effort, does not block UX
      contributePoolOnChain(
        walletAddress,
        parseInt(pool.groupId),
        parseFloat(amount),
      ).catch((err: unknown) => {
        console.warn('On-chain contributeToPool failed (non-blocking):', err);
        addToast('Contribution saved locally; on-chain sync failed', 'error');
      });
      onSuccess(goalReached);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  const remaining = parseFloat(pool.goalAmount) - parseFloat(pool.currentAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="savings-contribute-title"
        className="relative w-full max-w-md bg-[#0e1118]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="savings-contribute-title" className="font-black text-base tracking-tight">{t('savings.contribute_title')}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pool.title}</p>
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

        {/* Remaining */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 mb-4 flex items-center gap-3">
          <Target size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs font-bold text-emerald-300">
            {t('savings.remaining')}: {remaining.toFixed(4)} {pool.currency}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            contributeMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t('savings.contribute_amount_label')}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.0000001"
                max={remaining > 0 ? remaining : undefined}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="flex-1 bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <span className="flex items-center px-4 bg-secondary/30 rounded-2xl border border-white/5 text-xs font-black text-muted-foreground">
                {pool.currency}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t('savings.contribute_note_label')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('savings.contribute_note_placeholder')}
              maxLength={200}
              className="w-full bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0 || contributeMutation.isPending}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] hover:-translate-y-px text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {contributeMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {t('savings.confirm_contribute')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main SavingsPool Component (orchestrator) ────────────────────────────────
//
// Refactored 2026-04-26 per docs/design/savings-redesign.md.
// The previous flat layout (3 stacked sections per status) is now:
//   [SavingsStatsHero] → [SavingsLeaderboard] → [StatusFilterChips] → [PoolCard list]
// PoolCard / CreatePoolModal / ContributeModal are unchanged — only the
// outer composition is new. Data goes through a single useSavingsPools()
// hook that derives stats once and feeds them to every child.
export default function SavingsPool({ groupId, walletAddress, currencyLabel: _currencyLabel }: SavingsPoolProps) {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [contributingTo, setContributingTo] = useState<BackendSavingsPool | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [filter, setFilter] = useState<SavingsFilterStatus>('ALL');

  // Auto-dismiss confetti after 4s
  useEffect(() => {
    if (!showConfetti) return;
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, [showConfetti]);

  const qc = useQueryClient();
  const { pools, stats, isLoading } = useSavingsPools(groupId);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => savingsApi.cancel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['savings', groupId] });
      addToast(t('savings.cancelled_toast'), 'info');
    },
  });

  // The hero needs the group's currency label even before any pools exist
  // (the empty hero renders a CTA without amounts). Derive from the first
  // pool when we have one, fall back to XLM otherwise — matches the
  // CreatePoolModal default.
  const heroCurrency: 'XLM' | 'USDC' = pools[0]?.currency ?? 'XLM';

  // Filter pools for the list. ALL keeps everything, otherwise filter by status.
  const filteredPools = filter === 'ALL' ? pools : pools.filter((p) => p.status === filter);

  // Sort filtered list: active first, then completed, then cancelled, by createdAt desc.
  const sortedPools = [...filteredPools].sort((a, b) => {
    const order = { ACTIVE: 0, COMPLETED: 1, CANCELLED: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isEmpty = !isLoading && pools.length === 0;

  // Filtered-but-not-empty-overall — happens when the user picks a status
  // chip that has no rows (e.g. CANCELLED on a healthy group).
  const filteredEmpty = !isLoading && pools.length > 0 && filteredPools.length === 0;

  return (
    <div className="space-y-5">
      <Confetti active={showConfetti} />

      {/* Loading skeleton — keeps the hero shape so there's no layout shift */}
      {isLoading && (
        <div className="space-y-5">
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white/[0.04] rounded-2xl p-4 h-24" />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Hero — renders empty variant when there are zero pools */}
      {!isLoading && (
        <SavingsStatsHero
          totalCurrent={stats.totalCurrent}
          totalGoal={stats.totalGoal}
          overallPct={stats.overallPct}
          activeCount={stats.activeCount}
          currency={heroCurrency}
          onCreatePool={() => setShowCreate(true)}
          isEmpty={isEmpty}
        />
      )}

      {/* Leaderboard — auto-hides when 0 contributors */}
      {!isLoading && (
        <SavingsLeaderboard contributors={stats.contributors} currency={heroCurrency} />
      )}

      {/* Filter + filtered list. Hidden entirely when there are no pools at all
          — the empty-state hero already handles the "create your first pool"
          CTA, no need to repeat it. */}
      {!isLoading && pools.length > 0 && (
        <div className="space-y-4">
          <StatusFilterChips
            status={filter}
            counts={{
              ALL: pools.length,
              ACTIVE: stats.activeCount,
              COMPLETED: stats.completedCount,
              CANCELLED: stats.cancelledCount,
            }}
            onChange={setFilter}
          />

          {/* Filtered-empty fallback (e.g. filter=CANCELLED but there are 0 cancelled) */}
          {filteredEmpty && (
            <div className="bg-white/[0.025] border border-dashed border-white/[0.08] rounded-2xl py-10 text-center">
              <p className="font-black text-xs text-foreground/80">
                {filter === 'ACTIVE'
                  ? t('savings.filtered_empty_active')
                  : filter === 'COMPLETED'
                  ? t('savings.filtered_empty_completed')
                  : t('savings.filtered_empty_cancelled')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{t('savings.filtered_empty_hint')}</p>
            </div>
          )}

          <AnimatePresence mode="popLayout" initial={false}>
            {sortedPools.map((pool) => (
              <motion.div
                key={pool.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <PoolCard
                  pool={pool}
                  walletAddress={walletAddress}
                  onContribute={(p) => setContributingTo(p)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreatePoolModal
            groupId={groupId}
            walletAddress={walletAddress}
            onSuccess={() => addToast(t('savings.created_toast'), 'success')}
            onClose={() => setShowCreate(false)}
          />
        )}
        {contributingTo && (
          <ContributeModal
            pool={contributingTo}
            walletAddress={walletAddress}
            onSuccess={(goalReached) => {
              addToast(t('savings.contributed_toast'), 'success');
              if (goalReached) {
                setShowConfetti(true);
                addToast(t('savings.goal_reached_toast'), 'success');
              }
            }}
            onClose={() => setContributingTo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
