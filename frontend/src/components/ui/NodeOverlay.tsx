import { motionEnabled } from '@/lib/motion';

interface NodeOverlayProps {
  className?: string;
  /** Number of dots (default 20) */
  count?: number;
}

/**
 * Subtle node network overlay with slight parallax drift. Low alpha; premium feel.
 * Disabled on reduced motion.
 */
export function NodeOverlay({ className = '', count = 20 }: NodeOverlayProps) {
  if (!motionEnabled()) return null;

  const dots = Array.from({ length: count }, (_, i) => ({
    id: i,
    cx: 10 + (i * 17) % 90,
    cy: 5 + (i * 13) % 95,
    r: 1 + (i % 2),
    delay: (i * 0.08) % 2,
  }));

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="node-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.15} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      {dots.map((d) => (
        <circle
          key={d.id}
          cx={`${d.cx}%`}
          cy={`${d.cy}%`}
          r={d.r}
          fill="url(#node-dot)"
          className="text-primary"
          style={{
            animation: 'node-drift 12s ease-in-out infinite',
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}
