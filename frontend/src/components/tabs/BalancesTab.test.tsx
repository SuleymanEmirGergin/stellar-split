import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BalancesTab from './BalancesTab';
import type { Group } from '../../lib/contract';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../lib/karma', () => ({
  calculateKarma: () => ({ icon: '⭐', color: 'text-yellow-400', level: 'Star' }),
}));

vi.mock('../../lib/badges', () => ({
  calculateBadges: () => [],
}));

vi.mock('../Avatar', () => ({
  default: ({ address }: { address: string }) => <span data-testid="avatar">{address}</span>,
}));

vi.mock('../DebtGraph', () => ({
  DebtGraph: () => <div data-testid="debt-graph" />,
}));

vi.mock('../../lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));

vi.mock('../../lib/contract', () => ({}));

const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const ADDR_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

const mockGroup = {
  id: BigInt(1),
  name: 'Test',
  members: [ADDR_A, ADDR_B],
  currency: 'XLM',
} as unknown as Group;

const t = (key: string) => key;

const baseProps = {
  group: mockGroup,
  expenses: [],
  settlements: [],
  balances: new Map<string, number>([[ADDR_A, 50], [ADDR_B, -50]]),
  walletAddress: ADDR_A,
  currencyLabel: 'XLM',
  showVisualGraph: false,
  setShowVisualGraph: vi.fn(),
  removingMember: null,
  handleRemoveMember: vi.fn(),
  newMemberInput: '',
  setNewMemberInput: vi.fn(),
  addingMember: false,
  handleAddMember: vi.fn(),
  contacts: {},
  t,
};

describe('BalancesTab', () => {
  it('pozitif bakiye emerald renk sınıfı alır', () => {
    const { container } = render(<BalancesTab {...baseProps} />);
    const positiveEl = container.querySelector('.text-emerald-400');
    expect(positiveEl).toBeInTheDocument();
    expect(positiveEl?.textContent).toContain('50');
  });

  it('negatif bakiye rose renk sınıfı alır', () => {
    const { container } = render(<BalancesTab {...baseProps} />);
    const negativeEl = container.querySelector('.text-rose-400');
    expect(negativeEl).toBeInTheDocument();
    expect(negativeEl?.textContent).toContain('-50');
  });

  it('wallet adresi truncate edilmiş görünür', () => {
    render(<BalancesTab {...baseProps} />);
    // truncateAddress('GAAA…') → 'GAAA…AWHF'
    const truncated = screen.getAllByText(/GAAA/);
    expect(truncated.length).toBeGreaterThan(0);
  });

  it('tüm bakiyeler kapandığında uygun mesaj gösterilir', () => {
    render(
      <BalancesTab
        {...baseProps}
        settlementPlan={{ transfers: [], totalTransfers: 0, savedTransfers: 0 }}
      />,
    );
    expect(screen.getByText('group.balances_all_settled')).toBeInTheDocument();
  });

  it('settlement planı transfer satırlarını gösterir', () => {
    render(
      <BalancesTab
        {...baseProps}
        settlementPlan={{
          transfers: [{ fromUserId: ADDR_A, toUserId: ADDR_B, amount: 50 }],
          totalTransfers: 1,
          savedTransfers: 0,
        }}
      />,
    );
    // truncated addresses should appear in transfer rows
    const rows = screen.getAllByText(/GAAA/);
    expect(rows.length).toBeGreaterThan(0);
  });
});
