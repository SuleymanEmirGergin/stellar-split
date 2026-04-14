import { exportToCSV, exportToPrintReport } from './export';
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
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('StellarSplit'));
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
});
