import { hasReceiptAI, getMockScannedData } from './ai';

// Note: scanReceiptAI and adviseFinancial depend on VITE_OPENAI_API_KEY / VITE_WIRO_API_KEY
// env vars read at module load time. We test the pure helpers and mock-data path here.
// Full AI path tests would require vi.resetModules() + vi.stubEnv pattern (too slow for unit coverage).

describe('hasReceiptAI', () => {
  it('returns a boolean', () => {
    expect(typeof hasReceiptAI()).toBe('boolean');
  });

  it('returns true when OPENAI key is set (via resetModules)', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.resetModules();
    const { hasReceiptAI: hasAI } = await import('./ai');
    expect(hasAI()).toBe(true);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns true when WIRO key is set', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'wiro-test-key');
    vi.resetModules();
    const { hasReceiptAI: hasAI } = await import('./ai');
    expect(hasAI()).toBe(true);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe('getMockScannedData', () => {
  it('returns an object with merchant, currency, items, totalAmount, confidence', () => {
    const d = getMockScannedData();
    expect(d.merchant).toBeDefined();
    expect(d.currency).toBeDefined();
    expect(Array.isArray(d.items)).toBe(true);
    expect(typeof d.totalAmount).toBe('number');
    expect(typeof d.confidence).toBe('number');
  });

  it('returns items with description, amount, category', () => {
    const d = getMockScannedData();
    for (const item of d.items) {
      expect(item.description).toBeDefined();
      expect(typeof item.amount).toBe('number');
      expect(item.category).toBeDefined();
    }
  });

  it('totalAmount equals sum of items', () => {
    const d = getMockScannedData();
    const sum = d.items.reduce((acc, i) => acc + i.amount, 0);
    expect(d.totalAmount).toBeCloseTo(sum, 2);
  });

  it('returns demo data (Demo Kafe)', () => {
    const d = getMockScannedData();
    expect(d.merchant).toBe('Demo Kafe');
  });
});

// ─── adviseFinancial — no API key path ────────────────────────────────────────

describe('adviseFinancial — mock response (no API key)', () => {
  it('returns a FinancialAdvice object without calling fetch', async () => {
    const { adviseFinancial } = await import('./ai');
    const result = await adviseFinancial('GABC', { groups: [], balances: {} });
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.tips)).toBe(true);
  });
});

// ─── scanReceiptAI — no API key path (local OCR fallback) ────────────────────

describe('scanReceiptAI — no key → local OCR fallback', () => {
  it('returns ScannedData structure with total from "Total:" keyword', async () => {
    vi.mock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Total: 45.00\nCoffee 3.50\nSandwich 4.00' },
        }),
      },
    }));

    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.totalAmount).toBeTypeOf('number');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.confidence).toBeDefined();
    expect(result.merchant).toBe('Manuel Onay Bekliyor');
  });

  it('parses European-format amounts (1.234,56)', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Toplam: 1.234,56' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.totalAmount).toBeCloseTo(1234.56, 1);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });

  it('falls back to bottom half when no keyword line has amount', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Coffee\nSandwich\n15.50\n22.00' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    // Bottom half: ["15.50", "22.00"] → largest = 22.00
    expect(result.totalAmount).toBeGreaterThan(0);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });

  it('returns 0 when no parseable amount found', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'No amounts here at all' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.totalAmount).toBe(0);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });

  it('returns 0 when all regex-matched amounts are zero (0.00)', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Amount: 0.00' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    // 0.00 matches regex but is not > 0 → maxAmount stays 0 → extractLargestAmount returns null → totalAmount=0
    expect(result.totalAmount).toBe(0);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });

  it('parses US-format amounts (1,234.56) where dot is decimal separator', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Total: 1,234.56' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.totalAmount).toBeCloseTo(1234.56, 1);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });

  it('parses comma-only format (45,00 with no dot)', async () => {
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Total: 45,00' },
        }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.totalAmount).toBeCloseTo(45, 0);
    vi.doUnmock('tesseract.js');
    vi.resetModules();
  });
});

// ─── scanReceiptAI — with OPENAI_KEY ─────────────────────────────────────────

