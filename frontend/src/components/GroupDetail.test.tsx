import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GroupDetail from './GroupDetail';

// ─── framer-motion ────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
    nav: ({ children, ...p }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => <nav {...p}>{children}</nav>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── All tab components (mocked to avoid their own deps) ─────────────────────
vi.mock('./tabs/ExpensesTab', () => ({ default: () => <div data-testid="expenses-tab-content" /> }));
vi.mock('./tabs/BalancesTab', () => ({ default: () => <div data-testid="balances-tab-content" /> }));
vi.mock('./tabs/SettleTab', () => ({ default: () => <div data-testid="settle-tab-content" /> }));
vi.mock('./tabs/GalleryTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/DeFiTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/RecurringTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/SocialTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/GovernanceTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/SecurityTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/AuditTab', () => ({ default: () => <div /> }));
vi.mock('./tabs/SettingsTab', () => ({ default: () => <div data-testid="settings-tab-content" /> }));

// ─── Supporting UI components ────────────────────────────────────────────────
vi.mock('./ErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./Confetti', () => ({ default: () => null }));
vi.mock('./QRCode', () => ({ default: () => null }));
vi.mock('./ui/SkeletonShimmer', () => ({ SkeletonShimmer: () => <div data-testid="skeleton" /> }));
vi.mock('./InsightsPanel', () => ({ default: () => <div /> }));
vi.mock('./ui/TxStatusTimeline', () => ({ TxStatusTimeline: () => null }));
vi.mock('./SubscriptionModal', () => ({ default: () => null }));
vi.mock('./NotificationCenter', () => ({ NotificationCenter: () => null }));
vi.mock('./BottomSheet', () => ({ default: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null }));
vi.mock('./SocialSavings', () => ({ SocialSavings: () => null }));
vi.mock('./Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

// ─── Hooks ────────────────────────────────────────────────────────────────────
const mockGroup = {
  id: BigInt(1),
  name: 'Tatil Grubu',
  members: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
  currency: 'XLM',
  expense_count: 0,
};

vi.mock('../hooks/useGroupQuery', () => ({
  useGroup: () => ({ data: mockGroup, isLoading: false }),
  useGroupExpenses: () => ({ data: [] }),
  useBalances: () => ({ data: new Map() }),
  useGroupSettlements: () => ({ data: [] }),
  groupKeys: { detail: (id: number) => ['group', id] },
}));

const mockMutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });
vi.mock('../hooks/useExpenseMutations', () => ({
  useAddExpenseMutation: () => mockMutation(),
  useCancelExpenseMutation: () => mockMutation(),
  useSettleGroupMutation: () => mockMutation(),
  useAddMemberMutation: () => mockMutation(),
  useRemoveMemberMutation: () => mockMutation(),
}));

vi.mock('../hooks/useSecurityData', () => ({
  useSecurityData: () => ({ activeRecovery: null, guardianConfig: null, loadSecurityData: vi.fn() }),
}));

vi.mock('../hooks/useGovernanceData', () => ({
  useGovernanceData: () => ({
    proposals: [],
    disputes: [],
    setDisputes: vi.fn(),
    showAddPropose: false,
    setShowAddPropose: vi.fn(),
    newPropTitle: '',
    setNewPropTitle: vi.fn(),
    newPropDesc: '',
    setNewPropDesc: vi.fn(),
    handleAddProposal: vi.fn(),
    handleVote: vi.fn(),
    handleVoteDispute: vi.fn(),
    handleInitiateDispute: vi.fn(),
  }),
}));

vi.mock('../hooks/useRecurringData', () => ({
  useRecurringData: () => ({
    subscriptions: [],
    recurringLoading: false,
    handleAddSubscription: vi.fn(),
    handleToggleSubscription: vi.fn(),
    handleDeleteSubscription: vi.fn(),
  }),
}));

vi.mock('../hooks/useExpenseHandlers', () => ({
  useExpenseHandlers: () => ({
    showAdd: false, setShowAdd: vi.fn(),
    expAmount: '', setExpAmount: vi.fn(),
    expDesc: '', setExpDesc: vi.fn(),
    expCategory: '', setExpCategory: vi.fn(),
    expReceipt: '', setExpReceipt: vi.fn(),
    adding: false,
    cancelling: false,
    uploading: false, setUploading: vi.fn(),
    aiScanning: false, setAiScanning: vi.fn(),
    ocrResult: null, setOcrResult: vi.fn(),
    selectedOcrItems: [], setSelectedOcrItems: vi.fn(),
    addExpenseError: null, setAddExpenseError: vi.fn(),
    viewingReceipt: null, setViewingReceipt: vi.fn(),
    handleAddExpense: vi.fn(),
    handleCancelLastExpense: vi.fn(),
  }),
}));

vi.mock('../hooks/useMemberHandlers', () => ({
  useMemberHandlers: () => ({
    newMemberInput: '', setNewMemberInput: vi.fn(),
    addingMember: false,
    removingMember: null,
    handleAddMember: vi.fn(),
    handleRemoveMember: vi.fn(),
  }),
}));

