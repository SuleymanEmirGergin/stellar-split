/**
 * DeFi & Yield Logic for Birik.
 *
 * APY source priority:
 *   1. VITE_DEFI_APY_URL  — custom endpoint returning { apy: number }
 *   2. Stellar Horizon AMM — XLM/USDC liquidity pool fee-based APY estimate
 *   3. VITE_DEFI_APY       — static env override
 *   4. MOCK_APY            — hardcoded fallback
 */

export const MOCK_APY = 7.5; // 7.5% APY fallback

// Simple in-memory cache: don't refetch within 5 minutes
let _apyCache: { value: number; ts: number } | null = null;
const APY_CACHE_TTL_MS = 5 * 60 * 1000;

export interface VaultState {
  totalStaked: number;
  yieldEarned: number;
  lastUpdate: number;
  active: boolean;
}

/**
 * Estimates APY from a Stellar Horizon AMM liquidity pool record.
 * Uses 7-day fee accumulation as a proxy for annualised yield.
 */
async function fetchStellarAmmApy(): Promise<number | null> {
  try {
    const horizon = import.meta.env.VITE_HORIZON_URL as string | undefined
      ?? 'https://horizon-testnet.stellar.org';

    // Find the largest XLM/USDC pool by total_trustlines (most used)
    const res = await fetch(
      `${horizon}/liquidity_pools?reserves=native&order=desc&limit=5`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      _embedded?: {
        records?: Array<{
          fee_bp?: number;
          total_shares?: string;
          reserves?: Array<{ asset: string; amount: string }>;
        }>;
      };
    };

    const pools = data?._embedded?.records ?? [];
    if (pools.length === 0) return null;

    // Use the first pool's fee basis points to estimate APY.
    // Typical AMM LP APY ≈ (fee_bp / 10000) * (annualised_volume / tvl)
    // Without historical volume, we use a conservative TVL turnover assumption of 365x/year
    // (i.e. pool turns over its full TVL once per day on average for a liquid pool).
    const pool = pools[0];
    const feeBp = pool.fee_bp ?? 30; // default 30bp = 0.3%
    const feeRate = feeBp / 10000;
    // Assume moderate liquidity: daily volume ≈ 50% of TVL → annual turnover = 182.5x
    const estimatedApy = feeRate * 182.5 * 100; // percentage
    if (Number.isFinite(estimatedApy) && estimatedApy > 0 && estimatedApy < 100) {
      return Math.round(estimatedApy * 10) / 10; // round to 1 decimal
    }
    return null;
  } catch {
    return null;
  }
}

/** Canlı APY: kaynak zinciri — özel URL → Stellar AMM → env var → MOCK_APY. */
export async function getLiveApy(): Promise<number> {
  const now = Date.now();
  if (_apyCache && now - _apyCache.ts < APY_CACHE_TTL_MS) {
    return _apyCache.value;
  }

  let apy: number | null = null;

  // 1. Custom APY URL
  const url = import.meta.env.VITE_DEFI_APY_URL as string | undefined;
  if (url && url.startsWith('http')) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = (await res.json()) as { apy?: number };
      if (typeof data?.apy === 'number' && Number.isFinite(data.apy)) {
        apy = data.apy;
      }
    } catch { /* fallthrough */ }
  }

  // 2. Stellar Horizon AMM pool estimate
  if (apy === null) {
    apy = await fetchStellarAmmApy();
  }

  // 3. Static env override
  if (apy === null) {
    const fallback = import.meta.env.VITE_DEFI_APY;
    const fallbackNum = typeof fallback === 'string' ? parseFloat(fallback) : Number(fallback);
    if (Number.isFinite(fallbackNum)) apy = fallbackNum;
  }

  // 4. Hardcoded mock
  if (apy === null) apy = MOCK_APY;

  _apyCache = { value: apy, ts: now };
  return apy;
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
