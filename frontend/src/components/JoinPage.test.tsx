import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import JoinPage from './JoinPage';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
  i18n: { t: (k: string) => k },
}));

vi.mock('../lib/contract', () => ({
  getGroup: vi.fn().mockResolvedValue({ name: 'Test Group' }),
  isDemoMode: vi.fn().mockReturnValue(false),
}));

const defaultProps = {
  groupId: 42,
  walletAddress: null,
  onConnect: vi.fn(),
  connecting: false,
  freighterAvailable: true,
  onOpenGroup: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('JoinPage', () => {
  it('renders join title', () => {
    render(<JoinPage {...defaultProps} />);
    expect(screen.getByText('join.title')).toBeTruthy();
  });

  it('shows connect wallet button when walletAddress is null', () => {
    render(<JoinPage {...defaultProps} walletAddress={null} />);
    const btn = screen.getByTestId('join-connect-btn');
    expect(btn).toBeTruthy();
    expect(screen.queryByTestId('join-open-group-btn')).toBeNull();
  });

  it('shows open group button when walletAddress is provided', () => {
    render(<JoinPage {...defaultProps} walletAddress="GABC123" />);
    const btn = screen.getByTestId('join-open-group-btn');
    expect(btn).toBeTruthy();
    expect(screen.queryByTestId('join-connect-btn')).toBeNull();
  });

  it('shows install freighter text when freighterAvailable is false', () => {
    render(<JoinPage {...defaultProps} walletAddress={null} freighterAvailable={false} />);
    expect(screen.getByText('join.install_freighter')).toBeTruthy();
  });

  it('shows connecting text when connecting is true', () => {
    render(<JoinPage {...defaultProps} walletAddress={null} connecting freighterAvailable />);
    expect(screen.getByText('join.connecting')).toBeTruthy();
  });

  it('falls back to group ID display name when no wallet address', () => {
    render(<JoinPage {...defaultProps} walletAddress={null} groupId={99} />);
    expect(screen.getByText('Grup #99')).toBeTruthy();
  });
});
