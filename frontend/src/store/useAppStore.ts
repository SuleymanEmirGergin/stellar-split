import { create } from 'zustand';
import type { AuthUser } from '../lib/api';

interface AppState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  backendUser: AuthUser | null;
  setBackendUser: (user: AuthUser | null) => void;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

// E2E: Playwright sets window.__PLAYWRIGHT_E2E_WALLET__ before page scripts run.
// Initialize the store synchronously so React Query hooks enabled by callerAddress work on first render.
const e2eWallet =
  typeof window !== 'undefined'
    ? (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ ?? ''
    : '';

const DEMO_KEY = 'stellarsplit_demo_mode';

// ── Wallet persistence ────────────────────────────────────────────────────────
//
// We persist the connected Stellar address in localStorage so that a hard
// refresh (Ctrl+Shift+R / DNS retry / browser cache miss) doesn't drop the
// user back onto Landing while waiting for Freighter to respond.
//
// IMPORTANT: this is a public Stellar address — not a secret. It carries no
// privacy risk. The actual signing capability stays inside the Freighter
// extension; we only persist the address to avoid the brief UI flash where
// the app thinks it's disconnected.
//
// On mount, App.tsx still calls `getFreighterAddress()` to reconcile —
// if Freighter is gone, locked, or returns a different address, it
// overwrites the persisted value via setWalletAddress(). This keeps the
// cache from going stale.
const WALLET_KEY = 'stellarsplit_wallet_address';

function readPersistedWallet(): string {
  if (e2eWallet) return e2eWallet; // E2E override always wins.
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(WALLET_KEY) ?? '';
  } catch {
    return '';
  }
}

function writePersistedWallet(address: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (address) localStorage.setItem(WALLET_KEY, address);
    else localStorage.removeItem(WALLET_KEY);
  } catch {
    /* localStorage unavailable (Safari private mode, full disk) — ignore */
  }
}

export const useAppStore = create<AppState>((set) => ({
  walletAddress: readPersistedWallet(),
  setWalletAddress: (address) => {
    writePersistedWallet(address);
    set({ walletAddress: address });
  },
  backendUser: null,
  setBackendUser: (user) => set({ backendUser: user }),
  demoMode: typeof window !== 'undefined' && localStorage.getItem(DEMO_KEY) === 'true',
  setDemoMode: (enabled) => {
    localStorage.setItem(DEMO_KEY, String(enabled));
    set({ demoMode: enabled });
  },
}));
