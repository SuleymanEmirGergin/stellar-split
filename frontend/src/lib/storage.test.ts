import { isValidReceipt, uploadReceipt } from './storage';

describe('isValidReceipt', () => {
  it('accepts data URL (image)', () => {
    expect(isValidReceipt('data:image/png;base64,abc123')).toBe(true);
  });

  it('accepts data URL (jpeg)', () => {
    expect(isValidReceipt('data:image/jpeg;base64,abc')).toBe(true);
  });

  it('accepts http URL', () => {
    expect(isValidReceipt('http://example.com/receipt.jpg')).toBe(true);
  });

  it('accepts https URL', () => {
    expect(isValidReceipt('https://cdn.example.com/receipt.png')).toBe(true);
  });

  it('accepts ipfs:// URL', () => {
    expect(isValidReceipt('ipfs://QmHash123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidReceipt('')).toBe(false);
  });

  it('rejects arbitrary string', () => {
    expect(isValidReceipt('not-a-url')).toBe(false);
  });

  it('rejects ftp URL', () => {
    expect(isValidReceipt('ftp://example.com/file')).toBe(false);
  });
});

describe('uploadReceipt — fallback to data URL when no provider configured', () => {
  it('returns a data URL when no env vars are set', async () => {
    // No PINATA_JWT / INFURA / CUSTOM env vars in test env
    // FileReader is available in jsdom
    const content = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const file = new File([content], 'test.png', { type: 'image/png' });

    const result = await uploadReceipt(file);
    expect(result).toMatch(/^data:/);
  });
});
