import { useState, useCallback } from 'react';
import { adviseFinancial, type FinancialAdvice } from '../lib/ai';

export function useFinancialAdvisor(walletAddress: string) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<FinancialAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAdvice = useCallback(async (groups: unknown[], balances: Record<string, number>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adviseFinancial(walletAddress, { groups, balances });
      setAdvice(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get financial advice');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  return { advice, loading, error, refreshAdvice };
}
