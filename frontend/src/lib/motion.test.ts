import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { motionEnabled, MOTION } from './motion';

describe('motion', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('motionEnabled', () => {
    it('returns false when prefers-reduced-motion is reduce', () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      expect(motionEnabled()).toBe(false);
    });

    it('returns true when prefers-reduced-motion is no-preference', () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      expect(motionEnabled()).toBe(true);
    });
  });

  describe('MOTION', () => {
    it('exports duration numbers', () => {
      expect(MOTION.duration.fast).toBe(150);
      expect(MOTION.duration.balance).toBe(650);
      expect(MOTION.duration.successPulse).toBe(1000);
    });

    it('exports easing strings', () => {
      expect(typeof MOTION.easing.easeOut).toBe('string');
      expect(MOTION.easing.easeOut).toContain('cubic-bezier');
    });
  });
});
