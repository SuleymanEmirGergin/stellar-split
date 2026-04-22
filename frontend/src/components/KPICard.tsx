import { useInView, animate } from 'framer-motion';
import { useRef, useEffect, useState, type ReactNode } from 'react';

export interface KPICardProps {
  label: string;
  /**
   * The target value to animate to. `null` or `undefined` triggers the
   * loading skeleton — letting the caller pass through React Query's
   * `data?.field` without manual null-checks.
   */
  value: number | null | undefined;
  /** Appended after the formatted number, e.g. " XLM". */
  suffix?: string;
  /** Optional icon displayed above the number. */
  icon?: ReactNode;
  /** Decimal precision for the animated counter. Ignored when `compact`. */
  decimals?: number;
  /** Use K / M abbreviations (1.2M, 45.3K) instead of full thousand separators. */
  compact?: boolean;
  /** Explicit loading override — useful when the parent wants to force a skeleton. */
  loading?: boolean;
  /** Force the error state (renders a muted "—"). */
  error?: boolean;
}

/**
 * Landing-style KPI card: animated counter from 0 to `value` when the
 * card scrolls into view, plus skeleton + error states. Mirrors the visual
 * language of the existing `<Stat>` component on the Landing hero so the
 * live metrics row blends with the hand-designed stats above.
 *
 * Cache is shared with the Dashboard's `<StatsPanel>` (same React Query
 * key under `usePublicMetrics`), so a user who lands here and then
 * navigates to `/dashboard` sees instant numbers.
 */
export function KPICard({
  label,
  value,
  suffix = '',
  icon,
  decimals = 0,
  compact = false,
  loading = false,
  error = false,
}: KPICardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!inView || value === null || value === undefined) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayed(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  if (error) {
    return (
      <div
        ref={ref}
        data-testid="kpi-card-error"
        className="rounded-xl border border-white/10 bg-card/40 p-4 opacity-60"
      >
        <div className="font-display text-3xl tabular-nums text-muted-foreground">—</div>
        <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
    );
  }

  if (loading || value === null || value === undefined) {
    return (
      <div
        ref={ref}
        data-testid="kpi-card-loading"
        aria-busy="true"
        className="rounded-xl border border-white/10 bg-card/40 p-4"
      >
        <div className="h-8 w-20 rounded bg-white/10 animate-pulse mb-2" />
        <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
    );
  }

  const formatted = formatValue(displayed, { decimals, suffix, compact });

  return (
    <div ref={ref} data-testid="kpi-card">
      {icon && <div className="mb-2 text-birik" aria-hidden="true">{icon}</div>}
      <div className="font-display text-3xl text-bone tabular-nums">{formatted}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-bone/50">{label}</div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(2);
}

function formatValue(
  n: number,
  {
    decimals,
    suffix,
    compact,
  }: { decimals: number; suffix: string; compact: boolean },
): string {
  if (compact) return `${formatCompact(n)}${suffix}`;
  const rounded = Number(n.toFixed(decimals));
  const formatted = rounded.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted}${suffix}`;
}
