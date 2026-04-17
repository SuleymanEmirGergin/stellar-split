import { describe, it, expect } from 'vitest';
import { calculateSocialCredit } from './dao';
import type { Badge } from './badges';

const noBadges: Badge[] = [];

const makeBadges = (count: number): Badge[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `badge_${i}`,
    name: `Badge ${i}`,
    description: '',
    icon: '',
    color: '',
  }));

describe('calculateSocialCredit', () => {
  it('karma=0, no badges → tier=Bronze and votingPower=0', () => {
    const result = calculateSocialCredit(0, noBadges);
    expect(result.tier).toBe('Bronze');
    expect(result.votingPower).toBe(0);
  });

  it('karma=99 → still Bronze', () => {
    const result = calculateSocialCredit(99, noBadges);
    expect(result.tier).toBe('Bronze');
  });

  it('karma=100 → tier=Silver', () => {
    const result = calculateSocialCredit(100, noBadges);
    expect(result.tier).toBe('Silver');
  });

  it('karma=249 → still Silver', () => {
    const result = calculateSocialCredit(249, noBadges);
    expect(result.tier).toBe('Silver');
  });

  it('karma=250 → tier=Gold', () => {
    const result = calculateSocialCredit(250, noBadges);
    expect(result.tier).toBe('Gold');
  });

  it('karma=500 → tier=Platinum', () => {
    const result = calculateSocialCredit(500, noBadges);
    expect(result.tier).toBe('Platinum');
  });

  it('karma=1000 → tier=Diamond', () => {
    const result = calculateSocialCredit(1000, noBadges);
    expect(result.tier).toBe('Diamond');
  });

  it('karma=1000 with 3 badges → votingPower = 1000 + 15 = 1015', () => {
    const result = calculateSocialCredit(1000, makeBadges(3));
    expect(result.votingPower).toBe(1015);
  });

  it('Diamond tier → nextTierProgress is capped at 100', () => {
    const result = calculateSocialCredit(1000, noBadges);
    expect(result.nextTierProgress).toBe(100);
  });
});
