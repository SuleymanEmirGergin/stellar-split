import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useMotionEnabled } from '../lib/motion';

type Tone = 'indigo' | 'emerald' | 'amber' | 'rose';
type Variant = 'float' | 'spin' | 'pulse' | 'none';
type Size = 'sm' | 'default';

interface EmptyStateProps {
  /** Icon — can be a Lucide component (preferred) or a ReactNode (emoji, JSX). */
  icon: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  /** Color tone for icon tint + glow + CTA. Default 'indigo'. */
  tone?: Tone;
  /** Icon animation. Default 'float'. */
  variant?: Variant;
  /** Padding preset. 'default' = py-16 (hero empty), 'sm' = py-10 (inline/secondary). */
  size?: Size;
}

const toneClasses: Record<Tone, { text: string; glow: string; ring: string; ctaFrom: string; ctaTo: string; ctaHoverFrom: string; ctaHoverTo: string; ctaGlow: string; ctaGlowHover: string }> = {
  indigo: {
    text: 'text-indigo-500/30',
    glow: 'bg-indigo-500/6',
    ring: 'border-white/[0.1]',
    ctaFrom: 'from-indigo-600',
    ctaTo: 'to-purple-600',
    ctaHoverFrom: 'hover:from-indigo-500',
    ctaHoverTo: 'hover:to-purple-500',
    ctaGlow: 'shadow-[0_0_16px_rgba(99,102,241,0.3)]',
    ctaGlowHover: 'hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]',
  },
  emerald: {
    text: 'text-emerald-500/40',
    glow: 'bg-emerald-500/8',
    ring: 'border-emerald-500/15',
    ctaFrom: 'from-emerald-600',
    ctaTo: 'to-teal-600',
    ctaHoverFrom: 'hover:from-emerald-500',
    ctaHoverTo: 'hover:to-teal-500',
    ctaGlow: 'shadow-[0_0_16px_rgba(16,185,129,0.3)]',
    ctaGlowHover: 'hover:shadow-[0_0_24px_rgba(16,185,129,0.45)]',
  },
  amber: {
    text: 'text-amber-500/30',
    glow: 'bg-amber-500/6',
    ring: 'border-white/[0.1]',
    ctaFrom: 'from-amber-600',
    ctaTo: 'to-orange-600',
    ctaHoverFrom: 'hover:from-amber-500',
    ctaHoverTo: 'hover:to-orange-500',
    ctaGlow: 'shadow-[0_0_16px_rgba(245,158,11,0.3)]',
    ctaGlowHover: 'hover:shadow-[0_0_24px_rgba(245,158,11,0.45)]',
  },
  rose: {
    text: 'text-rose-500/30',
    glow: 'bg-rose-500/6',
    ring: 'border-white/[0.1]',
    ctaFrom: 'from-rose-600',
    ctaTo: 'to-pink-600',
    ctaHoverFrom: 'hover:from-rose-500',
    ctaHoverTo: 'hover:to-pink-500',
    ctaGlow: 'shadow-[0_0_16px_rgba(244,63,94,0.3)]',
    ctaGlowHover: 'hover:shadow-[0_0_24px_rgba(244,63,94,0.45)]',
  },
};

const sizeClasses: Record<Size, { wrap: string; icon: string; iconSizePx: number; title: string; desc: string }> = {
  default: {
    wrap: 'py-16 px-8',
    icon: 'w-16 h-16 mb-5',
    iconSizePx: 64,
    title: 'text-lg mb-2',
    desc: 'text-sm mb-7 max-w-xs',
  },
  sm: {
    wrap: 'py-10 px-6',
    icon: 'w-10 h-10 mb-3',
    iconSizePx: 40,
    title: 'text-sm mb-1',
    desc: 'text-xs mb-5 max-w-[220px]',
  },
};

function isLucideIcon(x: unknown): x is LucideIcon {
  return typeof x === 'function' || (typeof x === 'object' && x !== null && '$$typeof' in x && 'render' in (x as { render: unknown }));
}

/**
 * Unified empty-state card. Used across all GroupDetail tabs + Dashboard.
 *
 * - Pass a Lucide icon (preferred) via `icon={Repeat}` and it'll be rendered with the
 *   tone's tint. Pass an emoji/ReactNode (e.g. `"💸"`) and it's rendered as-is.
 * - `variant` controls the icon idle animation ('float' default, 'spin' for recurring-style
 *   content, 'pulse' for attention-drawing empty states, 'none' for reduced motion spots).
 * - `tone` controls the color family (indigo = neutral, emerald = success/positive,
 *   amber = pending/warning, rose = danger/error).
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'indigo',
  variant = 'float',
  size = 'default',
}: EmptyStateProps) {
  const motionOn = useMotionEnabled();
  const t = toneClasses[tone];
  const s = sizeClasses[size];

  // Pick an animation profile. Honor prefers-reduced-motion.
  const iconAnim =
    !motionOn || variant === 'none'
      ? undefined
      : variant === 'spin'
        ? { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: 'linear' as const } }
        : variant === 'pulse'
          ? { animate: { scale: [1, 1.06, 1], opacity: [1, 0.85, 1] }, transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const } }
          : { animate: { y: [0, -8, 0] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const } };

  // Render icon: Lucide component gets color + fixed size; ReactNode (emoji) is passed through.
  const iconEl = isLucideIcon(icon)
    ? (() => {
        const Icon = icon as LucideIcon;
        return <Icon className={`${t.text} drop-shadow-2xl`} size={s.iconSizePx} aria-hidden />;
      })()
    : (
      <div className="text-5xl select-none leading-none" aria-hidden>
        {icon}
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative flex flex-col items-center justify-center text-center ${s.wrap} overflow-hidden rounded-3xl border border-dashed ${t.ring} bg-white/[0.02]`}
    >
      {/* Subtle glow behind icon */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 ${t.glow} rounded-full blur-3xl`}
      />

      <motion.div className={`relative ${s.icon} flex items-center justify-center`} {...(iconAnim ?? {})}>
        {iconEl}
      </motion.div>

      <h3 className={`relative ${s.title} font-bold text-foreground/90 tracking-tight`}>{title}</h3>

      {description && (
        <p className={`relative ${s.desc} font-medium text-muted-foreground mx-auto leading-relaxed`}>
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r ${t.ctaFrom} ${t.ctaTo} ${t.ctaHoverFrom} ${t.ctaHoverTo} text-white text-sm font-bold rounded-xl ${t.ctaGlow} ${t.ctaGlowHover} hover:-translate-y-px transition-all`}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
