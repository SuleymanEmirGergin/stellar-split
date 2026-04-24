/**
 * Birik Design Tokens
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for design decisions shared between:
 *   • Tailwind utilities   (tailwind.config.js theme.extend)
 *   • Inline styles        (use tokens.* directly in JSX)
 *   • Framer Motion        (use motion.* for animation props)
 *
 * Adding a new token here alone is NOT enough — mirror it in
 * tailwind.config.js so the class-based usage also works.
 */

// ─── Glass (white-on-dark surface layers) ─────────────────────
export const glass = {
  /** bg-white/[0.02] — barely-there tint, outermost container */
  faint:    'rgba(255,255,255,0.02)',
  /** bg-white/[0.04] — card surfaces, list rows */
  subtle:   'rgba(255,255,255,0.04)',
  /** bg-white/[0.07] — elevated panels, hover states */
  medium:   'rgba(255,255,255,0.07)',
  /** bg-white/[0.12] — active/selected state, toasts */
  emphasis: 'rgba(255,255,255,0.12)',
} as const;

// ─── Border opacity (white-on-dark lines) ─────────────────────
export const border = {
  faint:    'rgba(255,255,255,0.04)',
  subtle:   'rgba(255,255,255,0.07)',
  medium:   'rgba(255,255,255,0.10)',
  emphasis: 'rgba(255,255,255,0.16)',
} as const;

// ─── Spacing scale (multiples of 4 px) ────────────────────────
export const space = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '40px',
  '2xl': '64px',
} as const;

// ─── Border radius ─────────────────────────────────────────────
export const radius = {
  /** 8 px — compact chips, badge pills */
  chip:  '8px',
  /** 12 px — buttons, small inputs */
  btn:   '12px',
  /** 16 px — input fields, standard cards */
  card:  '16px',
  /** 24 px — elevated panels, sheets */
  panel: '24px',
  /** 32 px — modals, drawer tops */
  modal: '32px',
  /** 9999 px — pill shapes */
  pill:  '9999px',
} as const;

// ─── Motion / Animation ────────────────────────────────────────
/**
 * Easing curves.  Use directly in Framer Motion `transition.ease`
 * or CSS `transition-timing-function`.
 */
export const ease = {
  /** Quick entrance & snappy feel — most interactive elements */
  snappy:  [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  /** Smooth deceleration — menus, sheets opening */
  smooth:  [0.22, 1, 0.36, 1]       as [number, number, number, number],
  /** Bouncy spring feel — celebration moments */
  spring:  [0.34, 1.56, 0.64, 1]    as [number, number, number, number],
  /** Standard CSS ease-out equivalent */
  out:     [0, 0, 0.2, 1]           as [number, number, number, number],
} as const;

/**
 * Duration values in seconds (Framer Motion) / milliseconds (CSS).
 * - `ms` variant: CSS `transition-duration`
 * - `s`  variant: Framer Motion `transition.duration`
 */
export const duration = {
  micro: { ms:  80, s: 0.08 },
  fast:  { ms: 150, s: 0.15 },
  base:  { ms: 250, s: 0.25 },
  slow:  { ms: 400, s: 0.40 },
  lazy:  { ms: 600, s: 0.60 },
} as const;

/**
 * Pre-composed Framer Motion `transition` presets.
 * Usage: `<motion.div transition={motion.snappy}>`
 */
export const motionTransition = {
  snappy: { ease: ease.snappy, duration: duration.fast.s  },
  smooth: { ease: ease.smooth, duration: duration.base.s  },
  micro:  { ease: ease.out,    duration: duration.micro.s },
  slow:   { ease: ease.smooth, duration: duration.slow.s  },
} as const;

// ─── Z-index scale ─────────────────────────────────────────────
export const z = {
  base:       0,
  raised:     10,
  dropdown:   100,
  sticky:     200,
  overlay:    300,
  modal:      400,
  scanner:    450,   // sits above modal (triggered from within modal)
  toast:      500,
  confetti:   600,
} as const;

// ─── Blur levels ───────────────────────────────────────────────
export const blur = {
  sm:   'blur(4px)',
  md:   'blur(12px)',
  lg:   'blur(24px)',
  xl:   'blur(40px)',
} as const;

// ─── Shadow presets ────────────────────────────────────────────
export const shadow = {
  /** Lifted card depth */
  card:    '0 4px 24px -4px rgba(0,0,0,0.4)',
  /** Modal / bottom sheet */
  modal:   '0 32px 64px -16px rgba(0,0,0,0.7)',
  /** Glowing brand accent */
  brand:   '0 20px 60px -20px rgba(196,255,77,0.4)',
  /** Indigo accent glow */
  indigo:  '0 8px 32px -8px rgba(99,102,241,0.35)',
  /** Subtle floating toast */
  toast:   '0 8px 24px rgba(0,0,0,0.5)',
} as const;

// ─── Re-export for convenience ─────────────────────────────────
export const tokens = {
  glass,
  border,
  space,
  radius,
  ease,
  duration,
  motionTransition,
  z,
  blur,
  shadow,
} as const;

export default tokens;
