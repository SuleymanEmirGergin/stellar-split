interface LogoProps {
  className?: string;
  size?: number;
  /**
   * - `icon`: square mark only — use in tight spaces (headers, favicons, avatars)
   * - `hero`: same mark with a soft drop-shadow for CTA moments
   * - `lockup`: mark + "birik" wordmark, horizontal — use for marketing surfaces
   */
  variant?: 'icon' | 'hero' | 'lockup';
}

/**
 * Birik logomark — three ascending bars + baseline foot.
 *
 * Uses `currentColor` so the parent's text color tints the mark.
 * Wrap with `text-birik`, `text-bone`, or `text-ink` to theme.
 *
 * API preserved from the previous Logo (size + className + variant)
 * so existing consumers (Header, Landing, Footer) drop-in upgrade.
 */
export default function Logo({ className = '', size = 32, variant = 'icon' }: LogoProps) {
  if (variant === 'lockup') {
    return (
      <span
        className={`inline-flex items-center gap-2.5 ${className}`}
        aria-label="Birik"
        role="img"
      >
        <Mark size={size} />
        <span
          className="font-display uppercase leading-none tracking-[-0.04em]"
          style={{ fontSize: `${Math.round(size * 0.78)}px` }}
        >
          birik
        </span>
      </span>
    );
  }

  const dropShadow = variant === 'hero' ? 'drop-shadow-[0_4px_20px_rgba(196,255,77,0.35)]' : '';
  return <Mark size={size} className={`shrink-0 ${dropShadow} ${className}`} />;
}

function Mark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Birik"
      role="img"
      className={className}
    >
      {/* Three ascending bars — left short, right tall */}
      <rect x="11" y="34" width="9" height="15" rx="2" fill="currentColor" />
      <rect x="24" y="24" width="9" height="25" rx="2" fill="currentColor" />
      <rect x="37" y="14" width="9" height="35" rx="2" fill="currentColor" />
      {/* Baseline foot — extends slightly past the tallest bar */}
      <rect x="8" y="51" width="42" height="5" rx="2" fill="currentColor" />
    </svg>
  );
}
