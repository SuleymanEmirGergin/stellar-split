import { motion } from 'framer-motion';

type Tone = 'birik' | 'plum' | 'heat';
type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface SectionGlowProps {
  /** Brand tone — reuses the Birik palette tokens. */
  tone?: Tone;
  /** Which corner of the parent the blob sits in. */
  corner?: Corner;
  /** Size in pixels. Default 400 — keep below 600 for subtlety. */
  size?: number;
  /** Tailwind opacity value like '10' → `/10`. Default '10' (~4% of hero). */
  opacity?: '5' | '8' | '10' | '12' | '15' | '20';
  /** Whether to slowly animate. Default true. */
  animate?: boolean;
  /** className passthrough for edge tweaks. */
  className?: string;
}

const toneClass: Record<Tone, string> = {
  birik: 'bg-birik',
  plum: 'bg-plum',
  heat: 'bg-heat',
};

const cornerClass: Record<Corner, string> = {
  tl: '-top-20 -left-20',
  tr: '-top-20 -right-20',
  bl: '-bottom-20 -left-20',
  br: '-bottom-20 -right-20',
};

/**
 * Soft ambient glow blob for Landing sections.
 *
 * The Hero has dramatic `bg-birik/20` + `bg-plum/20` blobs at blur-[120px].
 * This is the quieter sibling — same vocabulary (blob + blur) but at 1/3 the
 * intensity, scoped to a corner, so later sections carry the Birik brand
 * aesthetic without competing with content.
 *
 * Default (`tone=birik`, `opacity=10`, `size=400`) ≈ 25% of hero presence.
 *
 * Parent section MUST have `position: relative` + `overflow-hidden` for
 * positioning and clipping to work.
 */
export default function SectionGlow({
  tone = 'birik',
  corner = 'tr',
  size = 400,
  opacity = '10',
  animate = true,
  className = '',
}: SectionGlowProps) {
  // Map opacity string → Tailwind utility. Kept as static strings so the JIT
  // scanner picks them up — no dynamic interpolation.
  const opClass: Record<typeof opacity, string> = {
    '5': 'opacity-[0.05]',
    '8': 'opacity-[0.08]',
    '10': 'opacity-[0.10]',
    '12': 'opacity-[0.12]',
    '15': 'opacity-[0.15]',
    '20': 'opacity-[0.20]',
  };

  const base = `pointer-events-none absolute ${cornerClass[corner]} rounded-full blur-[120px] ${toneClass[tone]} ${opClass[opacity]} ${className}`;
  const style = { width: size, height: size };

  if (!animate) {
    return <div aria-hidden className={base} style={style} />;
  }

  // Direction of drift depends on corner so the blob always moves "inward" a bit.
  const drift: Record<Corner, { x: number[]; y: number[] }> = {
    tl: { x: [0, 24, 0], y: [0, 18, 0] },
    tr: { x: [0, -24, 0], y: [0, 18, 0] },
    bl: { x: [0, 24, 0], y: [0, -18, 0] },
    br: { x: [0, -24, 0], y: [0, -18, 0] },
  };

  return (
    <motion.div
      aria-hidden
      className={base}
      style={style}
      animate={drift[corner]}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
