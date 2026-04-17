import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMintedSBTs, isBadgeMinted, mintSBT } from './sbt';

vi.mock('./badges', () => ({
  BADGES: [
    { id: 'flash', name: 'Flash', description: 'Fast settler', icon: '⚡' },
    { id: 'vault-master', name: 'Vault Master', description: 'Savings guru', icon: '🏦' },
    { id: 'builder', name: 'Builder', description: 'Referral king', icon: '🔨' },
  ],
}));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('getMintedSBTs', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getMintedSBTs()).toEqual([]);
  });

  it('returns previously stored SBTs', () => {
    const mock = [{ tokenId: 'sbt_flash_1', name: 'StellarSplit SBT: Flash' }];
    localStorage.setItem('stellarsplit_minted_sbts', JSON.stringify(mock));
    expect(getMintedSBTs()).toHaveLength(1);
  });
});

describe('isBadgeMinted', () => {
  it('returns false when no SBTs are minted', () => {
    expect(isBadgeMinted('flash')).toBe(false);
  });

  it('returns true when an SBT for the badge exists', () => {
    localStorage.setItem('stellarsplit_minted_sbts', JSON.stringify([{ tokenId: 'sbt_flash_42' }]));
    expect(isBadgeMinted('flash')).toBe(true);
  });

  it('returns false for a different badge id', () => {
    localStorage.setItem('stellarsplit_minted_sbts', JSON.stringify([{ tokenId: 'sbt_flash_42' }]));
    expect(isBadgeMinted('vault-master')).toBe(false);
  });
});

describe('mintSBT', () => {
  it('persists the minted SBT to localStorage', async () => {
    const badge = { id: 'flash', name: 'Flash', description: 'Fast settler', icon: '⚡' };
    const promise = mintSBT(badge as any, 'GABC123');
    await vi.runAllTimersAsync();
    await promise;
    const stored = getMintedSBTs();
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenId).toContain('flash');
  });

  it('appends to existing minted SBTs', async () => {
    const badge1 = { id: 'flash', name: 'Flash', description: 'Fast', icon: '⚡' };
    const badge2 = { id: 'vault-master', name: 'Vault Master', description: 'Savings', icon: '🏦' };
    const p1 = mintSBT(badge1 as any, 'GABC123');
    await vi.runAllTimersAsync();
    await p1;
    const p2 = mintSBT(badge2 as any, 'GABC123');
    await vi.runAllTimersAsync();
    await p2;
    expect(getMintedSBTs()).toHaveLength(2);
  });

  it('returns metadata with correct structure', async () => {
    const badge = { id: 'builder', name: 'Builder', description: 'Referral', icon: '🔨' };
    const promise = mintSBT(badge as any, 'GABC123');
    await vi.runAllTimersAsync();
    const metadata = await promise;
    expect(metadata).toMatchObject({
      name: expect.stringContaining('Builder'),
      issuer: expect.any(String),
      mintedAt: expect.any(Number),
    });
  });
});
