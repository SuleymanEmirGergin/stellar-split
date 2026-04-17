import { describe, it, expect } from 'vitest';
import { generatePayURI, generateTxURI, STELLAR_PROTOCOL } from './sep7';

describe('generatePayURI', () => {
  it('includes the stellar protocol prefix and pay path', () => {
    const uri = generatePayURI({ destination: 'GABC123' });
    expect(uri.startsWith(`${STELLAR_PROTOCOL}pay?`)).toBe(true);
  });

  it('includes required destination param', () => {
    const uri = generatePayURI({ destination: 'GABC123' });
    expect(uri).toContain('destination=GABC123');
  });

  it('includes optional amount and memo when provided', () => {
    const uri = generatePayURI({ destination: 'GABC123', amount: '10', memo: 'split' });
    expect(uri).toContain('amount=10');
    expect(uri).toContain('memo=split');
  });

  it('omits optional fields when not provided', () => {
    const uri = generatePayURI({ destination: 'GABC123' });
    expect(uri).not.toContain('memo=');
    expect(uri).not.toContain('amount=');
  });

  it('includes memo_type when provided', () => {
    const uri = generatePayURI({ destination: 'GABC123', memo: 'hello', memo_type: 'MEMO_TEXT' });
    expect(uri).toContain('memo_type=MEMO_TEXT');
  });

  it('includes network_passphrase and origin_domain when provided', () => {
    const uri = generatePayURI({
      destination: 'GABC123',
      network_passphrase: 'Test SDF Network ; September 2015',
      origin_domain: 'example.com'
    });
    expect(uri).toContain('origin_domain=example.com');
    expect(uri).toContain('network_passphrase=');
  });
});

describe('generateTxURI', () => {
  it('includes the stellar protocol prefix and tx path', () => {
    const uri = generateTxURI({ xdr: 'AAAA==' });
    expect(uri.startsWith(`${STELLAR_PROTOCOL}tx?`)).toBe(true);
  });

  it('includes required xdr param', () => {
    const uri = generateTxURI({ xdr: 'AAAA==' });
    expect(uri).toContain('xdr=AAAA');
  });

  it('includes optional callback and pubkey when provided', () => {
    const uri = generateTxURI({ xdr: 'AAAA==', callback: 'url:https://cb.example.com', pubkey: 'GPUB123' });
    expect(uri).toContain('callback=');
    expect(uri).toContain('pubkey=GPUB123');
  });

  it('omits optional fields when not provided', () => {
    const uri = generateTxURI({ xdr: 'AAAA==' });
    expect(uri).not.toContain('callback=');
    expect(uri).not.toContain('pubkey=');
  });
});
