import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRoundUp,
  toggleAutoInvest,
  getVaultStats,
  addToVault,
} from './yield';

beforeEach(() => {
  localStorage.clear();
});

describe('calculateRoundUp', () => {
  it('amount=0 → returns 0', () => {
    expect(calculateRoundUp(0)).toBe(0);
  });

  it('amount=-1 (negative) → returns 0', () => {
    expect(calculateRoundUp(-1)).toBe(0);
  });

  it('amount=2 (exact integer) → returns 1 (rounds up to next integer)', () => {
    expect(calculateRoundUp(2)).toBe(1);
  });

  it('amount=1.5 → returns 0.5', () => {
    expect(calculateRoundUp(1.5)).toBe(0.5);
  });

  it('amount=2.99 → returns approximately 0.01', () => {
    expect(calculateRoundUp(2.99)).toBeCloseTo(0.01, 2);
  });
});

describe('toggleAutoInvest', () => {
  it('toggleAutoInvest(true) → localStorage stores "true"', () => {
    toggleAutoInvest(true);
    expect(localStorage.getItem('stellarsplit_autoinvest')).toBe('true');
  });

  it('toggleAutoInvest(false) → localStorage stores "false"', () => {
    toggleAutoInvest(false);
    expect(localStorage.getItem('stellarsplit_autoinvest')).toBe('false');
  });
});

describe('addToVault', () => {
  it('addToVault(10) → getVaultStats().totalSaved increases by 10', () => {
    const before = getVaultStats().totalSaved;
    addToVault(10);
    const after = getVaultStats().totalSaved;
    expect(after).toBeCloseTo(before + 10, 5);
  });
});
