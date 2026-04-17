import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getReferralData, processInvite, claimRewards } from './referral';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('getReferralData', () => {
  it('creates a new record for a first-time wallet address', () => {
    const record = getReferralData('GABC123');
    expect(record.friendsJoined).toBe(0);
    expect(record.tier).toBe('Starter');
    expect(typeof record.code).toBe('string');
  });

  it('returns the same record on subsequent calls', () => {
    const r1 = getReferralData('GABC123');
    const r2 = getReferralData('GABC123');
    expect(r1.code).toBe(r2.code);
  });

  it('generates different codes for different wallets', () => {
    const r1 = getReferralData('GABC123');
    const r2 = getReferralData('GXYZ789');
    expect(r1.code).not.toBe(r2.code);
  });
});

describe('processInvite', () => {
  it('returns false when the referral code does not exist in global store', () => {
    const result = processInvite('BADCODE', 'GNEW123');
    expect(result).toBe(false);
  });

  it('returns true and increments friendsJoined when code is valid', () => {
    // Seed the global store manually
    const record = getReferralData('GOWNER');
    const globalStore: Record<string, any> = {};
    globalStore['GOWNER'] = record;
    localStorage.setItem('stellarsplit_global_referrals', JSON.stringify(globalStore));

    const success = processInvite(record.code, 'GNEWFRIEND');
    expect(success).toBe(true);

    const updated = getReferralData('GOWNER');
    expect(updated.friendsJoined).toBe(1);
  });

  it('upgrades tier to Pro after 3 friends', () => {
    const record = getReferralData('GOWNER2');
    record.friendsJoined = 2;
    const globalStore: Record<string, any> = { GOWNER2: record };
    localStorage.setItem('stellarsplit_global_referrals', JSON.stringify(globalStore));

    processInvite(record.code, 'GNEW3');
    const updated = getReferralData('GOWNER2');
    expect(updated.tier).toBe('Pro');
  });

  it('upgrades tier to Influencer after 10 friends', () => {
    const record = getReferralData('GOWNER3');
    record.friendsJoined = 9;
    const globalStore: Record<string, any> = { GOWNER3: record };
    localStorage.setItem('stellarsplit_global_referrals', JSON.stringify(globalStore));

    processInvite(record.code, 'GNEW10');
    const updated = getReferralData('GOWNER3');
    expect(updated.tier).toBe('Influencer');
  });
});

describe('claimRewards', () => {
  it('returns 0 when no record exists', async () => {
    expect(await claimRewards('GNORECORD')).toBe(0);
  });

  it('returns 0 when unclaimedRewards is 0', async () => {
    getReferralData('GCLAIMER');
    expect(await claimRewards('GCLAIMER')).toBe(0);
  });

  it('returns the unclaimed amount and resets it to 0', async () => {
    const record = getReferralData('GCLAIMER2');
    record.unclaimedRewards = 15;
    localStorage.setItem('stellarsplit_referrals_GCLAIMER2', JSON.stringify(record));

    const promise = claimRewards('GCLAIMER2');
    await vi.runAllTimersAsync();
    const claimed = await promise;
    expect(claimed).toBe(15);

    const updated = getReferralData('GCLAIMER2');
    expect(updated.unclaimedRewards).toBe(0);
  });
});
