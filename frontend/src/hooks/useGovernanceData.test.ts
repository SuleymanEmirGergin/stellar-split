import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/governance', () => ({
  loadProposals: vi.fn().mockReturnValue([]),
  saveProposals: vi.fn(),
  loadDisputes: vi.fn().mockReturnValue([]),
  saveDisputes: vi.fn(),
  initiateDispute: vi.fn().mockReturnValue({
    id: 'd1',
    expenseId: 'e1',
    amount: 100,
    category: 'overcharge',
    description: 'test',
    initiator: 'GAAA',
    votes: {},
    status: 'open',
    createdAt: Date.now(),
  }),
}));

vi.mock('../lib/api', () => ({
  governanceApi: {
    listProposals: vi.fn().mockResolvedValue([]),
    listDisputes: vi.fn().mockResolvedValue([]),
    createProposal: vi.fn().mockResolvedValue({ id: 'p1' }),
    castVote: vi.fn().mockResolvedValue({}),
    createDispute: vi.fn().mockResolvedValue({ id: 'd1' }),
    castDisputeVote: vi.fn().mockResolvedValue({}),
  },
}));

import { useGovernanceData } from './useGovernanceData';
import {
  loadProposals,
  saveProposals,
  loadDisputes,
  saveDisputes,
  initiateDispute,
} from '../lib/governance';
import { governanceApi } from '../lib/api';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useGovernanceData', () => {
  let wrapper: ReturnType<typeof makeWrapper>;

  beforeEach(() => {
    wrapper = makeWrapper();
    vi.clearAllMocks();
    (loadProposals as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (loadDisputes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hasJwt=false — loadProposals called on init', () => {
    renderHook(() => useGovernanceData(1, 'GAAA', { hasJwt: false }), { wrapper });
    expect(loadProposals).toHaveBeenCalledWith(1);
  });

  it('hasJwt=true — governanceApi.listProposals called', async () => {
    renderHook(
      () => useGovernanceData(1, 'GAAA', { hasJwt: true, groupIdStr: '1' }),
      { wrapper },
    );
    await waitFor(() => {
      expect(governanceApi.listProposals).toHaveBeenCalledWith('1');
    });
  });

  it('handleAddProposal clears newPropTitle and newPropDesc', () => {
    const { result } = renderHook(
      () => useGovernanceData(1, 'GAAA', { hasJwt: false }),
      { wrapper },
    );
    act(() => { result.current.setNewPropTitle('Test Proposal'); });
    act(() => { result.current.setNewPropDesc('A description'); });
    act(() => { result.current.handleAddProposal(); });
    expect(result.current.newPropTitle).toBe('');
    expect(result.current.newPropDesc).toBe('');
  });

  it('handleVote calls saveProposals with updated votes in localStorage mode', () => {
    (loadProposals as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        id: 'p1',
        creator: 'GAAA',
        title: 'Proposal',
        description: '',
        votes: {},
        status: 'active',
        createdAt: Date.now(),
        endsAt: Date.now() + 86400000,
        threshold: 51,
      },
    ]);
    const { result } = renderHook(
      () => useGovernanceData(1, 'GAAA', { hasJwt: false }),
      { wrapper },
    );
    act(() => { result.current.handleVote('p1', 'yes'); });
    expect(saveProposals).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ id: 'p1', votes: { GAAA: 'yes' } }),
      ]),
    );
  });

  it('handleInitiateDispute calls lib initiateDispute and adds to disputes', () => {
    const { result } = renderHook(
      () => useGovernanceData(1, 'GAAA', { hasJwt: false }),
      { wrapper },
    );
    act(() => {
      result.current.handleInitiateDispute('e1', 100, 'overcharge', 'test');
    });
    expect(initiateDispute).toHaveBeenCalledWith('GAAA', 'e1', 100, 'overcharge', 'test');
    expect(result.current.disputes).toHaveLength(1);
    expect(result.current.disputes[0].id).toBe('d1');
  });

  it('handleVoteDispute calls saveDisputes in localStorage mode', () => {
    (loadDisputes as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        id: 'd1',
        initiator: 'GAAA',
        expenseId: 'e1',
        amount: 100,
        category: 'overcharge',
        description: 'test',
        votes: {},
        status: 'open',
        createdAt: Date.now(),
      },
    ]);
    const { result } = renderHook(
      () => useGovernanceData(1, 'GAAA', { hasJwt: false }),
      { wrapper },
    );
    act(() => { result.current.handleVoteDispute('d1', 'valid'); });
    expect(saveDisputes).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ id: 'd1', votes: { GAAA: 'valid' } }),
      ]),
    );
  });
});
