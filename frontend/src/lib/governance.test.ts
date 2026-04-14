import {
  loadDisputes,
  saveDisputes,
  initiateDispute,
  loadProposals,
  saveProposals,
  calculateProposalMetrics,
  createProposal,
  type Proposal,
  type Dispute,
} from './governance';

beforeEach(() => {
  localStorage.clear();
});

// ─── Disputes ─────────────────────────────────────────────────────────────────

describe('saveDisputes / loadDisputes', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadDisputes(1)).toEqual([]);
  });

  it('persists and loads disputes', () => {
    const d: Dispute = {
      id: 'd1',
      initiator: 'GA',
      expenseId: 'e1',
      amount: 100,
      category: 'food',
      description: 'test',
      votes: {},
      status: 'open',
      createdAt: 1000,
    };
    saveDisputes(1, [d]);
    expect(loadDisputes(1)).toEqual([d]);
  });

  it('isolates data between groups', () => {
    const d: Dispute = {
      id: 'd1',
      initiator: 'GA',
      expenseId: 'e1',
      amount: 50,
      category: 'travel',
      description: 'trip',
      votes: {},
      status: 'open',
      createdAt: 1000,
    };
    saveDisputes(1, [d]);
    expect(loadDisputes(2)).toEqual([]);
  });
});

describe('initiateDispute', () => {
  it('creates a dispute with correct fields', () => {
    const d = initiateDispute('GA', 'e1', 99, 'food', 'dinner');
    expect(d.initiator).toBe('GA');
    expect(d.expenseId).toBe('e1');
    expect(d.amount).toBe(99);
    expect(d.category).toBe('food');
    expect(d.description).toBe('dinner');
    expect(d.status).toBe('open');
    expect(d.votes).toEqual({});
    expect(d.id).toMatch(/^dispute_/);
  });

  it('generates unique IDs', () => {
    const a = initiateDispute('GA', 'e1', 1, 'c', 'd');
    const b = initiateDispute('GA', 'e1', 1, 'c', 'd');
    expect(a.id).not.toBe(b.id);
  });
});

// ─── Proposals ────────────────────────────────────────────────────────────────

describe('saveProposals / loadProposals', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadProposals(1)).toEqual([]);
  });

  it('persists and loads proposals', () => {
    const p: Proposal = {
      id: 'p1',
      creator: 'GA',
      title: 'Test',
      description: 'desc',
      votes: {},
      status: 'active',
      createdAt: 1000,
      endsAt: 2000,
      threshold: 51,
    };
    saveProposals(1, [p]);
    expect(loadProposals(1)).toEqual([p]);
  });

  it('overwrites previous proposals', () => {
    const p1: Proposal = { id: 'p1', creator: 'GA', title: 'T1', description: '', votes: {}, status: 'active', createdAt: 0, endsAt: 0, threshold: 51 };
    const p2: Proposal = { id: 'p2', creator: 'GB', title: 'T2', description: '', votes: {}, status: 'active', createdAt: 0, endsAt: 0, threshold: 51 };
    saveProposals(1, [p1]);
    saveProposals(1, [p2]);
    expect(loadProposals(1)).toEqual([p2]);
  });
});

// ─── calculateProposalMetrics ─────────────────────────────────────────────────

describe('calculateProposalMetrics', () => {
  const base: Proposal = {
    id: 'p1', creator: 'GA', title: 'T', description: '', votes: {},
    status: 'active', createdAt: 0, endsAt: 0, threshold: 51,
  };

  it('returns zeros for no votes', () => {
    const m = calculateProposalMetrics(base, 4);
    expect(m.yesVotes).toBe(0);
    expect(m.noVotes).toBe(0);
    expect(m.totalVotesCast).toBe(0);
    expect(m.yesPercent).toBe(0);
    expect(m.isPassed).toBe(false);
  });

  it('calculates yesPercent based on totalMembers', () => {
    const p = { ...base, votes: { GA: 'yes' as const, GB: 'yes' as const } };
    const m = calculateProposalMetrics(p, 4);
    expect(m.yesVotes).toBe(2);
    expect(m.noVotes).toBe(0);
    expect(m.yesPercent).toBe(50); // 2/4 = 50%
    expect(m.isPassed).toBe(false); // 50 < threshold 51
  });

  it('marks isPassed when yesPercent >= threshold', () => {
    const p = { ...base, votes: { GA: 'yes' as const, GB: 'yes' as const, GC: 'yes' as const }, threshold: 51 };
    const m = calculateProposalMetrics(p, 4);
    expect(m.yesPercent).toBe(75);
    expect(m.isPassed).toBe(true);
  });

  it('returns 0 yesPercent when totalMembers is 0', () => {
    const p = { ...base, votes: { GA: 'yes' as const } };
    const m = calculateProposalMetrics(p, 0);
    expect(m.yesPercent).toBe(0);
  });

  it('counts no votes separately', () => {
    const p = { ...base, votes: { GA: 'yes' as const, GB: 'no' as const, GC: 'no' as const } };
    const m = calculateProposalMetrics(p, 3);
    expect(m.yesVotes).toBe(1);
    expect(m.noVotes).toBe(2);
    expect(m.totalVotesCast).toBe(3);
  });
});

// ─── createProposal ───────────────────────────────────────────────────────────

describe('createProposal', () => {
  it('returns proposal template with default threshold 51', () => {
    const p = createProposal('GA', 'Title', 'Desc');
    expect(p.creator).toBe('GA');
    expect(p.title).toBe('Title');
    expect(p.description).toBe('Desc');
    expect(p.threshold).toBe(51);
  });

  it('endsAt is in the future (default 3 days)', () => {
    const before = Date.now();
    const p = createProposal('GA', 'T', 'D');
    expect(p.endsAt).toBeGreaterThan(before);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(p.endsAt).toBeGreaterThanOrEqual(before + threeDaysMs - 100);
  });

  it('respects custom durationDays', () => {
    const before = Date.now();
    const p = createProposal('GA', 'T', 'D', 7);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(p.endsAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 100);
  });
});
