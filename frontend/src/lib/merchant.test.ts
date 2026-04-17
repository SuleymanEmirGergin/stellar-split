import { describe, it, expect, vi } from 'vitest';

vi.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    isValidEd25519PublicKey: (key: string) =>
      typeof key === 'string' && key.length >= 50 && key.startsWith('G'),
  },
}));

import { encodeMerchantQR, decodeMerchantQR, isValidMerchantId } from './merchant';

const MOCK_ORIGIN = 'http://localhost:5173';

describe('encodeMerchantQR', () => {
  it('returns a URL with origin, merchant path, and data param', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: MOCK_ORIGIN },
      writable: true,
    });

    const data = { merchantId: 'GABCD', merchantName: 'Shop', amount: '10', currency: 'USDC', category: 'food', timestamp: 1000 };
    const result = encodeMerchantQR(data);
    expect(result.startsWith(`${MOCK_ORIGIN}/join/merchant?data=`)).toBe(true);
  });

  it('encodes data as base64 inside the URL', () => {
    Object.defineProperty(window, 'location', { value: { origin: MOCK_ORIGIN }, writable: true });
    const data = { merchantId: 'GABCD', merchantName: 'Shop', amount: '10', currency: 'USDC', category: 'food', timestamp: 1000 };
    const result = encodeMerchantQR(data);
    const base64 = decodeURIComponent(new URL(result).searchParams.get('data')!);
    expect(JSON.parse(atob(base64))).toEqual(data);
  });
});

describe('decodeMerchantQR', () => {
  it('decodes a previously encoded URL back to the original data', () => {
    Object.defineProperty(window, 'location', { value: { origin: MOCK_ORIGIN }, writable: true });
    const data = { merchantId: 'GABCD', merchantName: 'Cafe', amount: '5', currency: 'XLM', category: 'drink', timestamp: 2000 };
    const url = encodeMerchantQR(data);
    const decoded = decodeMerchantQR(url);
    expect(decoded).toEqual(data);
  });

  it('returns null for a URL without a data param', () => {
    const result = decodeMerchantQR('http://localhost:5173/join/merchant');
    expect(result).toBeNull();
  });

  it('returns null for an invalid/malformed URL', () => {
    const result = decodeMerchantQR('not-a-valid-url');
    expect(result).toBeNull();
  });

  it('returns null when base64 data is corrupted', () => {
    const result = decodeMerchantQR('http://localhost:5173/join/merchant?data=!!!invalid!!!');
    expect(result).toBeNull();
  });
});

describe('isValidMerchantId', () => {
  it('returns true for a valid Stellar public key', () => {
    expect(isValidMerchantId('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN')).toBe(true);
  });

  it('returns false for an invalid key', () => {
    expect(isValidMerchantId('not-a-stellar-key')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidMerchantId('')).toBe(false);
  });
});
