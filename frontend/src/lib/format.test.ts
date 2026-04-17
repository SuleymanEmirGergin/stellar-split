import { describe, it, expect } from 'vitest';
import { formatXLM, maskAddress } from './format';

describe('formatXLM', () => {
  it('returns "1" for formatXLM(1) — trailing zeros stripped', () => {
    expect(formatXLM(1)).toBe('1');
  });

  it('returns "1.5" for formatXLM(1.5)', () => {
    expect(formatXLM(1.5)).toBe('1.5');
  });

  it('returns "1.5" for formatXLM(1.50) — trailing zero stripped', () => {
    expect(formatXLM(1.50)).toBe('1.5');
  });

  it('returns "0" for formatXLM(0)', () => {
    expect(formatXLM(0)).toBe('0');
  });

  it('returns "0" for formatXLM(-5) — negative clamped to 0', () => {
    expect(formatXLM(-5)).toBe('0');
  });

  it('returns "0.00" for formatXLM(NaN)', () => {
    expect(formatXLM(NaN)).toBe('0.00');
  });

  it('returns "1.2346" for formatXLM(1.234567, 4) — rounded to 4 decimals', () => {
    expect(formatXLM(1.234567, 4)).toBe('1.2346');
  });

  it('returns "10" for formatXLM(10, 0) — 0 decimals', () => {
    expect(formatXLM(10, 0)).toBe('10');
  });
});

describe('maskAddress', () => {
  it('masks a long address with default start/end of 4', () => {
    expect(maskAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('GABC...WXYZ');
  });

  it('returns original string when address is too short to mask (length <= start + end)', () => {
    expect(maskAddress('GABCDE', 4, 4)).toBe('GABCDE');
  });

  it('returns empty string for empty input', () => {
    expect(maskAddress('')).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(maskAddress(null as unknown as string)).toBe('');
  });

  it('masks with custom start=3 end=3', () => {
    expect(maskAddress('GABCDEFGH', 3, 3)).toBe('GAB...FGH');
  });

  it('masks with custom start=2 end=2', () => {
    expect(maskAddress('GABCDEFGHIJ', 2, 2)).toBe('GA...IJ');
  });
});
