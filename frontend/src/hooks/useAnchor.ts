import { useState, useCallback } from 'react';
import { authenticateAnchor, initiateWithdrawal, initiateDeposit } from '../lib/anchor';

export function useAnchor(isDemo?: boolean) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWithdrawal = useCallback(async (userAddress: string, amount: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Authenticate (SEP-10)
      const token = await authenticateAnchor(userAddress, isDemo);
      
      // 2. Start Interactive Flow (SEP-24)
      const url = await initiateWithdrawal(token, amount, isDemo);
      
      return { url, token };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anchor error';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const startDeposit = useCallback(async (userAddress: string, amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await authenticateAnchor(userAddress, isDemo);
      const url = await initiateDeposit(token, amount, isDemo);
      return { url, token };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anchor error';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  return {
    startWithdrawal,
    startDeposit,
    loading,
    error
  };
}
