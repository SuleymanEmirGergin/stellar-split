import { SkeletonShimmer } from './SkeletonShimmer';

type RowHeight = 9 | 10 | 12 | 14 | 16 | 20;

interface TabSkeletonProps {
  /** Number of skeleton rows. Default 3. */
  rows?: number;
  /** Row height (Tailwind spacing scale). Default 14. */
  rowHeight?: RowHeight;
  /** Rounding. Default '2xl'. */
  rounded?: 'xl' | '2xl' | '3xl';
  /** Extra wrapper className. */
  className?: string;
}

// Static map so Tailwind's JIT can see every possible class at build time.
const heightClass: Record<RowHeight, string> = {
  9: 'h-9',
  10: 'h-10',
  12: 'h-12',
  14: 'h-14',
  16: 'h-16',
  20: 'h-20',
};

/**
 * Unified tab loading skeleton. Replaces inline `animate-pulse` divs and
 * per-tab SkeletonShimmer loops. Use this in any tab's `isLoading === true`
 * branch.
 *
 * @example
 * if (isLoading) return <TabSkeleton rows={5} rowHeight={12} rounded="xl" />;
 */
export function TabSkeleton({
  rows = 3,
  rowHeight = 14,
  rounded = '2xl',
  className = '',
}: TabSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonShimmer key={i} className={heightClass[rowHeight]} rounded={rounded} />
      ))}
    </div>
  );
}
