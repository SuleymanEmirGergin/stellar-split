/**
 * Hero stats card at the top of the savings tab.
 *
 * Renders three KPI cells (toplam birikim / aktif havuz / hedef ilerleme)
 * over an aggregate progress bar plus the primary "Yeni Havuz" CTA.
 * See `docs/design/savings-redesign.md` §4.1 for the full component anatomy.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Sparkles, Target } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useMotionEnabled } from '../../lib/motion';

interface SavingsStatsHeroProps {
  totalCurrent: number;
  totalGoal: number;
  overallPct: number;
  activeCount: number;
  currency: 'XLM' | 'USDC';
  onCreatePool: () => void;
  /** When true, the user has no pools at all — render the empty hero variant. */
  isEmpty: boolean;
}

/** Animate a number from 0 → target. Bypasses animation when reduced-motion is on. */
function useCountUp(target: number, durationMs = 600): number {
  const motionOn = useMotionEnabled();
  const [value, setValue] = useState(motionOn ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!motionOn) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const startVal = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic — matches motionTransition.smooth feel
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(startVal + (target - startVal) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, motionOn]);

  return value;
}

function formatAmount(n: number): string {
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(7).replace(/\.?0+$/, '');
  if (n < 1) return n.toFixed(4);
  if (n < 1_000) return n.toFixed(2);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function SavingsStatsHero({
  totalCurrent,
  totalGoal,
  overallPct,
  activeCount,
  currency,
  onCreatePool,
  isEmpty,
}: SavingsStatsHeroProps) {
  const { t } = useI18n();
  const motionOn = useMotionEnabled();

  const animatedCurrent = useCountUp(totalCurrent);
  const animatedPct = useCountUp(overallPct);

  // Empty hero: collapse the KPI grid in favour of an inviting CTA copy block.
  if (isEmpty) {
    return (
      <section
        aria-labelledby="savings-stats-heading"
        className="relative overflow-hidden bg-white/[0.07] border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      >
        <h2 id="savings-stats-heading" className="sr-only">
          {t('savings.stats_heading')}
        </h2>
        <div className="absolute -right-12 -top-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center">
              <PiggyBank size={28} className="text-emerald-300" />
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-foreground">
                {t('savings.empty_hero_cta')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                {t('savings.empty_hero_subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCreatePool}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            {t('savings.new_pool_btn')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="savings-stats-heading"
      className="relative overflow-hidden bg-white/[0.07] border border-white/[0.08] rounded-3xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
    >
      <h2 id="savings-stats-heading" className="sr-only">
        {t('savings.stats_heading')}
      </h2>

      {/* Decorative — pure CSS, doesn't enter the a11y tree */}
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* KPI 1 — Total Saved */}
        <motion.div
          initial={motionOn ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0 }}
          className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-300/80 uppercase tracking-widest">
            <PiggyBank size={11} />
            {t('savings.stats_total_label')}
          </div>
          <p className="mt-2 font-black text-2xl tabular-nums" aria-live="polite">
            {formatAmount(animatedCurrent)}
            <span className="text-xs ml-1.5 text-muted-foreground/60">{currency}</span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
            / {formatAmount(totalGoal)} {t('savings.stats_target_suffix')}
          </p>
        </motion.div>

        {/* KPI 2 — Active Pool count */}
        <motion.div
          initial={motionOn ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.06 }}
          className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-300/80 uppercase tracking-widest">
            <Target size={11} />
            {t('savings.stats_active_label')}
          </div>
          <p className="mt-2 font-black text-2xl tabular-nums">
            {activeCount}
            <span className="text-xs ml-1.5 text-muted-foreground/60">
              {t('savings.stats_active_suffix')}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {activeCount === 0 ? t('savings.stats_active_zero_hint') : t('savings.stats_active_active_hint')}
          </p>
        </motion.div>

        {/* KPI 3 — Overall % progress (full-width on mobile, third column on desktop) */}
        <motion.div
          initial={motionOn ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="col-span-2 md:col-span-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-300/80 uppercase tracking-widest">
            <Sparkles size={11} />
            {t('savings.stats_progress_label')}
          </div>
          <p className="mt-2 font-black text-2xl tabular-nums">
            {animatedPct.toFixed(1)}
            <span className="text-xs ml-1 text-muted-foreground/60">%</span>
          </p>
          {/* Aggregate progress bar — uses native <progress> for free a11y */}
          <progress
            value={overallPct}
            max={100}
            aria-label={t('savings.stats_progress_aria')}
            className="w-full mt-2 h-1.5 [&::-webkit-progress-bar]:bg-white/[0.06] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-emerald-400 [&::-webkit-progress-value]:to-teal-400 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-emerald-400 [&::-moz-progress-bar]:rounded-full"
          />
        </motion.div>
      </div>

      {/* CTA */}
      <div className="relative mt-5 flex justify-end">
        <button
          type="button"
          onClick={onCreatePool}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
        >
          <Plus size={14} />
          {t('savings.new_pool_btn')}
        </button>
      </div>
    </section>
  );
}
