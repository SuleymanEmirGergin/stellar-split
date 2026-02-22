/**
 * DeFi & Yield Logic for StellarSplit.
 * APY: VITE_DEFI_APY_URL (JSON { apy: number }) veya VITE_DEFI_APY (sayı) ile canlı; yoksa MOCK_APY.
 */

export const MOCK_APY = 7.5; // 7.5% APY fallback

export interface VaultState {
  totalStaked: number;
  yieldEarned: number;
  lastUpdate: number;
  active: boolean;
}

/** Canlı APY: env'de URL veya sabit sayı varsa onu kullanır, yoksa MOCK_APY. */
export async function getLiveApy(): Promise<number> {
  const url = import.meta.env.VITE_DEFI_APY_URL as string | undefined;
  const fallback = import.meta.env.VITE_DEFI_APY;
  const fallbackNum = typeof fallback === 'string' ? parseFloat(fallback) : Number(fallback);
  if (url && url.startsWith('http')) {
    try {
      const res = await fetch(url);
      const data = (await res.json()) as { apy?: number };
      if (typeof data?.apy === 'number' && Number.isFinite(data.apy)) return data.apy;
    } catch {
      /* ignore */
    }
  }
  if (Number.isFinite(fallbackNum)) return fallbackNum;
  return MOCK_APY;
}

export function calculateYield(balance: number, durationMs: number, apy: number = MOCK_APY): number {
  if (balance <= 0) return 0;
  const days = durationMs / (1000 * 60 * 60 * 24);
  return balance * (apy / 100) * (days / 365);
}

const VAULT_KEY = (groupId: number) => `stellarsplit_vault_${groupId}`;

export function saveVault(groupId: number, state: VaultState) {
  localStorage.setItem(VAULT_KEY(groupId), JSON.stringify(state));
}

export function loadVault(groupId: number): VaultState {
  const raw = localStorage.getItem(VAULT_KEY(groupId));
  if (!raw) return { totalStaked: 0, yieldEarned: 0, lastUpdate: Date.now(), active: false };
  return JSON.parse(raw);
}

export function updateVaultYield(state: VaultState, apy: number = MOCK_APY): VaultState {
  if (!state.active || state.totalStaked <= 0) return state;
  const now = Date.now();
  const diff = now - state.lastUpdate;
  const added = calculateYield(state.totalStaked, diff, apy);
  return {
    ...state,
    yieldEarned: state.yieldEarned + added,
    lastUpdate: now
  };
}