vi.mock('../hooks/useSettleHandler', () => ({
  useSettleHandler: () => ({
    settling: false,
    showConfetti: false,
    estimatedSettleFee: null,
    lastTxStatus: null, setLastTxStatus: vi.fn(),
    lastTxHash: null,
    lastTxError: null, setLastTxError: vi.fn(),
    lastFeePaid: null,
    handleSettle: vi.fn(),
  }),
}));

vi.mock('../hooks/useLocalStorage', () => ({
  useLocalStorage: (_key: string, defaultVal: unknown) => [defaultVal, vi.fn()],
}));

vi.mock('../hooks/useBackendGroups', () => ({
  useBackendExpenses: () => ({ data: undefined }),
  useBackendBalances: () => ({ data: undefined }),
  useBackendAudit: () => ({ data: undefined, isLoading: false }),
  useSettlementPlan: () => ({ data: undefined }),
  useInviteLink: () => ({ data: undefined }),
  useBackendGroup: () => ({ data: undefined }),
  useUpdateGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  backendGroupKeys: {
    expenses: (id: string) => ['backend', 'expenses', id],
    balances: (id: string) => ['backend', 'balances', id],
    detail: (id: string) => ['backend', 'detail', id],
    settlements: (id: string) => ['backend', 'settlements', id],
    settlementPlan: (id: string) => ['backend', 'settlement-plan', id],
    audit: (id: string) => ['backend', 'audit', id],
    analytics: (id: string) => ['backend', 'analytics', id],
    recurring: (id: string) => ['backend', 'recurring', id],
  },
}));

vi.mock('../hooks/useGroupEvents', () => ({ useGroupEvents: vi.fn() }));

// ─── Lib mocks ────────────────────────────────────────────────────────────────
vi.mock('../lib/api', () => ({ getAccessToken: () => null, governanceApi: {} }));
vi.mock('../lib/stellar', () => ({
  server: {},
  CONTRACT_ID: 'mock-contract-id',
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));
vi.mock('../lib/events', () => ({ subscribeGroupEvents: vi.fn(() => vi.fn()) }));
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'en' }),
}));
vi.mock('./Toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../lib/xlmPrice', () => ({
  useXlmUsd: () => null,
  formatStroopsWithUsd: (amount: number) => `${amount / 10_000_000} XLM`,
}));
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
vi.mock('../lib/defi', () => ({ getLiveApy: () => Promise.resolve(5.2) }));
vi.mock('../lib/notifications', () => ({
  sendWebhookNotification: vi.fn(),
  sendSettlementReadyNotification: vi.fn(),
  sendLocalNotification: vi.fn(),
  requestNotificationPermission: () => Promise.resolve(false),
}));
vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: Object.assign(vi.fn(() => ({})), {
    getState: () => ({ add: vi.fn() }),
  }),
}));
vi.mock('../lib/contacts', () => ({ addressBook: { getAll: () => ({}) } }));
vi.mock('../lib/contract', () => ({
  estimateSettleGroupFee: vi.fn(() => Promise.resolve({ fee: '0', formattedXlm: '0' })),
}));
vi.mock('../lib/storage', () => ({ uploadReceipt: vi.fn() }));
vi.mock('../lib/ai', () => ({
  scanReceiptAI: vi.fn(),
  hasReceiptAI: () => false,
  getMockScannedData: vi.fn(),
}));
vi.mock('../lib/errors', () => ({ translateError: (_msg: string) => _msg, getLangKey: (_lang: string) => 'en' }));

// ─── Test wrapper ─────────────────────────────────────────────────────────────
const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('GroupDetail (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bileşen başarıyla mount olur (crash yok)', () => {
    render(
      <GroupDetail walletAddress={ADDR_A} groupId={1} onBack={vi.fn()} isDemo={true} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Tatil Grubu')).toBeInTheDocument();
  });

  it('varsayılan sekme expenses\'tir', () => {
    render(
      <GroupDetail walletAddress={ADDR_A} groupId={1} onBack={vi.fn()} isDemo={true} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByTestId('expenses-tab-content')).toBeInTheDocument();
  });

  it('sekme tıklaması balances sekmesine geçiş yapar', () => {
    render(
      <GroupDetail walletAddress={ADDR_A} groupId={1} onBack={vi.fn()} isDemo={true} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByTestId('tab-balances'));
    expect(screen.getByTestId('balances-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('expenses-tab-content')).not.toBeInTheDocument();
  });

  it('sekme tıklaması settings sekmesine geçiş yapar', async () => {
    render(
      <GroupDetail walletAddress={ADDR_A} groupId={1} onBack={vi.fn()} isDemo={true} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByTestId('tab-settings'));
    await waitFor(() => expect(screen.getByTestId('settings-tab-content')).toBeInTheDocument());
    expect(screen.queryByTestId('expenses-tab-content')).not.toBeInTheDocument();
  });

  it('geri butonu onBack\'i çağırır', () => {
    const onBack = vi.fn();
    render(
      <GroupDetail walletAddress={ADDR_A} groupId={1} onBack={onBack} isDemo={true} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByRole('button', { name: 'nav.back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
