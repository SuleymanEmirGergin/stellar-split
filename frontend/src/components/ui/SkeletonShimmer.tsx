import { useMotionEnabled } from '../../lib/motion';

export interface SkeletonShimmerProps {
  /** Optional className for the root element. */
  className?: string;
  /** Optional inline styles. */
  style?: React.CSSProperties;
  /** Optional rounded variant. */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

const roundedMap: Record<NonNullable<SkeletonShimmerProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

/**
 * Shimmer skeleton base. Uses CSS shimmer animation when motion is enabled;
 * when prefers-reduced-motion is set, shows static pulse only (no shimmer).
 */
export function SkeletonShimmer({
  className = '',
  style,
  rounded = 'md',
}: SkeletonShimmerProps) {
  const motionOn = useMotionEnabled();

  return (
    <div
      className={`bg-muted/60 ${roundedMap[rounded]} overflow-hidden ${className}`}
      style={style}
      aria-hidden
    >
      {motionOn ? (
        <div
          className="h-full w-full animate-shimmer"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground) / 0.15) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted-foreground/10" />
      )}
    </div>
  );
}
