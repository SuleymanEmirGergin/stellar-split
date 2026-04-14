import { useState, useEffect, useCallback } from 'react';

/**
 * Captures the browser's `beforeinstallprompt` event and exposes helpers
 * to trigger the PWA install dialog and dismiss the install banner.
 *
 * The "dismissed" state is persisted in localStorage so the banner stays
 * hidden across page reloads once the user closes it.
 */

const DISMISSED_KEY = 'stellarsplit_pwa_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UseInstallPromptReturn {
  /** Whether the browser has fired `beforeinstallprompt` (app is installable). */
  canInstall: boolean;
  /** Whether the banner should currently be shown. */
  showBanner: boolean;
  /** Trigger the native PWA install dialog. Hides the banner on success. */
  promptInstall: () => void;
  /** Permanently dismiss the banner (persisted to localStorage). */
  dismissBanner: () => void;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) !== 'true',
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt().then(() => {
      setDeferredPrompt(null);
      setShowBanner(false);
    });
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  return {
    canInstall: deferredPrompt !== null,
    showBanner,
    promptInstall,
    dismissBanner,
  };
}
