import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authenticateAnchor,
  initiateWithdrawal,
  initiateDeposit,
  pollTransactionStatus,
  ANCHOR_DOMAIN,
  USDC_ASSET_CODE,
} from './anchor';

describe('ANCHOR constants', () => {
  it('exports the correct ANCHOR_DOMAIN', () => {
    expect(ANCHOR_DOMAIN).toBe('extstellar.moneygram.com');
  });

  it('exports USDC_ASSET_CODE as USDC', () => {
    expect(USDC_ASSET_CODE).toBe('USDC');
  });
});

describe('authenticateAnchor', () => {
  it('returns demo_jwt_token in demo mode', async () => {
    const token = await authenticateAnchor('GABC123', true);
    expect(token).toBe('demo_jwt_token');
  });

  it('throws when anchor challenge response is missing transaction', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({}),
    } as any);
    await expect(authenticateAnchor('GABC123')).rejects.toThrow('Failed to get challenge');
  });
});

describe('initiateWithdrawal', () => {
  it('returns mock demo URL in demo mode', async () => {
    const url = await initiateWithdrawal('tok', '100', true);
    expect(url).toContain('moneygram-demo-withdraw');
  });

  it('throws when anchor returns unexpected response type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ type: 'error', error: 'bad request' }),
    } as any);
    await expect(initiateWithdrawal('tok', '100')).rejects.toThrow('Unexpected response from anchor');
  });

  it('returns interactive URL when anchor returns correct response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ type: 'interactive_customer_info_needed', url: 'https://anchor.example/interactive' }),
    } as any);
    const url = await initiateWithdrawal('tok', '50');
    expect(url).toBe('https://anchor.example/interactive');
  });
});

describe('initiateDeposit', () => {
  it('returns mock demo URL in demo mode', async () => {
    const url = await initiateDeposit('tok', '50', true);
    expect(url).toContain('moneygram-demo-deposit');
  });

  it('throws when anchor returns unexpected response type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ type: 'error', error: 'bad' }),
    } as any);
    await expect(initiateDeposit('tok', '50')).rejects.toThrow('Unexpected response from anchor');
  });
});

describe('pollTransactionStatus', () => {
  it('returns parsed JSON from the anchor endpoint', async () => {
    const mockData = { transaction: { status: 'completed', id: 'tx123' } };
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockData),
    } as any);
    const result = await pollTransactionStatus('jwt_tok', 'tx123');
    expect(result).toEqual(mockData);
  });
});
