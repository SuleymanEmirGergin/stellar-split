import type { HTMLAttributes, ReactNode } from 'react';
import { Glow } from './Glow';
import { motionEnabled } from '../../lib/motion';

export interface CardWithHoverProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** When true, card shows faint radial glow (e.g. during send pending). */
  glow?: boolean;
  /** When true, no border/background (wrap existing card for hover only). */
  bare?: boolean;
}

/**
 * Card with glass hover: very subtle light sweep overlay + slight lift. No layout shift.
 */
export function CardWithHover({
  children,
  glow = false,
  bare = false,
  className = '',
  ...rest
}: CardWithHoverProps) {
  const useMotion = motionEnabled();
  const cardStyles = bare ? '' : 'border border-border bg-card rounded-lg';

  return (
    <div
      className={`group relative overflow-hidden transition-shadow duration-200 ${cardStyles} ${
        useMotion ? 'hover:shadow-lg hover:-translate-y-0.5' : ''
      } ${className}`.trim()}
      {...rest}
    >
      {glow && (
        <Glow
          color="hsl(var(--primary) / 0.08)"
          size="140%"
          opacity={1}
          className="pointer-events-none"
        />
      )}
      {useMotion && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
          style={{
            background: 'linear-gradient(105deg, transparent 0%, hsl(var(--foreground) / 0.03) 45%, transparent 55%)',
            backgroundSize: '200% 100%',
          }}
          aria-hidden
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
