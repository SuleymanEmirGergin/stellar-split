/**
 * Smart Vaults & AI Yield Engine
 * Simulating automated wealth building on Stellar via Liquidity Pools and AMMs.
 */

export interface VaultStats {
  totalSaved: number;
  unrealizedYield: number;
  apy: number;
  autoInvestEnabled: boolean;
  savingsGoal: number;
  history: Array<{ date: string; amount: number }>;
}

export type AssetPair = 'USDC/XLM' | 'USDC/EURC' | 'AQUA/XLM';

/**
 * Calculates the "Round-up" amount for a transaction.
 * Example: 9.2 XLM -> 0.8 XLM round-up to the next integer.
 */
export function calculateRoundUp(amount: number): number {
  if (amount <= 0) return 0;
  const nextInteger = Math.ceil(amount);
  const diff = nextInteger - amount;
  // If exact integer, round to next (e.g., 10 -> 11) or set a minimum if desired
  return diff === 0 ? 1 : Number(diff.toFixed(2));
}

/**
 * Persists the auto-invest preference.
 */
export function toggleAutoInvest(enabled: boolean): void {
  localStorage.setItem('stellarsplit_autoinvest', JSON.stringify(enabled));
}

/**
 * Gets currently saved vault data.
 */
export function getVaultStats(): VaultStats {
  const saved = localStorage.getItem('stellarsplit_vault_stats');
  const autoinvest = localStorage.getItem('stellarsplit_autoinvest');
  
  if (saved) return JSON.parse(saved);

  // Default initial stats for demo
  return {
    totalSaved: 42.50,
    unrealizedYield: 1.25,
    apy: 8.4, // Targeted LP yield
    autoInvestEnabled: autoinvest ? JSON.parse(autoinvest) : false,
    savingsGoal: 500,
    history: [
      { date: '2026-02-25', amount: 2.1 },
      { date: '2026-02-26', amount: 5.4 },
      { date: '2026-02-28', amount: 1.2 },
      { date: '2026-03-01', amount: 3.8 }
    ]
  };
}

/**
 * Updates vault balance (Mock for demonstration)
 */
export function addToVault(amount: number): void {
  const stats = getVaultStats();
  stats.totalSaved += amount;
  stats.history.push({ 
    date: new Date().toISOString().split('T')[0], 
    amount 
  });
  localStorage.setItem('stellarsplit_vault_stats', JSON.stringify(stats));
}
