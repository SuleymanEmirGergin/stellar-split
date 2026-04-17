import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecurringSplits } from './RecurringSplits';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', p, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('RecurringSplits', () => {
  it('renders "Scheduled Splits" heading', () => {
    render(<RecurringSplits />);
    expect(screen.getByText(/Scheduled Splits/i)).toBeTruthy();
  });

  it('shows all 3 item titles', () => {
    render(<RecurringSplits />);
    expect(screen.getByText(/Office Rent/i)).toBeTruthy();
    expect(screen.getByText(/Internet Service/i)).toBeTruthy();
    expect(screen.getByText(/SaaS Subscription/i)).toBeTruthy();
  });

  it('shows amount labels', () => {
    render(<RecurringSplits />);
    expect(screen.getByText('1200 XLM')).toBeTruthy();
    expect(screen.getByText('45 XLM')).toBeTruthy();
    expect(screen.getByText('200 XLM')).toBeTruthy();
  });

  it('has at least one button (plus button)', () => {
    render(<RecurringSplits />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
