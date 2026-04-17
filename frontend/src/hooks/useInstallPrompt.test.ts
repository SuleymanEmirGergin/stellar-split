import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initial canInstall is false', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it('fires beforeinstallprompt event sets canInstall to true', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const fakeEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent & {
      prompt: ReturnType<typeof vi.fn>;
      userChoice: Promise<{ outcome: string }>;
    };
    (fakeEvent as unknown as Record<string, unknown>).prompt = vi.fn().mockResolvedValue(undefined);
    (fakeEvent as unknown as Record<string, unknown>).userChoice = Promise.resolve({ outcome: 'accepted' });
    act(() => {
      window.dispatchEvent(fakeEvent);
    });
    expect(result.current.canInstall).toBe(true);
  });

  it('dismissBanner sets showBanner to false and saves to localStorage', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const fakeEvent = new Event('beforeinstallprompt');
    (fakeEvent as unknown as Record<string, unknown>).prompt = vi.fn().mockResolvedValue(undefined);
    (fakeEvent as unknown as Record<string, unknown>).userChoice = Promise.resolve({ outcome: 'dismissed' });
    act(() => {
      window.dispatchEvent(fakeEvent);
    });
    act(() => {
      result.current.dismissBanner();
    });
    expect(result.current.showBanner).toBe(false);
    expect(localStorage.getItem('stellarsplit_pwa_install_dismissed')).toBeTruthy();
  });

  it('showBanner is false initially when already dismissed in localStorage', () => {
    localStorage.setItem('stellarsplit_pwa_install_dismissed', 'true');
    const { result } = renderHook(() => useInstallPrompt());
    const fakeEvent = new Event('beforeinstallprompt');
    (fakeEvent as unknown as Record<string, unknown>).prompt = vi.fn().mockResolvedValue(undefined);
    (fakeEvent as unknown as Record<string, unknown>).userChoice = Promise.resolve({ outcome: 'dismissed' });
    act(() => {
      window.dispatchEvent(fakeEvent);
    });
    expect(result.current.showBanner).toBe(false);
  });
});
