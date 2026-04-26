import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusFilterChips from './StatusFilterChips';

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'savings.filter_aria_label': 'Filter by pool status',
        'savings.filter_all': 'All',
        'savings.filter_active': 'Active',
        'savings.filter_completed': 'Completed',
        'savings.filter_cancelled': 'Cancelled',
      };
      return map[k] ?? k;
    },
    lang: 'en',
  }),
}));

const COUNTS = { ALL: 8, ACTIVE: 4, COMPLETED: 3, CANCELLED: 1 };

describe('StatusFilterChips', () => {
  it('renders all four chips with their counts', () => {
    render(<StatusFilterChips status="ALL" counts={COUNTS} onChange={() => {}} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('marks the current status as aria-selected', () => {
    render(<StatusFilterChips status="ACTIVE" counts={COUNTS} onChange={() => {}} />);
    const activeTab = screen.getByRole('tab', { name: /Active/ });
    expect(activeTab.getAttribute('aria-selected')).toBe('true');
    const allTab = screen.getByRole('tab', { name: /All/ });
    expect(allTab.getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange with the chip value when clicked', () => {
    const onChange = vi.fn();
    render(<StatusFilterChips status="ALL" counts={COUNTS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Cancelled/ }));
    expect(onChange).toHaveBeenCalledWith('CANCELLED');
  });

  it('uses role="tablist" with an aria-label for screen readers', () => {
    render(<StatusFilterChips status="ALL" counts={COUNTS} onChange={() => {}} />);
    const list = screen.getByRole('tablist');
    expect(list.getAttribute('aria-label')).toBe('Filter by pool status');
  });
});
