import { isValidReceipt, uploadReceipt } from './storage';

// Helper: create a tiny in-memory File
const makeFile = (name = 'test.png') =>
  new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

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

// ─── uploadReceipt — Pinata provider ────────────────────────────────────────

describe('uploadReceipt — Pinata provider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PINATA_JWT', 'test_jwt');
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses Pinata when VITE_PINATA_JWT is set', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'Qm123' }),
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toContain('Qm123');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.anything(),
    );
  });

  it('falls back to data URL when Pinata returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toMatch(/^data:/);
  });

  it('falls back to data URL when Pinata does not return IpfsHash', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}), // no IpfsHash
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toMatch(/^data:/);
  });
});

// ─── uploadReceipt — Infura provider ─────────────────────────────────────────

describe('uploadReceipt — Infura provider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_INFURA_IPFS_PROJECT_ID', 'proj_id');
    vi.stubEnv('VITE_INFURA_IPFS_PROJECT_SECRET', 'proj_secret');
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses Infura when project ID+secret are set', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ Hash: 'QmInfura' }),
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toContain('QmInfura');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('infura.io'),
      expect.anything(),
    );
  });

  it('falls back when Infura returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toMatch(/^data:/);
  });
});

// ─── uploadReceipt — Custom provider ─────────────────────────────────────────

describe('uploadReceipt — Custom provider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_IPFS_UPLOAD_URL', 'http://custom.example.com/upload');
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses custom endpoint and returns URL from Hash field', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ Hash: 'QmCustom' }),
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toContain('QmCustom');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://custom.example.com/upload',
      expect.anything(),
    );
  });

  it('accepts IpfsHash field from custom endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'QmAlt' }),
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toContain('QmAlt');
  });

  it('accepts cid field from custom endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ cid: 'QmCid' }),
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toContain('QmCid');
  });

  it('falls back when response body has no hash fields', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}), // no hash
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toMatch(/^data:/);
  });

  it('falls back when custom endpoint returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    } as Response);

    const { uploadReceipt: upload } = await import('./storage');
    const result = await upload(makeFile());
    expect(result).toMatch(/^data:/);
  });
});
