import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettleTab from './SettleTab';
import type { Settlement, Expense } from '../../lib/contract';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));

vi.mock('../../lib/xlmPrice', () => ({
  formatStroopsWithUsd: (amount: number) => `${amount / 10_000_000} XLM`,
}));

vi.mock('../../lib/contract', () => ({}));

vi.mock('../Avatar', () => ({ default: ({ address }: { address: string }) => <div data-testid="avatar">{address.slice(0, 4)}</div> }));
vi.mock('../QRCode', () => ({ default: () => <div data-testid="qrcode" /> }));
vi.mock('../ImpactPanel', () => ({ default: () => <div data-testid="impact-panel" /> }));
vi.mock('../ui/Glow', () => ({ Glow: () => null }));

vi.mock('../../hooks/useBackendGroups', () => ({
  useBackendSettlements: () => ({ data: null, isLoading: false }),
  useUpdateSettlementStatusMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const t = (key: string) => key;

const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const ADDR_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWF';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseProps = {
  groupId: 1,
  walletAddress: ADDR_A,
  groupMembers: [ADDR_A, ADDR_B],
  expenses: [] as Expense[],
  settlements: [] as Settlement[],
  currencyLabel: 'XLM',
  xlmUsd: null,
  isDemo: true,
  showPayQRIndex: null,
  setShowPayQRIndex: vi.fn(),
  settling: false,
  handleSettle: vi.fn(),
  t,
};

describe('SettleTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('settlement yoksa empty state gösterir', () => {
    render(<SettleTab {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('group.empty_settlements')).toBeInTheDocument();
  });

  it('ImpactPanel her zaman render edilir', () => {
    render(<SettleTab {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('impact-panel')).toBeInTheDocument();
  });

  it('settling=true iken button disable görünür', () => {
    const settlement: Settlement = { from: ADDR_A, to: ADDR_B, amount: 10_000_000 } as unknown as Settlement;
    render(<SettleTab {...baseProps} settlements={[settlement]} settling={true} />, { wrapper: createWrapper() });
    expect(screen.getByText('group.settling')).toBeInTheDocument();
  });
});
