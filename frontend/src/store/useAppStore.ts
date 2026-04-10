import { create } from 'zustand';
import type { AuthUser } from '../lib/api';

interface AppState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  backendUser: AuthUser | null;
  setBackendUser: (user: AuthUser | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  walletAddress: '',
  setWalletAddress: (address) => set({ walletAddress: address }),
  backendUser: null,
  setBackendUser: (user) => set({ backendUser: user }),
}));
