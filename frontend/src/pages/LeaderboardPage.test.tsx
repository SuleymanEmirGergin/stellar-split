import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardPage from './LeaderboardPage';

// i18n identity mock
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'tr' }),
  i18n: { t: (k: string) => k },
}));

// App store — return whatever value the test wants for walletAddress
let mockWallet: string | null = null;
vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (s: { walletAddress: string | null }) => unknown) =>
    selector({ walletAddress: mockWallet }),
}));

const mockLeaderboard = vi.fn();
vi.mock('../lib/api', () => ({
  analyticsApi: {
    leaderboard: (...args: unknown[]) => mockLeaderboard(...args),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <LeaderboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const sample = {
  top: [
    { rank: 1, walletAddress: 'GAAAAAAAAAAA', settlementsInitiated: 9, spltBalance: 900, totalVolumeXlm: 90.5 },
    { rank: 2, walletAddress: 'GBBBBBBBBBBB', settlementsInitiated: 5, spltBalance: 500, totalVolumeXlm: 45 },
    { rank: 3, walletAddress: 'GCCCCCCCCCCC', settlementsInitiated: 3, spltBalance: 300, totalVolumeXlm: 30 },
  ],
  lastUpdated: '2026-04-22T10:00:00.000Z',
};

beforeEach(() => {
  mockWallet = null;
  mockLeaderboard.mockReset();
  mockNavigate.mockReset();
});

describe('LeaderboardPage', () => {
  it('renders the page title + subtitle', async () => {
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    expect(screen.getByText('leaderboard.title')).toBeTruthy();
    expect(screen.getByText('leaderboard.subtitle')).toBeTruthy();
  });

  it('shows the loading skeleton while the query is in flight', () => {
    mockLeaderboard.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByTestId('leaderboard-skeleton')).toBeTruthy();
  });

  it('renders the top rows after data loads', async () => {
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-list')).toBeTruthy());
    expect(screen.getByTestId('leaderboard-row-1')).toBeTruthy();
    expect(screen.getByTestId('leaderboard-row-2')).toBeTruthy();
    expect(screen.getByTestId('leaderboard-row-3')).toBeTruthy();
  });

  it('shows the empty state when top is empty', async () => {
    mockLeaderboard.mockResolvedValue({ data: { top: [], lastUpdated: sample.lastUpdated } });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-empty')).toBeTruthy());
  });

  it('renders your-rank row when viewer is outside the top slice', async () => {
    mockWallet = 'GZZZZZZZZZZZ';
    mockLeaderboard.mockResolvedValue({
      data: {
        ...sample,
        yourRank: {
          rank: 47,
          walletAddress: 'GZZZZZZZZZZZ',
          settlementsInitiated: 1,
          spltBalance: 100,
          totalVolumeXlm: 5,
        },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-your-rank')).toBeTruthy());
    // yourRank row is a LeaderboardRow with rank=47
    expect(screen.getByTestId('leaderboard-row-47')).toBeTruthy();
  });

  it('does NOT render your-rank row when viewer is already in the top', async () => {
    mockWallet = 'GAAAAAAAAAAA'; // same as sample.top[0]
    mockLeaderboard.mockResolvedValue({
      data: {
        ...sample,
        yourRank: sample.top[0],
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-row-1')).toBeTruthy());
    expect(screen.queryByTestId('leaderboard-your-rank')).toBeNull();
  });

  it('renders the error state when the API rejects', async () => {
    mockLeaderboard.mockRejectedValue(new Error('500 Server Error'));
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-error')).toBeTruthy());
  });

  it('passes walletAddress as query param when wallet is connected', async () => {
    mockWallet = 'GCONNECTED';
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    await waitFor(() => expect(mockLeaderboard).toHaveBeenCalled());
    expect(mockLeaderboard).toHaveBeenCalledWith({ wallet: 'GCONNECTED' });
  });

  it('omits the wallet query param when disconnected', async () => {
    mockWallet = null;
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    await waitFor(() => expect(mockLeaderboard).toHaveBeenCalled());
    expect(mockLeaderboard).toHaveBeenCalledWith({ wallet: undefined });
  });

  it('back button navigates to the home route', async () => {
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    fireEvent.click(screen.getByTestId('leaderboard-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('CTA button navigates to the home route', async () => {
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    fireEvent.click(screen.getByTestId('leaderboard-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('every row links to Stellar Expert testnet account view', async () => {
    mockLeaderboard.mockResolvedValue({ data: sample });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('leaderboard-row-1')).toBeTruthy());
    const row = screen.getByTestId('leaderboard-row-1') as HTMLAnchorElement;
    expect(row.href).toMatch(
      /^https:\/\/stellar\.expert\/explorer\/testnet\/account\/GAAAAAAAAAAA$/,
    );
    expect(row.target).toBe('_blank');
  });
});
