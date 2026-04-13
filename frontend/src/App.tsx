import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Globe,
  Sun,
  Moon,
  Link as LinkIcon,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Wifi,
  WifiOff,
  QrCode,
  Settings
} from 'lucide-react';
import { isFreighterInstalled, connectFreighter, getFreighterAddress, isTestnet } from './lib/stellar';
import { signInWithStellar, signOut } from './lib/siws';
import { maskAddress } from './lib/format';
import { useMotionEnabled } from './lib/motion';
import { ToastProvider, useToast } from './components/Toast';
import { BalanceMetric } from './components/ui/BalanceMetric';
// Route-level code splitting: these components are only loaded when their route is visited
const Landing = lazy(() => import('./components/Landing'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const GroupDetail = lazy(() => import('./components/GroupDetail'));
const JoinPage = lazy(() => import('./components/JoinPage'));
const ReputationDashboard = lazy(() => import('./components/ReputationDashboard').then(m => ({ default: m.ReputationDashboard })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));

import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import CopyButton from './components/CopyButton';
import { ReceivePanel, EasterEgg, AutoPitch } from './components/ui';
import { WalletBridge } from './components/WalletBridge';
import { NotificationCenter } from './components/NotificationCenter';
import Logo from './components/Logo';
import { sounds } from './lib/sound';
import { useI18n } from './lib/i18n';
import { translateError } from './lib/errors';
import { useOffline } from './lib/network';
import { useAppStore } from './store/useAppStore';
import { useXlmPriceWithChange } from './lib/xlmPrice';
import { getSPLTBalance } from './lib/contract';

// ── Wallet Balance Hook ──────────────────────────────────────
function useWalletBalance(address: string | null, isDemo: boolean) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    if (isDemo) {
      setBalance('1250.45');
      return;
    }
    const fetchBalance = async () => {
      try {
        const horizon = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
        const res = await fetch(`${horizon}/accounts/${address}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const native = data.balances?.find((b: { asset_type: string; balance: string }) => b.asset_type === 'native');
        if (native) {
          setBalance(parseFloat(native.balance).toFixed(2));
        }
      } catch {
        setBalance('0.00');
      }
    };
    fetchBalance();
    const iv = setInterval(fetchBalance, 15000);
    return () => clearInterval(iv);
  }, [address, isDemo]);

  return balance;
}

// ── XLM Price: shared with xlmPrice.ts (5 min cache, 429 backoff) ──────────────────────────────────────
function useXlmPrice() {
  return useXlmPriceWithChange();
}

// ── Dark / Light Theme ──────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('stellarsplit_theme');
    return saved ? saved === 'dark' : true; // Default dark
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('stellarsplit_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return { dark, toggle };
}

// ── SPLT Balance Hook ──────────────────────────────────────
function useSPLTBalance(address: string | null, isDemo: boolean) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    const fetchBalance = async () => {
      const b = await getSPLTBalance(address);
      setBalance(b);
    };
    fetchBalance();
    const iv = setInterval(fetchBalance, 20000);
    return () => clearInterval(iv);
  }, [address, isDemo]);

  return balance;
}

// ── Main ────────────────────────────────────────────────
function AppContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    // E2E: Playwright sets window.__PLAYWRIGHT_E2E_WALLET__ via addInitScript before page scripts
    // run, so we can initialize synchronously and skip the async Freighter round-trip entirely.
    if (typeof window !== 'undefined' && (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__) {
      return (window as unknown as { __PLAYWRIGHT_E2E_WALLET__: string }).__PLAYWRIGHT_E2E_WALLET__;
    }
    return null;
  });
  const [freighterAvailable, setFreighterAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const demoMode = useAppStore(s => s.demoMode);
  const storeDemoMode = useAppStore(s => s.setDemoMode);
  const walletBalance = useWalletBalance(walletAddress, demoMode);
  const spltBalance = useSPLTBalance(walletAddress, demoMode);
  const { addToast } = useToast();
  const { price, change } = useXlmPrice();
  const { dark, toggle: toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const isOffline = useOffline();
  const motionOn = useMotionEnabled();
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(() => localStorage.getItem('stellarsplit_pwa_install_dismissed') !== 'true');
  const [showReceivePanel, setShowReceivePanel] = useState(false);
  const [bridgeUri, setBridgeUri] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const isDashboard = pathname === '/dashboard';
  const isReputation = pathname === '/reputation';
  const isSettings = pathname === '/settings';
  const isGroup = pathname.startsWith('/group/');
  const isJoin = pathname.startsWith('/join/');
  const joinGroupId = isJoin ? parseInt(pathname.replace(/^\/join\//, ''), 10) : null;
  const hasValidJoinGroupId = joinGroupId !== null && !Number.isNaN(joinGroupId);
  // Support both numeric (Soroban) and string UUID (backend) group IDs
  const groupIdRaw = isGroup ? pathname.replace(/^\/group\//, '') : null;
  const groupIdNumeric = groupIdRaw ? parseInt(groupIdRaw, 10) : null;
  // A group ID is valid if it's a non-empty string (UUID) or a valid number
  const hasValidGroupId =
    groupIdRaw != null &&
    groupIdRaw.length > 0 &&
    (isNaN(Number(groupIdRaw)) || !Number.isNaN(groupIdNumeric));
  // Pass numeric ID to legacy Soroban components; fall back to raw string for backend groups
  const groupId: string | number | null =
    groupIdNumeric != null && !Number.isNaN(groupIdNumeric) ? groupIdNumeric : groupIdRaw;

  // Open Graph / document.title per route (helps JS-aware crawlers and tabs)
  useEffect(() => {
    const base = 'StellarSplit';
    let title = base;
    let desc = 'Decentralized group expense splitting and settlement on Stellar. Split bills, settle debts with Soroban.';
    if (isGroup && hasValidGroupId) {
      title = `${base} – Group #${groupId}`;
      desc = `View and manage group expenses and settlements. Split bills on Stellar.`;
    } else if (isJoin && hasValidJoinGroupId) {
      title = `${base} – Join group`;
      desc = `You're invited to a StellarSplit group. Connect your wallet to join.`;
    } else if (pathname === '/dashboard') {
      title = `${base} – Dashboard`;
      desc = 'Your groups and expense splits on Stellar.';
    }
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const twTitle = document.querySelector('meta[property="twitter:title"]');
    const twDesc = document.querySelector('meta[property="twitter:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twImage = document.querySelector('meta[property="twitter:image"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (twTitle) twTitle.setAttribute('content', title);
    if (twDesc) twDesc.setAttribute('content', desc);
    // Dynamic OG image when analytics API is set (api serves GET /og?title=...&subtitle=...)
    const analyticsEndpoint = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ENDPOINT;
    const ogImageUrl = analyticsEndpoint
      ? `${String(analyticsEndpoint).replace(/\/events\/?$/, '')}/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(desc)}`
      : undefined;
    if (ogImage && ogImageUrl) ogImage.setAttribute('content', ogImageUrl);
    if (twImage && ogImageUrl) twImage.setAttribute('content', ogImageUrl);
  }, [pathname, isGroup, isJoin, hasValidGroupId, hasValidJoinGroupId, groupId, joinGroupId]);

  useEffect(() => {
    isFreighterInstalled().then(setFreighterAvailable);
    getFreighterAddress().then(async (addr) => {
      if (addr) {
        setWalletAddress(addr);
        useAppStore.getState().setWalletAddress(addr);
        // Silently re-authenticate with backend on page load.
        // Skip in E2E tests (no backend available).
        const isE2E = typeof window !== 'undefined' &&
          !!(window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__;
        if (!isE2E) {
          try {
            const { user } = await signInWithStellar(addr);
            useAppStore.getState().setBackendUser(user);
          } catch {
            // Backend unreachable or user cancelled — continue without JWT
          }
        }
        // Navigation is deferred to the effect below so walletAddress state
        // is committed before the auth guard evaluates isDashboard.
      }
    });
  }, []);

  // Redirect landing → dashboard once wallet is confirmed (runs after walletAddress state is committed).
  useEffect(() => {
    if (walletAddress && pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [walletAddress, pathname, navigate]);

  useEffect(() => {
    if (!walletAddress && (isDashboard || (isGroup && hasValidGroupId) || isReputation || isSettings) && !isJoin) {
      navigate('/', { replace: true });
    }
  }, [walletAddress, pathname, isDashboard, isGroup, hasValidGroupId, isJoin, isReputation, isSettings, navigate]);

  useEffect(() => {
    if (walletAddress && isGroup && !hasValidGroupId) {
      navigate('/dashboard', { replace: true });
    }
  }, [walletAddress, isGroup, hasValidGroupId, navigate]);
  useEffect(() => {
    if (isJoin && !hasValidJoinGroupId) {
      navigate(walletAddress ? '/dashboard' : '/', { replace: true });
    }
  }, [isJoin, hasValidJoinGroupId, walletAddress, navigate]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Sponsorlu İşlem (Gasless Tx) Toast Dinleyicisi
  useEffect(() => {
    const handleSponsored = () => {
      addToast('⚡ İşlem ücreti (fee) StellarSplit tarafından sponsorlandı!', 'success');
    };
    window.addEventListener('stellarsplit:tx-sponsored', handleSponsored);
    return () => window.removeEventListener('stellarsplit:tx-sponsored', handleSponsored);
  }, [addToast]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const addr = await connectFreighter();
      if (addr) {
        setWalletAddress(addr);
        useAppStore.getState().setWalletAddress(addr);
        // Authenticate with backend (SIWS) — non-blocking; errors shown as info toasts
        try {
          const { user } = await signInWithStellar(addr);
          useAppStore.getState().setBackendUser(user);
        } catch (siwsErr) {
          const siwsMsg = siwsErr instanceof Error ? siwsErr.message : 'Backend auth failed';
          addToast(`${siwsMsg} (offline mode active)`, 'info');
        }
        if (isJoin && hasValidJoinGroupId) {
          navigate(`/group/${joinGroupId}`);
        } else {
          navigate('/dashboard');
        }
        addToast(t('common.connected'), 'success');
      }
    } catch (err) {
      console.error('Freighter connection error:', err);
      const raw = err instanceof Error ? err.message : '';
      const msg = raw ? translateError(raw, lang === 'tr' ? 'tr' : 'en') : t('common.error');
      addToast(msg, 'error');
    } finally {
      setConnecting(false);
      sounds.playSuccess();
    }
  }, [addToast, t, lang, navigate, isJoin, hasValidJoinGroupId, joinGroupId]);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    useAppStore.getState().setWalletAddress('');
    useAppStore.getState().setBackendUser(null);
    // Revoke backend session (fire-and-forget — don't block UI)
    void signOut().catch(() => {});
    navigate('/');
    addToast(t('dash.empty'), 'info');
  }, [addToast, t, navigate]);

  // ── Keyboard Shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (isDashboard) {
            window.dispatchEvent(new CustomEvent('stellarsplit:new-group'));
          }
          break;
        case 'r':
          if (walletAddress) navigate('/reputation');
          break;
        case 's':
          if (walletAddress) navigate('/settings');
          break;
        case 'e':
          if (isGroup && hasValidGroupId) {
            window.dispatchEvent(new CustomEvent('stellarsplit:new-expense'));
          }
          break;
        case 'd': {
          const newMode = !demoMode;
          storeDemoMode(newMode);
          addToast(newMode ? '🛡️ Demo Modu Aktif (Offline)' : '🌐 Canlı Mod Aktif (Testnet)', 'info');
          break;
        }
        case '?':
          addToast('⎯ N = Yeni Grup · E = Harcama · R = Reputasyon · S = Ayarlar · D = Demo', 'info');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDashboard, isGroup, hasValidGroupId, addToast, demoMode, walletAddress, navigate]);

  const toggleDemoMode = useCallback(() => {
    const newMode = !demoMode;
    storeDemoMode(newMode);
    addToast(newMode ? '🛡️ Demo Modu Aktif' : '🌐 Canlı Mod Aktif', 'info');
  }, [demoMode, storeDemoMode, addToast]);

  const goHome = useCallback(() => {
    navigate(walletAddress ? '/dashboard' : '/');
  }, [walletAddress, navigate]);

  const goToGroup = useCallback((id: number | string) => {
    navigate(`/group/${id}`);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      {/* ── Sticky top: offline banner + header ── */}
      <div className="sticky top-0 z-50 flex flex-col">
        {isOffline && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/20 border-b border-amber-500/30 text-amber-400 text-sm font-bold">
            <WifiOff size={18} />
            {t('network.offline_banner')}
          </div>
        )}
        <header className="flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-xl border-b border-white/5">
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 text-xl font-bold cursor-pointer shrink-0 transition-transform active:scale-[0.98] hover:opacity-90"
          onClick={goHome}
        >
          <Logo size={36} className="rounded-xl" />
          <span className="bg-gradient-to-r from-indigo-400 via-white to-purple-400 bg-[length:200%_auto] animate-glimmer bg-clip-text text-transparent tracking-tight">StellarSplit</span>
        </div>

        {/* Right area */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* XLM Price */}
          {price !== null && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-secondary/50 border border-white/5 rounded-full text-[11px] font-bold">
              <span className="text-muted-foreground">XLM</span>
              <span className="font-mono text-foreground">${price.toFixed(4)}</span>
              {change !== null && (
                <span className={`inline-flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(change).toFixed(2)}%
                </span>
              )}
            </div>
          )}

          {/* Testnet/Demo indicators */}
          {!demoMode ? (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-full border border-rose-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              {t('header.testnet')}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
              <Shield size={10} />
              {t('header.demo_mode')}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 bg-secondary/50 border border-white/5 p-1 rounded-2xl">
            <button
              onClick={toggleDemoMode}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                demoMode
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-muted-foreground hover:bg-white/5'
              }`}
              title={demoMode ? t('header.switch_testnet') : t('header.switch_demo')}
            >
              {demoMode ? <Shield size={18} /> : <Globe size={18} />}
            </button>

            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : lang === 'en' ? 'de' : lang === 'de' ? 'es' : 'tr')}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 transition-all text-[11px] font-black"
              title={lang === 'tr' ? 'English' : lang === 'en' ? 'Deutsch' : lang === 'de' ? 'Español' : 'Türkçe'}
            >
              {lang.toUpperCase()}
            </button>

            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 transition-all"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {walletAddress && (
              <button
                onClick={() => navigate('/settings')}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                  isSettings
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
                title="Settings (S)"
              >
                <Settings size={18} />
              </button>
            )}
          </div>

          {/* Notifications */}
          {walletAddress && <NotificationCenter />}

          {/* Wallet */}
          {walletAddress ? (
            <div className="flex items-center gap-2">
              {isTestnet() && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Testnet
                </span>
              )}
              {!isTestnet() && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  Mainnet
                </span>
              )}
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-100 text-xs font-bold gap-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span className="font-mono tracking-tight">
                    <BalanceMetric value={walletBalance != null ? parseFloat(walletBalance) : null} suffix="XLM" />
                  </span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Shield size={14} />
                  <span className="font-mono tracking-tight text-white">
                    <BalanceMetric value={spltBalance} suffix="SPLT" />
                  </span>
                </div>
              </div>
              <CopyButton text={walletAddress} onCopy={() => addToast(t('common.copied') || 'Copied')} />
              <button
                type="button"
                onClick={() => setShowReceivePanel(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/30 text-xs font-bold transition-all"
              >
                <QrCode size={14} />
                {t('receive.title') || 'Receive'}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-xs hover:bg-indigo-500/20 transition-all group"
                onClick={handleDisconnect}
              >
                <LinkIcon size={14} className="group-hover:rotate-45 transition-transform" />
                <span className="font-mono">{maskAddress(walletAddress)}</span>
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 border border-indigo-500 rounded-xl text-white font-bold text-sm hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
              onClick={handleConnect}
              disabled={!freighterAvailable || connecting}
            >
              {connecting ? (
                <Zap size={16} className="animate-spin" />
              ) : freighterAvailable ? (
                <><LinkIcon size={16} /> {t('header.connect_wallet')}</>
              ) : (
                <><AlertTriangle size={16} /> {t('header.install_freighter')}</>
              )}
            </button>
          )}
        </div>
      </header>
      </div>

      {/* ── Demo Bar ── */}
      {demoMode && walletAddress && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/10 py-1.5 text-[9px] font-black text-indigo-400 tracking-[0.3em] uppercase flex items-center justify-center gap-8 overflow-hidden relative">
          <div className="flex items-center gap-2"><Shield size={10} /> Shield: On</div>
          <div className="flex items-center gap-2"><Wifi size={10} /> Simulated RPC</div>
          <div className="flex items-center gap-2"><Globe size={10} /> Offline Priority</div>
        </div>
      )}

      {/* ── Main Content (page transition: fade + 8px depth) ── */}
      <main className="flex-1 p-6 md:p-8 max-w-[1200px] w-full mx-auto overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: motionOn ? 8 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: motionOn ? -8 : 0 }}
            transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
            className="min-h-0"
          >
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Zap size={24} className="animate-spin text-indigo-400" /></div>}>
            {pathname === '/' && (
              !walletAddress ? (
                <Landing onConnect={handleConnect} onPasskey={toggleDemoMode} freighterAvailable={freighterAvailable} connecting={connecting} isDemo={demoMode} onTryDemo={toggleDemoMode} />
              ) : (
                <Dashboard walletAddress={walletAddress} onSelectGroup={goToGroup} isDemo={demoMode} />
              )
            )}
            {pathname === '/dashboard' && walletAddress && (
              <Dashboard walletAddress={walletAddress} onSelectGroup={goToGroup} isDemo={demoMode} />
            )}
            {isReputation && walletAddress && (
              <ReputationDashboard walletAddress={walletAddress} isDemo={demoMode} onBack={() => navigate('/dashboard')} />
            )}
            {isSettings && walletAddress && (
              <SettingsPage
                dark={dark}
                toggleTheme={toggleTheme}
                onDisconnect={handleDisconnect}
              />
            )}
            {!walletAddress && (pathname === '/dashboard' || (isGroup && hasValidGroupId) || isReputation) && !isJoin && (
              <Landing onConnect={handleConnect} onPasskey={toggleDemoMode} freighterAvailable={freighterAvailable} connecting={connecting} isDemo={demoMode} onTryDemo={toggleDemoMode} />
            )}
            {isJoin && hasValidJoinGroupId && (
              <JoinPage
                groupId={joinGroupId!}
                walletAddress={walletAddress}
                onConnect={handleConnect}
                connecting={connecting}
                freighterAvailable={freighterAvailable}
                onOpenGroup={() => navigate(`/group/${joinGroupId}`)}
              />
            )}
        {isGroup && hasValidGroupId && walletAddress && groupId !== null && (
          <GroupDetail
            walletAddress={walletAddress}
            groupId={groupId}
            isDemo={demoMode}
            onBack={() => navigate('/dashboard')}
            isOffline={isOffline}
          />
        )}
          </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* PWA install banner */}
      {deferredInstallPrompt && showInstallBanner && (
        <div className="sticky bottom-0 z-40 flex items-center justify-between gap-4 px-6 py-3 bg-indigo-600/90 backdrop-blur border-t border-indigo-500/30 text-white text-sm">
          <div>
            <span className="font-bold">{t('pwa.install_app')}</span>
            <span className="ml-2 text-white/80">{t('pwa.install_app_desc')}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                deferredInstallPrompt.prompt().then(() => {
                  setDeferredInstallPrompt(null);
                  setShowInstallBanner(false);
                });
              }}
              className="px-4 py-2 bg-white text-indigo-600 font-bold rounded-xl hover:bg-white/90 transition-colors"
            >
              {t('pwa.install_app')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInstallBanner(false);
                localStorage.setItem('stellarsplit_pwa_install_dismissed', 'true');
              }}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Receive panel modal */}
      {showReceivePanel && walletAddress && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowReceivePanel(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-sm w-full modal-soft-scale" onClick={(e) => e.stopPropagation()}>
            <ReceivePanel
              address={walletAddress}
              onClose={() => setShowReceivePanel(false)}
              onMobileBridge={setBridgeUri}
              onCopy={() => addToast(t('common.copied') || 'Copied')}
              t={t}
            />
          </div>
        </div>
      )}

      <Footer />

      {bridgeUri && (
        <WalletBridge
          uri={bridgeUri}
          onClose={() => setBridgeUri(null)}
        />
      )}

      <EasterEgg />
      <AutoPitch />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

