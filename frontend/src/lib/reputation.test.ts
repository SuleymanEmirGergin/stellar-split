import { describe, it, expect } from 'vitest';
import {
  getTier,
  getTierColor,
  evaluateUnlockedThemes,
  calculateReputationScore,
} from './reputation';

describe('getTier', () => {
  it('score=0 → Newcomer', () => {
    expect(getTier(0)).toBe('Newcomer');
  });

  it('score=349 → still Newcomer', () => {
    expect(getTier(349)).toBe('Newcomer');
  });

  it('score=350 → Trusted', () => {
    expect(getTier(350)).toBe('Trusted');
  });

  it('score=599 → still Trusted', () => {
    expect(getTier(599)).toBe('Trusted');
  });

  it('score=600 → Elite', () => {
    expect(getTier(600)).toBe('Elite');
  });

  it('score=800 → Legend', () => {
    expect(getTier(800)).toBe('Legend');
  });
});

describe('getTierColor', () => {
  it('getTierColor("Newcomer") → returns a non-empty string', () => {
    const color = getTierColor('Newcomer');
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });
});

describe('evaluateUnlockedThemes', () => {
  it('score=0, groupCount=0, no badges → includes "classic"', () => {
    expect(evaluateUnlockedThemes(0, 0, [])).toContain('classic');
  });

  it('score=800, groupCount=0, no badges → includes "legendary"', () => {
    expect(evaluateUnlockedThemes(800, 0, [])).toContain('legendary');
  });

  it('score=0, groupCount=5, no badges → includes "veteran"', () => {
    expect(evaluateUnlockedThemes(0, 5, [])).toContain('veteran');
  });

  it('score=0, groupCount=0, badgeId=1 → includes "speedster"', () => {
    expect(evaluateUnlockedThemes(0, 0, [1])).toContain('speedster');
  });
});

describe('calculateReputationScore', () => {
  it('"GAAA", no groups, not demo → score is in range 0–1000', () => {
    const profile = calculateReputationScore('GAAA', [], false);
    expect(profile.score).toBeGreaterThanOrEqual(0);
    expect(profile.score).toBeLessThanOrEqual(1000);
  });
});
