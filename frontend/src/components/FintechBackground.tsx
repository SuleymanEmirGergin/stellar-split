/**
 * Fintech animated background layer: subtle gradient shift + floating dots.
 * GPU-friendly (transform/opacity only), respects prefers-reduced-motion.
 */
import { useMemo } from 'react';

const DOT_COUNT = 12;
const DOT_SIZE = 2;

export default function FintechBackground() {
  const dots = useMemo(() => {
    return Array.from({ length: DOT_COUNT }, (_, i) => ({
      id: i,
      left: `${10 + (i * 7) % 80}%`,
      top: `${5 + (i * 11) % 90}%`,
      delay: `${(i * 0.8) % 6}s`,
      duration: 14 + (i % 5),
    }));
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Soft gradient orbs — very subtle shift (CSS animation in index.css) */}
      <div
        className="absolute inset-0 bg-depth-layer animate-fintech-gradient will-change-transform"
        style={{ transformOrigin: '50% 50%' }}
      />

      {/* Floating particle dots — CSS-only, low GPU cost */}
      <div className="absolute inset-0">
        {dots.map((d) => (
          <div
            key={d.id}
            className="absolute rounded-full bg-indigo-400/30 dark:bg-indigo-300/20 animate-float-dots"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              left: d.left,
              top: d.top,
              animationDelay: d.delay,
              animationDuration: `${d.duration}s`,
            }}
          />
        ))}
      </div>

    </div>
  );
}
