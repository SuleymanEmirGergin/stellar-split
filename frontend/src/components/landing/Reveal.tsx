import { motion, type Variants, type Easing } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

/**
 * Reveal — scroll-triggered animation wrapper used across the Birik landing.
 *
 * Consistent easing across the brand: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out).
 * Honors `prefers-reduced-motion` via Framer's built-in respect for the media query.
 */

const EASE: Easing = [0.16, 1, 0.3, 1];

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  distance?: number;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  as?: ElementType;
}

export default function Reveal({
  children,
  className = '',
  direction = 'up',
  distance = 24,
  delay = 0,
  duration = 0.7,
  once = true,
  amount = 0.2,
  as: As = 'div',
}: RevealProps) {
  const offsets: Record<Direction, { x: number; y: number }> = {
    up:    { x: 0,         y: distance },
    down:  { x: 0,         y: -distance },
    left:  { x: distance,  y: 0 },
    right: { x: -distance, y: 0 },
    none:  { x: 0,         y: 0 },
  };
  const from = offsets[direction];

  const MotionTag = motion(As);

  return (
    <MotionTag
      initial={{ opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Stagger — parent that sequences Reveal children with a per-child delay.
 */
interface StaggerProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const staggerParent: Variants = {
  hidden: {},
  show: {},
};

export function Stagger({ children, delay = 0.08, className = '' }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ ...staggerParent, show: { transition: { staggerChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  y?: number;
  className?: string;
}

export function StaggerItem({ children, y = 24, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
