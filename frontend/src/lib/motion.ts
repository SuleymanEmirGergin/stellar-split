import { useState, useEffect } from 'react';

/**
 * Motion primitives: prefers-reduced-motion awareness and shared timing.
 * Tree-shakeable; no heavy deps.
 */

/** Check if motion is allowed (user has not requested reduced motion). */
export function motionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  return !mq.matches;
}

/** React hook that updates when prefers-reduced-motion changes. */
export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setEnabled(!mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return enabled;
}

/** Shared motion durations (ms). */
export const MOTION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    balance: 650,
    successPulse: 1000,
  },
  easing: {
    easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
