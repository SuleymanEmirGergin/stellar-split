import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SavingsLeaderboard from './SavingsLeaderboard';
import type { SavingsContributorRollup } from './useSavingsPools';

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'savings.leaderboard_title': 'Top Contributors',
        'savings.leaderboard_count_suffix': 'people',
        'savings.leaderboard_more': '+{{n}} more',
        'savings.leaderboard_collapse': 'Collapse',
      };
      return map[k] ?? k;
    },
    lang: 'en',
  }),
}));

vi.mock('../../lib/stellar', () => ({
  // Keep more of the prefix so each test address remains unique after
  // truncation — otherwise multiple GUSER* rows collapse to the same string.
  truncateAddress: (a: string) => `${a.slice(0, 6)}…${a.slice(-3)}`,
}));

function row(addr: string, amount: number, share: number): SavingsContributorRollup {
  return { walletAddress: addr, totalAmount: amount, share };
}

describe('SavingsLeaderboard', () => {
  it('returns null when there are no contributors', () => {
    const { container } = render(<SavingsLeaderboard contributors={[]} currency="XLM" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a podium of medal emoji for the top three', () => {
    render(
      <SavingsLeaderboard
        contributors={[
          row('GALICE...AAA', 100, 0.5),
          row('GBOB...BBB', 60, 0.3),
          row('GCHARLIE...CCC', 40, 0.2),
        ]}
        currency="XLM"
      />,
    );
    // 🥇🥈🥉 are decorative — they're rendered text but still present in the DOM.
    expect(screen.getByText('🥇')).toBeTruthy();
    expect(screen.getByText('🥈')).toBeTruthy();
    expect(screen.getByText('🥉')).toBeTruthy();
  });

  it('renders only one row when only one contributor exists', () => {
    render(
      <SavingsLeaderboard
        contributors={[row('GSOLO...AAA', 100, 1)]}
        currency="USDC"
      />,
    );
    // Only the gold medal — no silver or bronze should render.
    expect(screen.getByText('🥇')).toBeTruthy();
    expect(screen.queryByText('🥈')).toBeNull();
    expect(screen.queryByText('🥉')).toBeNull();
  });

  it('hides rows beyond maxRows behind a "+N more" toggle', () => {
    const contributors = Array.from({ length: 8 }, (_, i) =>
      row(`GUSER${i}AAAA`, 100 - i, (100 - i) / 100),
    );
    render(
      <SavingsLeaderboard contributors={contributors} currency="XLM" maxRows={3} />,
    );
    // The toggle exposes the remaining 5.
    const toggle = screen.getByText(/\+5 more/);
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);
    // After expand: collapse control rendered.
    expect(screen.getByText('Collapse')).toBeTruthy();
  });

  it('shows the contributor count in the header', () => {
    render(
      <SavingsLeaderboard
        contributors={[
          row('GAAAA', 50, 0.5),
          row('GBBBB', 30, 0.3),
          row('GCCCC', 20, 0.2),
        ]}
        currency="XLM"
      />,
    );
    // The count and the suffix render inside the same span; use a regex
    // matcher because React's text children produce a single text node.
    expect(screen.getByText(/3\s+people/)).toBeTruthy();
  });

  it('renders an ordered list (a11y)', () => {
    render(
      <SavingsLeaderboard
        contributors={[row('GA', 50, 1)]}
        currency="XLM"
      />,
    );
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('shows currency suffix in the amount cell', () => {
    render(
      <SavingsLeaderboard
        contributors={[row('GA', 50, 1)]}
        currency="USDC"
      />,
    );
    // truncateAddress mock prepends the contribution row; the currency
    // appears next to the amount.
    expect(screen.getByText('USDC')).toBeTruthy();
  });
});
