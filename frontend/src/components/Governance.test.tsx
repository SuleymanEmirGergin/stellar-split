import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Governance } from './Governance';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => React.createElement('div', p, children),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../lib/dao', () => ({
  MOCK_PROPOSALS: [
    {
      id: 'p1',
      title: 'Alpha Proposal',
      description: 'Desc A',
      status: 'Active',
      category: 'Rule',
      proposer: 'GABC',
      voteCount: { yes: 100, no: 20, abstain: 0 },
    },
    {
      id: 'p2',
      title: 'Beta Proposal',
      description: 'Desc B',
      status: 'Passed',
      category: 'Finance',
      proposer: 'GXYZ',
      voteCount: { yes: 200, no: 10, abstain: 5 },
    },
  ],
  calculateSocialCredit: vi.fn().mockReturnValue({
    tier: 'Silver',
    votingPower: 145,
    nextTierProgress: 60,
    benefits: ['Benefit A'],
  }),
}));

describe('Governance', () => {
  it('renders "DAO Governance" heading', () => {
    render(<Governance onBack={vi.fn()} />);
    expect(screen.getByText('DAO Governance')).toBeTruthy();
  });

  it('shows all 3 filter buttons: Active, Passed, All', () => {
    render(<Governance onBack={vi.fn()} />);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(screen.getByText('All')).toBeTruthy();
  });

  it('default Active filter shows Alpha Proposal but not Beta Proposal', () => {
    render(<Governance onBack={vi.fn()} />);
    expect(screen.getByText('Alpha Proposal')).toBeTruthy();
    expect(screen.queryByText('Beta Proposal')).toBeNull();
  });

  it('clicking All filter shows both proposals', () => {
    render(<Governance onBack={vi.fn()} />);
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('Alpha Proposal')).toBeTruthy();
    expect(screen.getByText('Beta Proposal')).toBeTruthy();
  });

  it('clicking Vote Yes on active proposal shows Vote Cast', () => {
    render(<Governance onBack={vi.fn()} />);
    fireEvent.click(screen.getByText(/Vote Yes/));
    expect(screen.getByText(/Vote Cast/)).toBeTruthy();
  });
});
