import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { motionEnabled, MOTION, useMotionEnabled } from './motion';

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

  describe('useMotionEnabled', () => {
    it('returns false when prefers-reduced-motion is reduce', () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      const { result } = renderHook(() => useMotionEnabled());
      expect(result.current).toBe(false);
    });

    it('returns true when prefers-reduced-motion is no-preference', () => {
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      const { result } = renderHook(() => useMotionEnabled());
      expect(result.current).toBe(true);
    });

    it('updates when media query changes', () => {
      let handler: (() => void) | null = null;
      const mockMq = {
        matches: false,
        addEventListener: vi.fn((_, h: () => void) => { handler = h; }),
        removeEventListener: vi.fn(),
      };
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue(mockMq);

      const { result } = renderHook(() => useMotionEnabled());
      expect(result.current).toBe(true);

      // Simulate prefers-reduced-motion change
      mockMq.matches = true;
      act(() => { handler?.(); });
      expect(result.current).toBe(false);
    });

    it('removes event listener on unmount', () => {
      const mockMq = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue(mockMq);
      const { unmount } = renderHook(() => useMotionEnabled());
      unmount();
      expect(mockMq.removeEventListener).toHaveBeenCalled();
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
