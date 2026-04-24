import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { i18n } from '../lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  /** Set when the caught error is a lazy-chunk 404 (stale deploy). */
  isStaleChunk: boolean;
}

/**
 * Session-storage key used to debounce auto-reload so we don't hammer the
 * browser if the chunk is still missing after reload (e.g. bad deploy).
 */
const RELOAD_TS_KEY = 'stellarsplit_chunk_reload_ts';
const RELOAD_DEBOUNCE_MS = 30_000;

/**
 * Detects errors that mean "the lazy chunk I tried to load doesn't exist
 * on the server anymore" — the classic outcome of Vercel/Netlify deploying
 * a new build while the user had an old tab open. The fix is always the
 * same: hard-reload the page to fetch the new entry bundle's chunk map.
 */
function isLazyChunkError(error: Error | null | undefined): boolean {
  if (!error) return false;
  const msg = String(error.message || '');
  // Chromium / Firefox (Vite + native dynamic import)
  if (/Failed to fetch dynamically imported module/i.test(msg)) return true;
  // Safari
  if (/Importing a module script failed/i.test(msg)) return true;
  // Webpack-style (kept for defence in depth — Birik is Vite, but future-proof)
  if (/Loading chunk [\w-]+ failed/i.test(msg)) return true;
  if (/Loading CSS chunk [\w-]+ failed/i.test(msg)) return true;
  if (error.name === 'ChunkLoadError') return true;
  return false;
}

/**
 * Returns `true` when we should auto-reload; respects the debounce window
 * so a bad deploy (chunk actually missing permanently) doesn't trap the
 * user in an infinite reload loop.
 */
function shouldAutoReloadNow(): boolean {
  try {
    const lastRaw = sessionStorage.getItem(RELOAD_TS_KEY);
    const last = lastRaw ? Number(lastRaw) : 0;
    if (Number.isFinite(last) && Date.now() - last < RELOAD_DEBOUNCE_MS) {
      // Already reloaded within the debounce window — don't loop.
      return false;
    }
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    return true;
  } catch {
    // sessionStorage blocked (Safari private mode, etc.) — fall through to
    // the manual recovery UI so the user isn't stuck in a reload loop.
    return false;
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isStaleChunk: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isStaleChunk: isLazyChunkError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Birik] ErrorBoundary caught:', error, info.componentStack);

    // Stale lazy-chunk: the entry bundle references a chunk hash that the
    // server no longer has (Vercel rolled a new build while this tab was
    // open). Hard-reload to pick up the fresh chunk manifest — but only
    // if we haven't already reloaded very recently, to avoid looping.
    if (isLazyChunkError(error) && shouldAutoReloadNow()) {
      // Let React finish tearing down the subtree before navigating. A
      // microtask is enough — we don't want to block paint of the soft
      // "Refreshing…" fallback below.
      queueMicrotask(() => {
        try {
          window.location.reload();
        } catch {
          /* swallow — fallback UI still visible */
        }
      });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      // Soft "Refreshing to new version…" state while the auto-reload
      // triggered by componentDidCatch kicks in. This is what most users
      // will see for the brief instant before the reload navigates away.
      if (this.state.isStaleChunk) {
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
              <RefreshCw size={40} className="text-indigo-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">
              {i18n.t('common.updating_title')}
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              {i18n.t('common.updating_desc')}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors"
            >
              {i18n.t('common.reload_page')}
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
            <AlertTriangle size={40} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">{i18n.t('common.error_fallback_title')}</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            {i18n.t('common.error_fallback_desc')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            {i18n.t('common.reload_page')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
