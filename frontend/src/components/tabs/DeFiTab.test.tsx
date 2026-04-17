import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/useGroupQuery', () => ({
  useVault: vi.fn(),
}));

vi.mock('../../hooks/useExpenseMutations', () => ({
  useStakeVaultMutation: vi.fn(),
  useWithdrawVaultMutation: vi.fn(),
  useDonateVaultMutation: vi.fn(),
}));

import DeFiTab from './DeFiTab';
import { useVault } from '../../hooks/useGroupQuery';
import { useStakeVaultMutation, useWithdrawVaultMutation, useDonateVaultMutation } from '../../hooks/useExpenseMutations';

const makeMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
const baseVault = { total_staked: 100, yield_earned: 0, total_donated: 0, active: true };
const t = (key: string) => key;
const baseProps = { groupId: 1, liveApy: 7.5, currencyLabel: 'XLM', t: t as never, addToast: vi.fn() };

describe('DeFiTab', () => {
  beforeEach(() => {
    vi.mocked(useVault).mockReturnValue({ data: baseVault, isLoading: false } as never);
    vi.mocked(useStakeVaultMutation).mockReturnValue(makeMutation() as never);
    vi.mocked(useWithdrawVaultMutation).mockReturnValue(makeMutation() as never);
    vi.mocked(useDonateVaultMutation).mockReturnValue(makeMutation() as never);
  });

  it('isLoading=true iken loading mesajı görünür', () => {
    vi.mocked(useVault).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<DeFiTab {...baseProps} />);
    expect(screen.getByText('group.defi_loading')).toBeInTheDocument();
  });

  it('vault=null iken not_found mesajı görünür', () => {
    vi.mocked(useVault).mockReturnValue({ data: null, isLoading: false } as never);
    render(<DeFiTab {...baseProps} />);
    expect(screen.getByText('group.defi_not_found')).toBeInTheDocument();
  });

  it('vault verisiyle başlık ve APY render edilir', () => {
    render(<DeFiTab {...baseProps} />);
    expect(screen.getByText('group.defi_title')).toBeInTheDocument();
    expect(screen.getByText('%7.5 APY')).toBeInTheDocument();
  });

  it('total_staked=0 iken withdraw butonu disabled olur', () => {
    vi.mocked(useVault).mockReturnValue({
      data: { ...baseVault, total_staked: 0 },
      isLoading: false,
    } as never);
    render(<DeFiTab {...baseProps} />);
    const withdrawBtn = screen.getByText('group.defi_withdraw_label').closest('button');
    expect(withdrawBtn).toBeDisabled();
  });

  it('yield_earned > 0 iken Yield Donation bölümü görünür', () => {
    vi.mocked(useVault).mockReturnValue({
      data: { ...baseVault, yield_earned: 5 },
      isLoading: false,
    } as never);
    render(<DeFiTab {...baseProps} />);
    expect(screen.getByText('Yield Donation')).toBeInTheDocument();
  });
});
