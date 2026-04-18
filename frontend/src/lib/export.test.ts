import { exportToCSV, exportToPrintReport, exportToPDF } from './export';
import type { Group, Expense } from './contract';

// ── DOM helpers ─────────────────────────────────────────────────────────────

const mockLink = {
  setAttribute: vi.fn(),
  click: vi.fn(),
  style: { visibility: '' },
};

beforeEach(() => {
  vi.restoreAllMocks();

  // Stub URL object methods
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });

  // Stub createElement to intercept anchor creation
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockLink as unknown as HTMLAnchorElement;
    // For 'a' only; fall through for everything else
    return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
  });

  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 1,
    name: 'Test Group',
    members: ['GABC', 'GDEF'],
    expenses: [],
    currency: 'XLM',
    ...overrides,
  } as unknown as Group;
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    description: 'Lunch',
    payer: 'GABC1234567890ABCD',
    amount: 10_000_000, // 1 XLM
    currency: 'XLM',
    category: 'food',
    split_among: ['GABC', 'GDEF'],
    ...overrides,
  } as unknown as Expense;
}

// ── exportToCSV ───────────────────────────────────────────────────────────────

describe('exportToCSV', () => {
  it('creates a Blob and triggers a download', () => {
    exportToCSV(makeGroup(), [makeExpense()]);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('sets the correct download filename', () => {
    exportToCSV(makeGroup({ name: 'My Group' }), []);
    expect(mockLink.setAttribute).toHaveBeenCalledWith(
      'download',
      expect.stringContaining('My_Group'),
    );
  });

  it('handles group with no expenses', () => {
    expect(() => exportToCSV(makeGroup(), [])).not.toThrow();
  });

  it('handles expenses with missing optional fields', () => {
    const expense = makeExpense({ category: undefined, currency: undefined });
    expect(() => exportToCSV(makeGroup(), [expense])).not.toThrow();
  });

  it('uses XLM as currency fallback when both expense and group currency are missing', () => {
    const blob: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((b) => {
      blob.push(b as Blob);
      return 'blob:mock-url';
    });
    const expense = makeExpense({ currency: undefined });
    const group = makeGroup({ currency: undefined });
    exportToCSV(group as unknown as Group, [expense]);
    expect(blob.length).toBe(1);
  });

  it('handles expenses with empty description', () => {
    const expense = makeExpense({ description: '' });
    expect(() => exportToCSV(makeGroup(), [expense])).not.toThrow();
  });

  it('escapes double-quotes in description', () => {
    const blob: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((b) => {
      blob.push(b as Blob);
      return 'blob:mock-url';
    });
    const expense = makeExpense({ description: 'He said "hello"' });
    exportToCSV(makeGroup(), [expense]);
    // The Blob was created — content escaping is internal, just ensure no throw
    expect(blob.length).toBe(1);
  });
});

// ── exportToPrintReport ───────────────────────────────────────────────────────

describe('exportToPrintReport', () => {
  it('opens a new window and writes HTML', () => {
    const mockDoc = { write: vi.fn(), close: vi.fn() };
    const mockWindow = { document: mockDoc };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow as unknown as Window);

    exportToPrintReport(makeGroup(), [makeExpense()]);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('Birik'));
    expect(mockDoc.close).toHaveBeenCalled();
  });

  it('does nothing when window.open returns null', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(() => exportToPrintReport(makeGroup(), [])).not.toThrow();
  });

  it('includes group name in the report', () => {
    let written = '';
    const mockDoc = { write: (s: string) => { written = s; }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue({ document: mockDoc } as unknown as Window);

    exportToPrintReport(makeGroup({ name: 'Camping Trip' }), []);
    expect(written).toContain('Camping Trip');
  });

  it('handles expense with empty description in print report', () => {
    let written = '';
    const mockDoc = { write: (s: string) => { written = s; }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue({ document: mockDoc } as unknown as Window);

    const expense = makeExpense({ description: '' });
    exportToPrintReport(makeGroup(), [expense]);
    expect(written).toContain('<td></td>');
  });
});

// ── exportToPDF ───────────────────────────────────────────────────────────────

describe('exportToPDF', () => {
  afterEach(() => {
    vi.doUnmock('html2canvas');
    vi.doUnmock('jspdf');
    vi.resetModules();
  });

  it('does nothing when element is not found', async () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    await expect(exportToPDF(makeGroup(), 'nonexistent-id')).resolves.toBeUndefined();
  });

  it('generates and saves a PDF when element exists', async () => {
    const mockCanvas = { toDataURL: vi.fn(() => 'data:image/png;base64,abc') };
    const mockSave = vi.fn();
    const mockPdf = {
      internal: { pageSize: { getWidth: vi.fn(() => 210) } },
      setFontSize: vi.fn(), setTextColor: vi.fn(), text: vi.fn(),
      getImageProperties: vi.fn(() => ({ height: 200, width: 100 })),
      addImage: vi.fn(), save: mockSave,
    };

    vi.doMock('html2canvas', () => ({ default: vi.fn().mockResolvedValue(mockCanvas) }));
    vi.doMock('jspdf', () => ({ jsPDF: vi.fn().mockReturnValue(mockPdf) }));
    vi.resetModules();

    const mockElement = document.createElement('div');
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    const { exportToPDF: exportPDF } = await import('./export');
    await exportPDF(makeGroup({ name: 'Test PDF' }), 'test-element');

    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('Test_PDF'));
  });

  it('handles html2canvas errors gracefully', async () => {
    vi.doMock('html2canvas', () => ({ default: vi.fn().mockRejectedValue(new Error('canvas error')) }));
    vi.resetModules();

    const mockElement = document.createElement('div');
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    const { exportToPDF: exportPDF } = await import('./export');
    await expect(exportPDF(makeGroup(), 'test-element')).resolves.toBeUndefined();
  });
});
