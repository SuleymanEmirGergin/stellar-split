import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TxHistory from './TxHistory';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

vi.mock('../lib/stellar', () => ({
  truncateAddress: (s: string) => s.slice(0, 6) + '...',
  getExplorerTxUrl: (h: string) => `https://stellar.expert/tx/${h}`,
}));

vi.mock('./ui', () => ({
  SkeletonShimmer: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

const makeRecord = (type: string, hash: string) => ({
  id: hash,
  type,
  created_at: new Date().toISOString(),
  source_account: 'GABC1234',
  transaction_hash: hash,
});

describe('TxHistory', () => {
  it('shows skeletons while loading', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TxHistory walletAddress="GABC1234" />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows error when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<TxHistory walletAddress="GABC1234" />);

    await waitFor(() => expect(screen.getByText(/HTTP 500/)).toBeTruthy());
  });

  it('shows empty state when no transactions', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    });

    render(<TxHistory walletAddress="GABC1234" />);

    await waitFor(() => screen.getByText('No transactions yet.'));
  });

  it('renders transaction items', async () => {
    const records = [makeRecord('invoke_host_function', 'TXHASH001')];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records } }),
    });

    render(<TxHistory walletAddress="GABC1234" />);

    await waitFor(() => expect(screen.getByText(/tx\.type_contract/)).toBeTruthy());
  });

  it('refresh button triggers new fetch', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    });

    render(<TxHistory walletAddress="GABC1234" />);

    await waitFor(() => screen.getByText('tx.refresh'));

    fireEvent.click(screen.getByText('tx.refresh'));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
  });
});
