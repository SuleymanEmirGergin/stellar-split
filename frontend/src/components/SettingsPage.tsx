import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Palette,
  Shield,
  Bell,
  Download,
  Trash2,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Cloud,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { maskAddress } from '../lib/format';
import { downloadGdprExport, usersApi, getAccessToken } from '../lib/api';
import { useToast } from './Toast';
import { useI18n } from '../lib/i18n';
import { useMotionEnabled } from '../lib/motion';

interface SettingsPageProps {
  dark: boolean;
  toggleTheme: () => void;
  onDisconnect: () => void;
}

type Lang = 'tr' | 'en' | 'de' | 'es';
const LANG_LABELS: Record<Lang, string> = { tr: 'Türkçe', en: 'English', de: 'Deutsch', es: 'Español' };

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon size={14} className="text-indigo-400" />
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-foreground">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

export function SettingsPage({ dark, toggleTheme, onDisconnect }: SettingsPageProps) {
  const walletAddress = useAppStore((s) => s.walletAddress);
  const backendUser = useAppStore((s) => s.backendUser);
  const hasJwt = !!getAccessToken();
  const { addToast } = useToast();
  const { lang, setLang } = useI18n();
  const motionOn = useMotionEnabled();

  // GDPR export state
  const [exporting, setExporting] = useState(false);

  // Delete account state
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [deleteInput, setDeleteInput] = useState('');

  // Browser notification permission
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  // Motion preference
  const [reduceMotion, setReduceMotion] = useState(() =>
    localStorage.getItem('stellarsplit_reduce_motion') === 'true',
  );

  const handleExport = useCallback(async () => {
    if (!hasJwt) return;
    setExporting(true);
    try {
      await downloadGdprExport();
      addToast('Data export downloaded.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      addToast(msg, 'error');
    } finally {
      setExporting(false);
    }
  }, [hasJwt, addToast]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteInput !== 'DELETE') return;
    setDeletePhase('deleting');
    try {
      await usersApi.deleteAccount();
      addToast('Account deleted. Goodbye.', 'info');
      onDisconnect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      addToast(msg, 'error');
      setDeletePhase('idle');
      setDeleteInput('');
    }
  }, [deleteInput, addToast, onDisconnect]);

  const handleRequestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      addToast('Browser notifications enabled.', 'success');
    }
  }, [addToast]);

  const toggleReduceMotion = useCallback(() => {
    const next = !reduceMotion;
    setReduceMotion(next);
    localStorage.setItem('stellarsplit_reduce_motion', String(next));
  }, [reduceMotion]);

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, appearance, and data.</p>
      </div>

      {/* Section 1 — Account */}
      <SectionCard icon={User} title="Account">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Wallet address</p>
              <p className="text-sm font-mono font-bold text-foreground">{maskAddress(walletAddress)}</p>
            </div>
            {backendUser && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Reputation</p>
                <p className="text-sm font-black text-indigo-400">{backendUser.reputationScore} pts</p>
              </div>
            )}
          </div>

          {/* Disconnect with inline confirm */}
          <DisconnectButton onDisconnect={onDisconnect} />
        </div>
      </SectionCard>

      {/* Section 2 — Appearance */}
      <SectionCard icon={Palette} title="Appearance">
        <div className="space-y-4">
          {/* Dark / Light */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary/60 border border-white/5 rounded-xl text-xs font-bold hover:bg-white/5 transition-all"
            >
              {dark ? <><Moon size={13} /> Dark</> : <><Sun size={13} /> Light</>}
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Language</span>
            <div className="flex items-center gap-1">
              {(['tr', 'en', 'de', 'es'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    lang === l
                      ? 'bg-indigo-500 text-white'
                      : 'text-muted-foreground hover:bg-white/5'
                  }`}
                  title={LANG_LABELS[l]}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Reduce motion */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Reduce motion</span>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Disables animations app-wide</p>
            </div>
            <button
              onClick={toggleReduceMotion}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${
                reduceMotion ? 'bg-indigo-500' : 'bg-white/10'
              }`}
              style={{ height: '22px' }}
              role="switch"
              aria-checked={reduceMotion}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                  reduceMotion ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
                style={{ width: '18px', height: '18px' }}
              />
            </button>
          </div>

          {!motionOn && (
            <p className="text-[10px] text-amber-400/80">Motion is currently reduced via OS preference or this setting.</p>
          )}
        </div>
      </SectionCard>

      {/* Section 3 — Data & Privacy */}
      {hasJwt && (
        <SectionCard icon={Shield} title="Data & Privacy">
          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Export my data</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">GDPR Art. 20 — downloads your data as JSON</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all disabled:opacity-50"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            </div>

            <div className="border-t border-white/5" />

            {/* Delete account */}
            {deletePhase === 'idle' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-rose-400">Delete account</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Permanently removes all your data</p>
                </div>
                <button
                  onClick={() => setDeletePhase('confirm')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}

            {deletePhase === 'confirm' && (
              <div className="space-y-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-black">This action cannot be undone.</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Type <span className="font-mono font-black text-foreground">DELETE</span> to confirm.</p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-rose-500/50"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'DELETE'}
                    className="flex-1 py-2 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Permanently delete
                  </button>
                  <button
                    onClick={() => { setDeletePhase('idle'); setDeleteInput(''); }}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deletePhase === 'deleting' && (
              <div className="flex items-center gap-2 text-rose-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Deleting account…
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Section 4 — Notifications */}
      <SectionCard icon={Bell} title="Notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Browser notifications</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 capitalize">
                Status: {notifPermission}
              </p>
            </div>
            {notifPermission === 'granted' ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <CheckCircle size={13} />
                Enabled
              </div>
            ) : notifPermission === 'denied' ? (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                <AlertTriangle size={13} />
                Blocked in browser
              </div>
            ) : (
              <button
                onClick={handleRequestNotifications}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all"
              >
                <Bell size={13} />
                Enable
              </button>
            )}
          </div>

          {hasJwt && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Cloud size={11} />
              In-app notifications are always synced from the server.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function DisconnectButton({ onDisconnect }: { onDisconnect: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'confirm'>('idle');

  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('confirm')}
        className="w-full py-2 bg-secondary/60 border border-white/5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:border-white/10 transition-all"
      >
        Disconnect wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground flex-1">Disconnect and return to landing?</span>
      <button
        onClick={onDisconnect}
        className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl hover:bg-rose-500/20 transition-all"
      >
        Yes
      </button>
      <button
        onClick={() => setPhase('idle')}
        className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
