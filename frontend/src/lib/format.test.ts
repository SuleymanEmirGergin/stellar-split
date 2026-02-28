import { describe, it, expect } from 'vitest';
import { formatXLM, maskAddress } from './format';

describe('formatXLM', () => {
  it('formats with default 2 decimals', () => {
    expect(formatXLM(0)).toBe('0');
    expect(formatXLM(1.2)).toBe('1.2');
    expect(formatXLM(1.23)).toBe('1.23');
    expect(formatXLM(1234.56)).toBe('1234.56');
  });

  it('respects custom decimals', () => {
    expect(formatXLM(1.234567, 4)).toBe('1.2346');
    expect(formatXLM(1, 0)).toBe('1');
    expect(formatXLM(1.5, 0)).toBe('2');
  });

  it('handles invalid input', () => {
    expect(formatXLM(Number.NaN)).toBe('0.00');
    expect(formatXLM(-1)).toBe('0');
  });
});

describe('maskAddress', () => {
  it('masks with default start=4 end=4', () => {
    expect(maskAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('GABC...WXYZ');
  });

  it('respects custom start and end', () => {
    expect(maskAddress('GABCDEFGHIJ', 2, 2)).toBe('GA...IJ');
    expect(maskAddress('GABCDEFGHIJ', 6, 4)).toBe('GABCDE...GHIJ');
  });

  it('returns full string when shorter than start+end', () => {
    expect(maskAddress('GABCDE')).toBe('GABCDE');
    expect(maskAddress('GAB')).toBe('GAB');
  });

  it('handles empty or invalid input', () => {
    expect(maskAddress('')).toBe('');
    expect(maskAddress('short')).toBe('short');
  });
});
