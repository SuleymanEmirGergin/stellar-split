import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/ai', () => ({
  adviseFinancial: vi.fn().mockResolvedValue({ summary: 'ok', tips: [] }),
}));

import { useFinancialAdvisor } from './useFinancialAdvisor';
import { adviseFinancial } from '../lib/ai';

describe('useFinancialAdvisor', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initial state has advice=null, loading=false, error=null', () => {
    const { result } = renderHook(() => useFinancialAdvisor());
    expect(result.current.advice).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refreshAdvice sets advice on success', async () => {
    const { result } = renderHook(() => useFinancialAdvisor());
    await act(async () => {
      await result.current.refreshAdvice();
    });
    await waitFor(() => {
      expect(result.current.advice).toEqual({ summary: 'ok', tips: [] });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refreshAdvice sets error on failure', async () => {
    (adviseFinancial as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('AI error'));
    const { result } = renderHook(() => useFinancialAdvisor());
    await act(async () => {
      await result.current.refreshAdvice();
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.advice).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loading is true during the call', async () => {
    let resolveAdvise!: (value: unknown) => void;
    (adviseFinancial as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((res) => { resolveAdvise = res; })
    );
    const { result } = renderHook(() => useFinancialAdvisor());
    act(() => {
      result.current.refreshAdvice();
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    await act(async () => {
      resolveAdvise({ summary: 'ok', tips: [] });
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
