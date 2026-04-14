import { renderHook, act } from '@testing-library/react';
import { useOffline } from './network';

describe('useOffline', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

  function setOnLine(value: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value,
    });
  }

  afterEach(() => {
    // Restore original descriptor
    if (originalOnLine) {
      Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine);
    }
  });

  it('returns false when navigator.onLine is true', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);
  });

  it('returns true when navigator.onLine is false', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(true);
  });

  it('updates to true when offline event fires', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(true);
  });

  it('updates to false when online event fires', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(false);
  });

  it('removes event listeners on unmount', () => {
    setOnLine(true);
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOffline());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
