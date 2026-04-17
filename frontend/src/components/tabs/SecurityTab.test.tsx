import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SecurityTab from './SecurityTab';
import type { Group } from '../../lib/contract';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.HTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));

vi.mock('../../lib/contract', () => ({
  isDemoMode: () => false,
  setGuardians: vi.fn(),
  initiateRecovery: vi.fn(),
  approveRecovery: vi.fn(),
  getRecovery: vi.fn(),
}));

vi.mock('../../lib/recovery', () => ({
  saveGuardians: vi.fn(),
  approveRecovery: vi.fn(),
  initiateRecovery: vi.fn(),
  loadAllGuardians: vi.fn().mockReturnValue({}),
  loadRecoveryRequest: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/api', () => ({
  guardiansApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    add: vi.fn().mockResolvedValue({ data: {} }),
    remove: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../../hooks/useBackendGroups', () => ({
  useBackendGroup: () => ({ data: null }),
  useTransferOwnershipMutation: () => ({ mutate: vi.fn(), isPending: false }),
  usePendingRecoveryRequests: () => ({ data: null, isLoading: false }),
  useInitiateRecoveryMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveRecoveryMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectRecoveryMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockGroup = {
  id: BigInt(1),
  name: 'Test Grubu',
  members: [ADDR_A],
  currency: 'XLM',
} as unknown as Group;

const t = (key: string) => key;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseProps = {
  group: mockGroup,
  walletAddress: ADDR_A,
  activeRecovery: null,
  guardianConfig: null,
  onRefresh: vi.fn().mockResolvedValue(undefined),
  t,
  addToast: vi.fn(),
  hasJwt: true,
  groupIdStr: '1',
};

describe('SecurityTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('smoke: crash olmadan render edilir', () => {
    render(<SecurityTab {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('group.security_center')).toBeInTheDocument();
  });

  it('vasi bölümü başlığı görünür', () => {
    render(<SecurityTab {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('group.guardians')).toBeInTheDocument();
  });

  it('vasi yoksa empty state gösterir', async () => {
    render(<SecurityTab {...baseProps} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('group.recovery_no_guardians')).toBeInTheDocument();
    });
  });

  it('vasi ekleme input\'u görünür', () => {
    render(<SecurityTab {...baseProps} />, { wrapper: createWrapper() });
    // Add guardian form only shows after clicking the toggle button
    fireEvent.click(screen.getByTestId('add-guardian-toggle'));
    expect(screen.getByTestId('guardian-address-input')).toBeInTheDocument();
  });
});
