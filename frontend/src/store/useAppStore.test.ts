import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const WALLET_KEY = 'stellarsplit_wallet_address';
const DEMO_KEY = 'stellarsplit_demo_mode';

beforeEach(() => {
  // Clear persisted state and any E2E injection so each test gets a fresh
  // Zustand instance via dynamic import below.
  localStorage.clear();
  if (typeof window !== 'undefined') {
    delete (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__;
  }
});

afterEach(() => {
  localStorage.clear();
});

async function freshStore() {
  // Reset module cache so the store re-runs its initializer (which reads
  // localStorage). Without this all tests share the same hydrated state.
  const m = await import('./useAppStore');
  return m.useAppStore;
}

describe('useAppStore — walletAddress persistence', () => {
  it('hydrates walletAddress from localStorage on init', async () => {
    localStorage.setItem(WALLET_KEY, 'GTEST...PERSISTED');
    // Force a re-import so the initializer reads our seeded value.
    const { useAppStore } = await import('./useAppStore?fresh=1');
    expect(useAppStore.getState().walletAddress).toBe('GTEST...PERSISTED');
  });

  it('returns empty string when nothing is persisted', async () => {
    const { useAppStore } = await import('./useAppStore?fresh=2');
    expect(useAppStore.getState().walletAddress).toBe('');
  });

  it('writes to localStorage on setWalletAddress', async () => {
    const useAppStore = await freshStore();
    useAppStore.getState().setWalletAddress('GFOOBAR123');
    expect(localStorage.getItem(WALLET_KEY)).toBe('GFOOBAR123');
    expect(useAppStore.getState().walletAddress).toBe('GFOOBAR123');
  });

  it('removes from localStorage when setWalletAddress is called with empty string', async () => {
    localStorage.setItem(WALLET_KEY, 'GOLD123');
    const { useAppStore } = await import('./useAppStore?fresh=3');
    useAppStore.getState().setWalletAddress('');
    expect(localStorage.getItem(WALLET_KEY)).toBeNull();
    expect(useAppStore.getState().walletAddress).toBe('');
  });

  it('does not throw when localStorage.setItem fails', async () => {
    const useAppStore = await freshStore();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      // Must not propagate the error to callers.
      expect(() => useAppStore.getState().setWalletAddress('GBOOM')).not.toThrow();
      // State still gets updated even though the persistence write failed.
      expect(useAppStore.getState().walletAddress).toBe('GBOOM');
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('E2E wallet override beats persisted value', async () => {
    localStorage.setItem(WALLET_KEY, 'GPERSISTED');
    (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ =
      'GE2EWALLET';
    const { useAppStore } = await import('./useAppStore?fresh=4');
    expect(useAppStore.getState().walletAddress).toBe('GE2EWALLET');
  });
});

describe('useAppStore — demoMode persistence (regression)', () => {
  it('hydrates demoMode=true from localStorage', async () => {
    localStorage.setItem(DEMO_KEY, 'true');
    const { useAppStore } = await import('./useAppStore?fresh=5');
    expect(useAppStore.getState().demoMode).toBe(true);
  });

  it('persists demoMode toggle to localStorage', async () => {
    const useAppStore = await freshStore();
    useAppStore.getState().setDemoMode(true);
    expect(localStorage.getItem(DEMO_KEY)).toBe('true');
    useAppStore.getState().setDemoMode(false);
    expect(localStorage.getItem(DEMO_KEY)).toBe('false');
  });
});
