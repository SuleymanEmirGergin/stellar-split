import { create } from 'zustand';

interface AppState {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  // We can add more global state items here if needed
}

export const useAppStore = create<AppState>((set) => ({
  walletAddress: '',
  setWalletAddress: (address) => set({ walletAddress: address }),
}));
