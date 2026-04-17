import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/anchor', () => ({
  authenticateAnchor: vi.fn().mockResolvedValue('mock-token'),
  initiateWithdrawal: vi.fn().mockResolvedValue('https://anchor.example/withdraw'),
  initiateDeposit: vi.fn().mockResolvedValue('https://anchor.example/deposit'),
}));

import { useAnchor } from './useAnchor';
import { authenticateAnchor, initiateWithdrawal, initiateDeposit } from '../lib/anchor';

describe('useAnchor', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initial state has loading=false and error=null', () => {
    const { result } = renderHook(() => useAnchor());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('startWithdrawal returns url and token', async () => {
    const { result } = renderHook(() => useAnchor());
    let outcome: { url: string; token: string } | undefined;
    await act(async () => {
      outcome = await result.current.startWithdrawal('USDC', 'GAAA');
    });
    expect(outcome?.token).toBe('mock-token');
    expect(outcome?.url).toBe('https://anchor.example/withdraw');
    expect(authenticateAnchor).toHaveBeenCalled();
    expect(initiateWithdrawal).toHaveBeenCalled();
  });

  it('startDeposit returns url and token', async () => {
    const { result } = renderHook(() => useAnchor());
    let outcome: { url: string; token: string } | undefined;
    await act(async () => {
      outcome = await result.current.startDeposit('USDC', 'GAAA');
    });
    expect(outcome?.token).toBe('mock-token');
    expect(outcome?.url).toBe('https://anchor.example/deposit');
    expect(authenticateAnchor).toHaveBeenCalled();
    expect(initiateDeposit).toHaveBeenCalled();
  });

  it('sets error state when an operation throws', async () => {
    (authenticateAnchor as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('auth failed'));
    const { result } = renderHook(() => useAnchor());
    await act(async () => {
      try {
        await result.current.startWithdrawal('USDC', 'GAAA');
      } catch {
        // expected
      }
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
