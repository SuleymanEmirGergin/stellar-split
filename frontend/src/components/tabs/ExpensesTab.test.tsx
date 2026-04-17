import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpensesTab from './ExpensesTab';
import type { Group, Expense } from '../../lib/contract';
import * as exportLib from '../../lib/export';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
  }),
}));

vi.mock('../../lib/xlmPrice', () => ({
  formatStroopsWithUsd: (amount: number) => `${amount / 10_000_000} XLM`,
}));

vi.mock('../../lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));

const mockExportToCSV = vi.fn();
vi.mock('../../lib/export', () => ({
  exportToCSV: (...args: unknown[]) => mockExportToCSV(...args),
  exportToPrintReport: vi.fn(),
}));

vi.mock('../../lib/contract', () => ({}));
vi.mock('../../lib/expense-utils', () => ({
  getExpenseCreatedAt: () => undefined,
  getExpenseStatus: () => 'ACTIVE',
}));

const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockGroup = {
  id: BigInt(1),
  name: 'Test Grubu',
  members: [ADDR_A],
  currency: 'XLM',
} as unknown as Group;

const t = (key: string) => key;

const baseProps = {
  group: mockGroup,
  expenses: [] as Expense[],
  walletAddress: ADDR_A,
  currencyLabel: 'XLM',
  xlmUsd: null,
  cancelling: false,
  filterSearch: '',
  setFilterSearch: vi.fn(),
  filterCategory: '',
  setFilterCategory: vi.fn(),
  setViewingReceipt: vi.fn(),
  handleCancelLastExpense: vi.fn(),
  setShowAdd: vi.fn(),
  setAddExpenseError: vi.fn(),
  t,
};

const makeExpense = (id: number, description: string): Expense =>
  ({ id, payer: ADDR_A, amount: id * 10_000_000, description, category: 'food', split_among: [ADDR_A] } as unknown as Expense);

describe('ExpensesTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('boş liste durumunda empty state gösterir', () => {
    render(<ExpensesTab {...baseProps} />);
    expect(screen.getByText('group.empty_expenses')).toBeInTheDocument();
  });

  it('harcama listesini render eder', () => {
    const expenses = [makeExpense(1, 'Akşam Yemeği'), makeExpense(2, 'Taksi')];
    render(<ExpensesTab {...baseProps} expenses={expenses} />);
    expect(screen.getAllByTestId('expense-row')).toHaveLength(2);
    expect(screen.getByText('Akşam Yemeği')).toBeInTheDocument();
    expect(screen.getByText('Taksi')).toBeInTheDocument();
  });

  it('arama input\'u görünür ve setFilterSearch çağrılır', () => {
    render(<ExpensesTab {...baseProps} />);
    const input = screen.getByPlaceholderText('group.search');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'yemek' } });
    expect(baseProps.setFilterSearch).toHaveBeenCalledWith('yemek');
  });

  it('Filtreler butonu tıklanınca gelişmiş panel açılır', () => {
    render(<ExpensesTab {...baseProps} />);
    const filterBtn = screen.getByText('expenses.filters');
    expect(filterBtn).toBeInTheDocument();
    fireEvent.click(filterBtn);
    expect(screen.getByText('expenses.sort_label')).toBeInTheDocument();
  });

  it('filterSearch prop\'u ile eşleşen harcamalar filtrelenir', () => {
    const expenses = [makeExpense(1, 'Kahvaltı'), makeExpense(2, 'Taksi')];
    render(<ExpensesTab {...baseProps} expenses={expenses} filterSearch="Kahvaltı" />);
    expect(screen.getByText('Kahvaltı')).toBeInTheDocument();
    expect(screen.queryByText('Taksi')).not.toBeInTheDocument();
  });
});

describe('ExpensesTab — bulk actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const withExpenses = { ...baseProps, expenses: [makeExpense(1, 'Yemek'), makeExpense(2, 'Taksi')] };

  it('bulk mode butonu görünür', () => {
    render(<ExpensesTab {...withExpenses} />);
    expect(screen.getByTitle('group.bulk_select')).toBeInTheDocument();
  });

  it('bulk mode aktifken action bar görünür', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    expect(screen.getByText('group.no_selection')).toBeInTheDocument();
  });

  it('bir satıra tıklamak seçim yapar', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    const rows = screen.getAllByTestId('expense-row');
    fireEvent.click(rows[0]);
    expect(screen.getByText(`1 group.selected_count`)).toBeInTheDocument();
  });

  it('"Tümünü Seç" tüm harcamaları seçer', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    fireEvent.click(screen.getByText('group.select_all'));
    expect(screen.getByText('2 group.selected_count')).toBeInTheDocument();
  });

  it('"Seçimi Kaldır" seçimi temizler', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    fireEvent.click(screen.getByText('group.select_all'));
    fireEvent.click(screen.getByText('group.deselect_all'));
    expect(screen.getByText('group.no_selection')).toBeInTheDocument();
  });

  it('CSV export seçili harcamalarla çağrılır', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    const rows = screen.getAllByTestId('expense-row');
    fireEvent.click(rows[0]);
    fireEvent.click(screen.getByText('group.bulk_export_csv'));
    expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    const passedExpenses = mockExportToCSV.mock.calls[0][1] as Expense[];
    expect(passedExpenses).toHaveLength(1);
    // List renders newest-first (descending id), so rows[0] = expense id 2
    expect(passedExpenses[0].id).toBe(2);
  });

  it('X butonu bulk moddan çıkar', () => {
    render(<ExpensesTab {...withExpenses} />);
    fireEvent.click(screen.getByTitle('group.bulk_select'));
    fireEvent.click(screen.getByTitle('settings.leave_cancel'));
    expect(screen.queryByText('group.no_selection')).not.toBeInTheDocument();
  });
});
