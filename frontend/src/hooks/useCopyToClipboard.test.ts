import { renderHook } from '@testing-library/react';
import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard', () => {
  it('returns a function', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(typeof result.current).toBe('function');
  });

  it('returns false for empty string', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(await result.current('')).toBe(false);
  });

  it('returns false for non-string input', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    // @ts-expect-error intentional
    expect(await result.current(null)).toBe(false);
  });

  describe('with clipboard API available', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    });

    it('uses navigator.clipboard.writeText and returns true', async () => {
      const { result } = renderHook(() => useCopyToClipboard());
      const ok = await result.current('hello');
      expect(ok).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('returns false when writeText throws', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
      const { result } = renderHook(() => useCopyToClipboard());
      const ok = await result.current('hello');
      expect(ok).toBe(false);
    });
  });

  describe('fallback via execCommand', () => {
    beforeEach(() => {
      // Remove clipboard API to force fallback
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
      // jsdom does not implement execCommand — stub it on the document object
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        writable: true,
        value: vi.fn().mockReturnValue(true),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('uses execCommand fallback and returns true', async () => {
      const { result } = renderHook(() => useCopyToClipboard());
      const ok = await result.current('fallback text');
      expect(ok).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });
});
