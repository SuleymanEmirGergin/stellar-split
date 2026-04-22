import { useState, useEffect } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const DISMISS_KEY = 'stellarsplit_install_prompt_dismissed';

/**
 * Detect whether the current user-agent is iOS Safari in a *browser* tab
 * (not already installed as a standalone PWA). iOS Safari never fires
 * `beforeinstallprompt` — users have to tap Share → Add to Home Screen
 * manually — so we need a separate code path that shows instructions.
 *
 * Deliberately narrow: we only return true for real iOS Safari, not
 * iPadOS Chrome (which still doesn't support PWA installs as of early 2026).
 */
function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac — detect via touch points + platform
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return isIos && isSafari;
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setIsIos(detectIosSafari());
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onStandalone = () => setInstalled(true);
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone) {
      setInstalled(true);
    }
    window.matchMedia('(display-mode: standalone)').addEventListener('change', onStandalone);
    return () => window.matchMedia('(display-mode: standalone)').removeEventListener('change', onStandalone);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  // Show the banner if:
  //  - Chrome/Android: beforeinstallprompt fired AND not dismissed AND not installed
  //  - iOS Safari: ua matches AND not dismissed AND not installed (no event needed)
  const show = (deferredPrompt || isIos) && !dismissed && !installed;
  if (!show) return null;

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm"
        data-testid="install-prompt"
      >
        <Download size={18} className="text-indigo-400 shrink-0" />
        <span className="text-foreground font-medium flex-1">{t('install.prompt')}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
          >
            {t('install.install')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-white/5 text-xs font-medium"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div
          data-testid="install-prompt-ios-guide"
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm bg-card border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{t('install.ios_title')}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('install.ios_subtitle')}</p>
              </div>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">1</span>
                <span className="text-foreground/80">
                  {t('install.ios_step1')} <Share2 size={14} className="inline text-indigo-400" />
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">2</span>
                <span className="text-foreground/80">{t('install.ios_step2')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">3</span>
                <span className="text-foreground/80">{t('install.ios_step3')}</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
