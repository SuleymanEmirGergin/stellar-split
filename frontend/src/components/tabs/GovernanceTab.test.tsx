import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GovernanceTab from './GovernanceTab';
import type { Proposal, Dispute } from '../../lib/governance';
import type { Group } from '../../lib/contract';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const ADDR_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const ADDR_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

const mockGroup = {
  id: BigInt(1),
  name: 'Test',
  members: [ADDR_A, ADDR_B],
  currency: 'XLM',
} as unknown as Group;

const t = (key: string) => key;

const makeProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop1',
  creator: ADDR_A,
  title: 'Test Önerisi',
  description: 'Açıklama',
  votes: {},
  status: 'active',
  createdAt: Date.now() - 1000,
  endsAt: Date.now() + 86400000,
  threshold: 51,
  ...overrides,
});

const makeDispute = (overrides: Partial<Dispute> = {}): Dispute => ({
  id: 'disp1',
  initiator: ADDR_A,
  expenseId: 'exp1',
  amount: 100,
  category: 'food',
  description: 'Anlaşmazlık açıklaması',
  votes: {},
  status: 'open',
  createdAt: Date.now(),
  ...overrides,
});

const baseProps = {
  group: mockGroup,
  proposals: [] as Proposal[],
  disputes: [] as Dispute[],
  walletAddress: ADDR_A,
  setShowAddPropose: vi.fn(),
  handleVote: vi.fn(),
  handleVoteDispute: vi.fn(),
  t,
};

describe('GovernanceTab', () => {
  it('öneriler ve anlaşmazlıklar yokken empty state\'leri gösterir', () => {
    render(<GovernanceTab {...baseProps} />);
    expect(screen.getByText('group.governance_empty')).toBeInTheDocument();
    expect(screen.getByText('group.disputes_empty')).toBeInTheDocument();
  });

  it('öneri listesini render eder', () => {
    const proposals = [makeProposal({ id: 'p1', title: 'Birinci Öneri' }), makeProposal({ id: 'p2', title: 'İkinci Öneri' })];
    render(<GovernanceTab {...baseProps} proposals={proposals} />);
    expect(screen.getAllByTestId('proposal-card')).toHaveLength(2);
    expect(screen.getByText('Birinci Öneri')).toBeInTheDocument();
    expect(screen.getByText('İkinci Öneri')).toBeInTheDocument();
  });

  it('oy ver butonları handleVote\'u çağırır', () => {
    const handleVote = vi.fn();
    const proposals = [makeProposal()];
    render(<GovernanceTab {...baseProps} proposals={proposals} handleVote={handleVote} />);
    fireEvent.click(screen.getByTestId('vote-yes-btn'));
    expect(handleVote).toHaveBeenCalledWith('prop1', 'yes');
    fireEvent.click(screen.getByTestId('vote-no-btn'));
    expect(handleVote).toHaveBeenCalledWith('prop1', 'no');
  });

  it('kullanıcı zaten oy verdiyse oy butonları disabled olur', () => {
    const proposals = [makeProposal({ votes: { [ADDR_A]: 'yes' } })];
    render(<GovernanceTab {...baseProps} proposals={proposals} />);
    const yesBtn = screen.getByTestId('vote-yes-btn');
    const noBtn = screen.getByTestId('vote-no-btn');
    expect(yesBtn).toBeDisabled();
    expect(noBtn).toBeDisabled();
  });

  it('geçmiş öneri (passed/rejected) butonları disabled olur', () => {
    const proposals = [makeProposal({ status: 'passed' })];
    render(<GovernanceTab {...baseProps} proposals={proposals} />);
    expect(screen.getByTestId('vote-yes-btn')).toBeDisabled();
    expect(screen.getByTestId('vote-no-btn')).toBeDisabled();
  });

  it('anlaşmazlık listesini render eder', () => {
    const disputes = [makeDispute({ id: 'd1', description: 'Tartışmalı Harcama' })];
    render(<GovernanceTab {...baseProps} disputes={disputes} />);
    expect(screen.getAllByTestId('dispute-card')).toHaveLength(1);
    expect(screen.getByText('Tartışmalı Harcama')).toBeInTheDocument();
  });

  it('anlaşmazlık oy butonları handleVoteDispute\'u çağırır', () => {
    const handleVoteDispute = vi.fn();
    const disputes = [makeDispute()];
    render(<GovernanceTab {...baseProps} disputes={disputes} handleVoteDispute={handleVoteDispute} />);
    fireEvent.click(screen.getByTestId('dispute-uphold-btn'));
    expect(handleVoteDispute).toHaveBeenCalledWith('disp1', 'uphold');
    fireEvent.click(screen.getByTestId('dispute-dismiss-btn'));
    expect(handleVoteDispute).toHaveBeenCalledWith('disp1', 'dismiss');
  });

  it('anlaşmazlık oyu verilmişse butonlar disabled olur', () => {
    const disputes = [makeDispute({ votes: { [ADDR_A]: 'uphold' } })];
    render(<GovernanceTab {...baseProps} disputes={disputes} />);
    expect(screen.getByTestId('dispute-uphold-btn')).toBeDisabled();
    expect(screen.getByTestId('dispute-dismiss-btn')).toBeDisabled();
  });

  it('öneri ekle butonu setShowAddPropose\'u çağırır', () => {
    const setShowAddPropose = vi.fn();
    render(<GovernanceTab {...baseProps} setShowAddPropose={setShowAddPropose} />);
    fireEvent.click(screen.getByTestId('add-proposal-btn'));
    expect(setShowAddPropose).toHaveBeenCalledWith(true);
  });

  it('anlaşmazlıklar bölümü başlığı görünür', () => {
    render(<GovernanceTab {...baseProps} />);
    expect(screen.getByText('group.disputes_title')).toBeInTheDocument();
  });
});
