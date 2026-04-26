import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SavingsStatsHero from './SavingsStatsHero';

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'savings.stats_heading': 'Savings overview',
        'savings.stats_total_label': 'Total Saved',
        'savings.stats_target_suffix': 'target',
        'savings.stats_active_label': 'Active Pools',
        'savings.stats_active_suffix': 'pools',
        'savings.stats_active_zero_hint': 'No pools yet',
        'savings.stats_active_active_hint': 'Heading toward the goal',
        'savings.stats_progress_label': 'Goal Progress',
        'savings.stats_progress_aria': 'Overall goal progress',
        'savings.empty_hero_cta': 'Create your first pool',
        'savings.empty_hero_subtitle': '30 seconds, on-chain proof',
        'savings.new_pool_btn': 'New Pool',
      };
      return map[k] ?? k;
    },
    lang: 'en',
  }),
}));

// Disable count-up animation in tests so we can assert on final values directly.
vi.mock('../../lib/motion', () => ({
  useMotionEnabled: () => false,
}));

describe('SavingsStatsHero', () => {
  it('renders the empty hero variant with a single CTA when isEmpty is true', () => {
    const onCreate = vi.fn();
    render(
      <SavingsStatsHero
        totalCurrent={0}
        totalGoal={0}
        overallPct={0}
        activeCount={0}
        currency="XLM"
        onCreatePool={onCreate}
        isEmpty={true}
      />,
    );

    // Empty variant shows the CTA copy + button, no KPI cards.
    expect(screen.getByText('Create your first pool')).toBeTruthy();
    expect(screen.getByText('30 seconds, on-chain proof')).toBeTruthy();
    expect(screen.queryByText('Goal Progress')).toBeNull(); // KPI cards are hidden

    fireEvent.click(screen.getByText('New Pool'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders the full hero with three KPI cards when not empty', () => {
    render(
      <SavingsStatsHero
        totalCurrent={150}
        totalGoal={200}
        overallPct={75}
        activeCount={3}
        currency="XLM"
        onCreatePool={() => {}}
        isEmpty={false}
      />,
    );
    expect(screen.getByText('Total Saved')).toBeTruthy();
    expect(screen.getByText('Active Pools')).toBeTruthy();
    expect(screen.getByText('Goal Progress')).toBeTruthy();
    // Active count is rendered.
    expect(screen.getByText('3')).toBeTruthy();
    // Progress percentage shows the value.
    expect(screen.getByText('75.0')).toBeTruthy();
  });

  it('exposes a labelled <progress> element for screen readers', () => {
    render(
      <SavingsStatsHero
        totalCurrent={50}
        totalGoal={100}
        overallPct={50}
        activeCount={1}
        currency="XLM"
        onCreatePool={() => {}}
        isEmpty={false}
      />,
    );
    const bar = screen.getByLabelText('Overall goal progress') as HTMLProgressElement;
    expect(bar).toBeTruthy();
    expect(bar.value).toBe(50);
    expect(bar.max).toBe(100);
  });

  it('uses an aria-labelledby section so the screen reader knows the surface', () => {
    const { container } = render(
      <SavingsStatsHero
        totalCurrent={10}
        totalGoal={20}
        overallPct={50}
        activeCount={1}
        currency="XLM"
        onCreatePool={() => {}}
        isEmpty={false}
      />,
    );
    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-labelledby')).toBe('savings-stats-heading');
    expect(screen.getByText('Savings overview').tagName).toBe('H2');
  });

  it('CTA wires through to onCreatePool from the populated hero too', () => {
    const onCreate = vi.fn();
    render(
      <SavingsStatsHero
        totalCurrent={50}
        totalGoal={100}
        overallPct={50}
        activeCount={1}
        currency="XLM"
        onCreatePool={onCreate}
        isEmpty={false}
      />,
    );
    fireEvent.click(screen.getByText('New Pool'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows the contextual hint based on activeCount', () => {
    const { rerender } = render(
      <SavingsStatsHero
        totalCurrent={0}
        totalGoal={0}
        overallPct={0}
        activeCount={0}
        currency="XLM"
        onCreatePool={() => {}}
        isEmpty={false}
      />,
    );
    expect(screen.getByText('No pools yet')).toBeTruthy();

    rerender(
      <SavingsStatsHero
        totalCurrent={50}
        totalGoal={100}
        overallPct={50}
        activeCount={2}
        currency="XLM"
        onCreatePool={() => {}}
        isEmpty={false}
      />,
    );
    expect(screen.getByText('Heading toward the goal')).toBeTruthy();
  });
});
