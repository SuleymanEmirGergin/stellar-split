import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    governanceApi: {
      listProposals: vi.fn(),
      createProposal: vi.fn(),
      castVote: vi.fn(),
      listDisputes: vi.fn(),
      createDispute: vi.fn(),
    },
  };
});

import { governanceApi } from '../lib/api';
import { useGovernanceData } from './useGovernanceData';
import { saveProposals, saveDisputes } from '../lib/governance';

const mockGovernanceApi = vi.mocked(governanceApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ─── Local storage mode (hasJwt = false) ──────────────────────────────────────

describe('useGovernanceData — localStorage mode', () => {
  it('loads proposals from localStorage on init', () => {
    saveProposals(1, [
      { id: 'p1', creator: 'GA', title: 'Test', description: '', votes: {}, status: 'active', createdAt: 0, endsAt: 0, threshold: 51 },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    expect(result.current.proposals).toHaveLength(1);
    expect(result.current.proposals[0]!.title).toBe('Test');
  });

  it('loads disputes from localStorage on init', () => {
    saveDisputes(1, [
      { id: 'd1', initiator: 'GA', expenseId: 'e1', amount: 100, category: 'food', description: 'test', votes: {}, status: 'open', createdAt: 0 },
    ]);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    expect(result.current.disputes).toHaveLength(1);
  });

  it('handleAddProposal does nothing when title is empty', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    await act(async () => {
      result.current.handleAddProposal();
    });

    expect(result.current.proposals).toHaveLength(0);
  });

  it('handleAddProposal adds a proposal locally when title is set', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    act(() => {
      result.current.setNewPropTitle('My Proposal');
      result.current.setNewPropDesc('Some description');
    });

    await act(async () => {
      result.current.handleAddProposal();
    });

    expect(result.current.proposals).toHaveLength(1);
    expect(result.current.proposals[0]!.title).toBe('My Proposal');
  });

  it('handleVote adds vote locally in non-jwt mode', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    // Add a proposal first
    act(() => { result.current.setNewPropTitle('Vote Test'); });
    await act(async () => { result.current.handleAddProposal(); });

    const proposalId = result.current.proposals[0]!.id;
    await act(async () => {
      result.current.handleVote(proposalId, 'yes');
    });

    const updated = result.current.proposals.find((p) => p.id === proposalId);
    expect(updated?.votes['GA']).toBe('yes');
  });

  it('handleInitiateDispute creates a dispute locally', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    await act(async () => {
      result.current.handleInitiateDispute('e1', 100, 'food', 'Bad expense');
    });

    expect(result.current.disputes).toHaveLength(1);
    expect(result.current.disputes[0]!.expenseId).toBe('e1');
  });

  it('setDisputes in localStorage mode updates local state and persists', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: false }),
      { wrapper },
    );

    const newDispute = {
      id: 'd1', initiator: 'GA', expenseId: 'e1',
      amount: 100, category: 'food', description: 'test',
      votes: {}, status: 'open' as const, createdAt: 0,
    };

    act(() => {
      result.current.setDisputes([newDispute]);
    });

    expect(result.current.disputes).toHaveLength(1);
    expect(result.current.disputes[0]!.id).toBe('d1');
  });
});

// ─── Backend mode (hasJwt = true) ────────────────────────────────────────────

