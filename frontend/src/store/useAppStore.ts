import { create } from 'zustand';
import type { AuthUser } from '../lib/api';

interface AppState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  backendUser: AuthUser | null;
  setBackendUser: (user: AuthUser | null) => void;
}

// E2E: Playwright sets window.__PLAYWRIGHT_E2E_WALLET__ before page scripts run.
// Initialize the store synchronously so React Query hooks enabled by callerAddress work on first render.
const e2eWallet =
  typeof window !== 'undefined'
    ? (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ ?? ''
    : '';

export const useAppStore = create<AppState>((set) => ({
  walletAddress: e2eWallet,
  setWalletAddress: (address) => set({ walletAddress: address }),
  backendUser: null,
  setBackendUser: (user) => set({ backendUser: user }),
}));
