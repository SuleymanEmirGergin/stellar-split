import type { ReactNode } from 'react';

export interface GlowProps {
  /** Optional className for the wrapper. */
  className?: string;
  /** Optional inline style for the wrapper. */
  style?: React.CSSProperties;
  /** Content to render inside the glow overlay container. */
  children?: ReactNode;
  /** Intensity: 'subtle' | 'medium' | 'strong'. Default subtle. */
  intensity?: 'subtle' | 'medium' | 'strong';
  /** Color hint: 'primary' | 'success' | 'neutral'. Default primary. */
  color?: 'primary' | 'success' | 'neutral';
  /** Whether the glow is radial (center fade). Default true. */
  radial?: boolean;
}

const intensityMap = {
  subtle: 'opacity-20',
  medium: 'opacity-40',
  strong: 'opacity-60',
};

/**
 * Small glow overlay component. Use for pending states, success feedback, or card hover.
 * Does not affect layout; use as overlay inside a relative container.
 */
export function Glow({
  className = '',
  style,
  children,
  intensity = 'subtle',
  color = 'primary',
  radial = true,
}: GlowProps) {
  const gradientColors: Record<typeof color, string> = {
    primary: 'hsl(var(--primary) / 0.15)',
    success: 'hsl(142 76% 36% / 0.15)',
    neutral: 'hsl(0 0% 100% / 0.08)',
  };
  const gradient = radial
    ? `radial-gradient(circle at 50% 50%, ${gradientColors[color]}, transparent 70%)`
    : `linear-gradient(135deg, ${gradientColors[color]}, transparent 60%)`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={style}
      aria-hidden
    >
      <div
        className={`absolute inset-0 ${intensityMap[intensity]}`}
        style={{
          background: gradient,
          mixBlendMode: 'overlay',
        }}
      />
      {children}
    </div>
  );
}
