import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const DISMISS_KEY = 'stellarsplit_install_prompt_dismissed';

export function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [installed, setInstalled] = useState(false);

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

  const show = deferredPrompt && !dismissed && !installed;
  if (!show) return null;

  return (
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