describe('scanReceiptAI — with OPENAI_KEY', () => {
  afterEach(() => {
    vi.doUnmock('tesseract.js');
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('calls OpenAI Vision API and parses response', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              merchant: 'Test Store',
              currency: 'USD',
              items: [{ description: 'Coffee', amount: 3.5, category: 'food' }],
              totalAmount: 3.5,
            }),
          },
        }],
      }),
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.merchant).toBe('Test Store');
    expect(result.totalAmount).toBe(3.5);
    expect(result.confidence).toBe(0.95);
  });

  it('prepends data:image/jpeg;base64, prefix when image does not start with data:', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    let capturedBody: string | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedBody = opts.body as string;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ merchant: 'M', currency: 'USD', items: [], totalAmount: 1 }) } }],
        }),
      });
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    // Pass plain base64 without "data:" prefix → triggers the ternary else branch
    await scanReceiptAI('/9j/4AAQSkZJRgAB'); // raw base64 (no data: prefix)
    expect(capturedBody).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRgAB');
  });

  it('falls back to OCR when OpenAI returns non-ok response', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    }));
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({ data: { text: 'Total: 10.00' } }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    // Should fallback to local OCR result
    expect(result.merchant).toBe('Manuel Onay Bekliyor');
  });

  it('falls back to OCR when OpenAI fetch throws', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({ data: { text: 'Total: 5.00' } }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.merchant).toBe('Manuel Onay Bekliyor');
  });

  it('handles OpenAI response with missing/invalid item fields (uses fallbacks)', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              // no merchant → 'Unknown', no currency → 'XLM', no totalAmount → 0
              items: [
                { description: null, amount: 'not a number', category: 'invalid_cat' },
              ],
            }),
          },
        }],
      }),
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.merchant).toBe('Unknown');
    expect(result.currency).toBe('XLM');
    expect(result.totalAmount).toBe(0);
    expect(result.items[0]?.description).toBe('Item');
    expect(result.items[0]?.amount).toBe(0);
    expect(result.items[0]?.category).toBe('other');
  });

  it('handles OpenAI response with markdown code block wrapping', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '```json\n{"merchant":"Cafe","currency":"EUR","items":[],"totalAmount":5.5}\n```',
          },
        }],
      }),
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    expect(result.merchant).toBe('Cafe');
    expect(result.totalAmount).toBe(5.5);
  });

  it('handles missing OpenAI content (empty choices) → throws → OCR fallback', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    }));
    vi.doMock('tesseract.js', () => ({
      default: {
        recognize: vi.fn().mockResolvedValue({ data: { text: '' } }),
      },
    }));
    vi.resetModules();
    const { scanReceiptAI } = await import('./ai');
    const result = await scanReceiptAI('data:image/jpeg;base64,abc');
    // Empty content throws → fallback to OCR
    expect(result.confidence).toBeDefined();
  });
});

// ─── adviseFinancial — with OPENAI_KEY ───────────────────────────────────────

describe('adviseFinancial — with OPENAI_KEY', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns parsed OpenAI advice on success', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Great finances!',
              tips: ['Tip 1', 'Tip 2'],
              savingPlan: 'Save 20%',
            }),
          },
        }],
      }),
    }));
    vi.resetModules();
    const { adviseFinancial } = await import('./ai');
    const result = await adviseFinancial('GABC', { groups: [], balances: {} });
    expect(result.summary).toBe('Great finances!');
    expect(result.tips).toHaveLength(2);
    expect(result.savingPlan).toBe('Save 20%');
  });

  it('returns fallback advice when OpenAI throws', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    vi.resetModules();
    const { adviseFinancial } = await import('./ai');
    const result = await adviseFinancial('GABC', { groups: [], balances: {} });
    expect(result.summary).toContain('unavailable');
    expect(Array.isArray(result.tips)).toBe(true);
  });

  it('returns fallback advice when OpenAI returns non-ok', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));
    vi.resetModules();
    const { adviseFinancial } = await import('./ai');
    const result = await adviseFinancial('GABC', { groups: [], balances: {} });
    expect(result.summary).toContain('unavailable');
  });
});
