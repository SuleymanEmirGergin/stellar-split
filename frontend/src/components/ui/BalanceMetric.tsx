import { useEffect, useState, useRef } from 'react';
import { motionEnabled, MOTION } from '../../lib/motion';
import { formatXLM } from '../../lib/format';

export interface BalanceMetricProps {
  /** Numeric value to display; null for loading. */
  value: number | null;
  /** Suffix after the number (e.g. "XLM"). Default "XLM". */
  suffix?: string;
  /** Decimal precision. Default 2. */
  precision?: number;
  /** Whether to animate from previous value to new value. Default true. */
  animate?: boolean;
  /** Optional className for the root element. */
  className?: string;
}

/** Animated balance counter: count-up over ~650ms, tabular-nums. Respects prefers-reduced-motion. */
export function BalanceMetric({
  value,
  suffix = 'XLM',
  precision = 2,
  animate = true,
  className = '',
}: BalanceMetricProps) {
  const numericValue = value != null && !Number.isNaN(Number(value)) ? Number(value) : null;
  const [displayValue, setDisplayValue] = useState(numericValue ?? 0);
  const prevValue = useRef(numericValue ?? 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const enabled = animate && motionEnabled();
  const duration = MOTION.duration.balance;

  useEffect(() => {
    const to = numericValue ?? 0;
    const from = prevValue.current;
    prevValue.current = to;

    if (!enabled || from === to) {
      setDisplayValue(to);
      return;
    }

    startRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      const current = from + (to - from) * eased;
      setDisplayValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [numericValue, enabled, duration]);

  if (numericValue === null) {
    return <span className={`tabular-nums text-muted-foreground ${className}`}>…</span>;
  }

  const text = formatXLM(displayValue, precision);
  return (
    <span className={`tabular-nums ${className}`} aria-live="polite">
      {text} {suffix}
    </span>
  );
}
