import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Glow } from './Glow';

export interface PendingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** When true, shows subtle gradient/glow ring and disables interaction. */
  pending?: boolean;
  children: ReactNode;
}

/**
 * Button that shows subtle gradient/glow ring while pending. Disabled state remains clear.
 */
export function PendingButton({
  pending = false,
  className = '',
  disabled,
  children,
  ...rest
}: PendingButtonProps) {
  const isDisabled = disabled || pending;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`relative rounded-xl overflow-hidden transition-all ${pending ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-[0_0_20px_hsl(var(--primary)/0.2)]' : ''} ${className}`.trim()}
      {...rest}
    >
      {pending && (
        <Glow
          color="hsl(var(--primary) / 0.15)"
          size="150%"
          opacity={0.8}
          className="pointer-events-none"
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
