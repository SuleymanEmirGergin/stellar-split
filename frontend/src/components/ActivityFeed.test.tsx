import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ActivityFeed from './ActivityFeed';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
  i18n: { t: (k: string) => k },
}));

vi.mock('../lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`,
}));

vi.mock('./Avatar', () => ({
  default: ({ address }: { address: string }) => React.createElement('div', { 'data-testid': 'avatar', 'data-address': address }),
}));

const makeRecord = (id: string, type: string, txHash: string) => ({
  id,
  type,
  created_at: new Date().toISOString(),
  source_account: 'GABC1234567890',
  transaction_hash: txHash,
});

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('ActivityFeed', () => {
  it('shows loading skeleton initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ActivityFeed members={['GABC1234567890']} />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no relevant activities returned', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    });

    render(<ActivityFeed members={['GABC1234567890']} />);

    await waitFor(() => {
      expect(screen.getByText('group.activity_empty')).toBeTruthy();
    });
  });

  it('renders activity items for invoke_host_function and payment types', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          records: [
            makeRecord('1', 'invoke_host_function', 'TX001'),
            makeRecord('2', 'payment', 'TX002'),
            makeRecord('3', 'create_account', 'TX003'), // should be filtered out
          ],
        },
      }),
    });

    render(<ActivityFeed members={['GABC1234567890']} />);

    await waitFor(() => {
      expect(screen.getByText('activity.type_contract')).toBeTruthy();
      expect(screen.getByText('activity.type_payment')).toBeTruthy();
    });

    // create_account type should be filtered
    expect(screen.queryByText('create account')).toBeNull();
  });

  it('deduplicates activities with the same transaction hash', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          records: [
            makeRecord('1', 'invoke_host_function', 'TX_SAME'),
            makeRecord('2', 'invoke_host_function', 'TX_SAME'),
          ],
        },
      }),
    });

    render(<ActivityFeed members={['GABC1234567890']} />);

    await waitFor(() => {
      const items = screen.getAllByText('activity.type_contract');
      expect(items.length).toBe(1);
    });
  });

  it('refresh button triggers a new fetch', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    });

    render(<ActivityFeed members={['GABC1234567890']} />);

    await waitFor(() => screen.getByText('group.activity_empty'));

    fireEvent.click(screen.getByText(/common.refresh/));

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
    });
  });
});
