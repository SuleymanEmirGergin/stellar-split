import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import JoinPage from './JoinPage';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
  i18n: { t: (k: string) => k },
}));

const mockRegisterReferral = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../lib/contract', () => ({
  getGroup: vi.fn().mockResolvedValue({ name: 'Test Group' }),
  isDemoMode: vi.fn().mockReturnValue(false),
  registerReferral: mockRegisterReferral,
}));

const defaultProps = {
  groupId: 42,
  walletAddress: null,
  onConnect: vi.fn(),
  connecting: false,
  freighterAvailable: true,
  onOpenGroup: vi.fn(),
};

/** Helper: stub window.location.search without reloading the page. */
function setUrlSearch(search: string) {
  const url = new URL(window.location.href);
  url.search = search;
  window.history.replaceState({}, '', url.toString());
}

// Real Stellar Base32 test addresses — alphabet is [A-Z2-7] only, no 0/1/8/9.
// These are the same two used in the e2e suite (frontend/e2e/utils/session.ts).
const VALID_G1 = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVKB'; // 56 chars
const VALID_G2 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'; // 56 chars

beforeEach(() => {
  vi.clearAllMocks();
  mockRegisterReferral.mockReset();
  mockRegisterReferral.mockResolvedValue(undefined);
  localStorage.clear();
  setUrlSearch('');
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

  describe('referral handshake', () => {
    it('does not call registerReferral when wallet is not connected', () => {
      setUrlSearch(`?ref=${VALID_G1}`);
      render(<JoinPage {...defaultProps} walletAddress={null} />);
      expect(mockRegisterReferral).not.toHaveBeenCalled();
    });

    it('does not call registerReferral when ?ref= is absent', () => {
      setUrlSearch('');
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      expect(mockRegisterReferral).not.toHaveBeenCalled();
    });

    it('does not call registerReferral when ?ref= is malformed', () => {
      setUrlSearch('?ref=not-a-valid-address');
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      expect(mockRegisterReferral).not.toHaveBeenCalled();
    });

    it('calls registerReferral once when wallet connects with a valid ?ref=', async () => {
      setUrlSearch(`?ref=${VALID_G1}`);
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      await waitFor(() => expect(mockRegisterReferral).toHaveBeenCalledTimes(1));
      expect(mockRegisterReferral).toHaveBeenCalledWith(VALID_G2, VALID_G1, VALID_G2);
    });

    it('does not call registerReferral when ref equals the wallet (self-referral)', () => {
      setUrlSearch(`?ref=${VALID_G2}`);
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      expect(mockRegisterReferral).not.toHaveBeenCalled();
    });

    it('skips registerReferral on re-render if already claimed in localStorage', () => {
      setUrlSearch(`?ref=${VALID_G1}`);
      localStorage.setItem(`birik_ref_claimed:${VALID_G2}:${VALID_G1}`, '1');
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      expect(mockRegisterReferral).not.toHaveBeenCalled();
    });

    it('persists the claim flag after a successful registerReferral', async () => {
      setUrlSearch(`?ref=${VALID_G1}`);
      mockRegisterReferral.mockResolvedValue(undefined);
      render(<JoinPage {...defaultProps} walletAddress={VALID_G2} />);
      await waitFor(() =>
        expect(localStorage.getItem(`birik_ref_claimed:${VALID_G2}:${VALID_G1}`)).toBe('1'),
      );
    });
  });
});