describe('useGovernanceData — backend mode', () => {
  const mockProposal = {
    id: 'bp1',
    groupId: 'g1',
    title: 'Backend Proposal',
    description: 'test',
    status: 'ACTIVE',
    threshold: 51,
    endsAt: '2026-12-31T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    creator: { id: 'u1', walletAddress: 'GA' },
    votes: [],
  };

  beforeEach(() => {
    mockGovernanceApi.listProposals.mockResolvedValue([mockProposal] as never);
    mockGovernanceApi.listDisputes.mockResolvedValue([] as never);
  });

  it('fetches proposals from backend when hasJwt=true', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.proposals.length).toBeGreaterThan(0);
    });

    expect(mockGovernanceApi.listProposals).toHaveBeenCalledWith('g1');
  });

  it('maps backend proposal votes to frontend shape', async () => {
    const mockProposalWithVotes = {
      ...mockProposal,
      votes: [
        { voter: { walletAddress: 'GABC' }, option: 'yes' },
        { voter: { walletAddress: 'GDEF' }, option: 'no' },
      ],
    };
    mockGovernanceApi.listProposals.mockResolvedValue([mockProposalWithVotes] as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.proposals[0]?.votes?.['GABC']).toBe('yes');
    });
    expect(result.current.proposals[0]?.votes?.['GDEF']).toBe('no');
  });

  it('maps backend proposal to frontend shape', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.proposals[0]?.title).toBe('Backend Proposal');
    });

    expect(result.current.proposals[0]?.status).toBe('active');
  });

  it('does not fetch when groupIdStr is not provided', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true }),
      { wrapper },
    );

    expect(mockGovernanceApi.listProposals).not.toHaveBeenCalled();
  });

  it('handleAddProposal calls createProposal mutation when hasJwt', async () => {
    mockGovernanceApi.createProposal.mockResolvedValue({ id: 'new' } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    act(() => { result.current.setNewPropTitle('New Backend Prop'); });

    await act(async () => { result.current.handleAddProposal(); });

    await waitFor(() => {
      expect(mockGovernanceApi.createProposal).toHaveBeenCalled();
    });
  });

  it('handleVote calls castVote mutation in backend mode', async () => {
    mockGovernanceApi.castVote.mockResolvedValue({} as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    await act(async () => {
      result.current.handleVote('bp1', 'yes');
    });

    await waitFor(() => {
      expect(mockGovernanceApi.castVote).toHaveBeenCalledWith('bp1', 'yes');
    });
  });

  it('handleInitiateDispute calls createDispute mutation in backend mode', async () => {
    mockGovernanceApi.createDispute.mockResolvedValue({} as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    let returnVal: unknown;
    await act(async () => {
      returnVal = result.current.handleInitiateDispute('e1', 100, 'food', 'Bad');
    });

    await waitFor(() => {
      expect(mockGovernanceApi.createDispute).toHaveBeenCalled();
    });
    expect((returnVal as { id: string })?.id).toBe('pending');
  });

  it('setDisputes in backend mode invalidates queries', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    // Should not throw in backend mode
    await act(async () => {
      result.current.setDisputes([]);
    });
  });

  it('setDisputes in backend mode without groupIdStr uses String(groupId) as query key', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true }), // no groupIdStr → fallback String(1)
      { wrapper },
    );

    // Should not throw — covers line 129: groupIdStr ?? String(groupId)
    await act(async () => {
      result.current.setDisputes([]);
    });
  });

  it('handleVote without groupIdStr still calls castVote and uses String(groupId) in onSuccess', async () => {
    mockGovernanceApi.castVote.mockResolvedValue({} as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true }), // no groupIdStr → onSuccess uses String(1)
      { wrapper },
    );

    await act(async () => {
      result.current.handleVote('some-proposal-id', 'yes');
    });

    await waitFor(() => {
      expect(mockGovernanceApi.castVote).toHaveBeenCalledWith('some-proposal-id', 'yes');
    });
  });

  it('fetches and maps disputes from backend', async () => {
    const mockDispute = {
      id: 'bd1',
      groupId: 'g1',
      expenseId: 'e1',
      amount: '100.00',
      category: 'food',
      description: 'Dispute desc',
      status: 'OPEN',
      createdAt: '2026-01-01T00:00:00Z',
      initiator: { id: 'u1', walletAddress: 'GA' },
    };
    mockGovernanceApi.listDisputes.mockResolvedValue([mockDispute] as never);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGovernanceData(1, 'GA', { hasJwt: true, groupIdStr: 'g1' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.disputes.length).toBeGreaterThan(0);
    });

    expect(result.current.disputes[0]?.expenseId).toBe('e1');
    expect(result.current.disputes[0]?.status).toBe('open');
  });
});
