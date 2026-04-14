import { describe, it, expect } from 'vitest';
import { truncateAddress, formatAmount } from './stellar';

describe('truncateAddress', () => {
  it('truncates a standard Stellar address', () => {
    const addr = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    expect(truncateAddress(addr)).toBe('GBRPYH...C7OX2H');
  });

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('GABCDE')).toBe('GABCDE');
    expect(truncateAddress('short')).toBe('short');
  });

  it('handles empty or falsy input', () => {
    expect(truncateAddress('')).toBe('');
    // @ts-expect-error: testing null input
    expect(truncateAddress(null)).toBeFalsy();
  });

  it('handles exactly 12 character input', () => {
    expect(truncateAddress('ABCDEFGHIJKL')).toBe('ABCDEF...GHIJKL');
  });
});

describe('formatAmount', () => {
  it('converts stroops to XLM (divide by 10^7)', () => {
    expect(formatAmount(10_000_000)).toBe('1');
    expect(formatAmount(50_000_000)).toBe('5');
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('handles fractional amounts', () => {
    const result = formatAmount(1_234_567);
    expect(parseFloat(result)).toBeCloseTo(0.1234567, 5);
  });
});
