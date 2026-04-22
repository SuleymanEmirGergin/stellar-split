import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

/**
 * framer-motion mock:
 *  - `useInView` returns false so the animation never kicks off; the
 *    displayed counter stays at 0 and we can assert on deterministic
 *    output without waiting for time-based updates.
 *  - `animate` returns a noop controls object.
 *  - `motion.div` stays passthrough (KPICard doesn't use it directly
 *    but other imports from framer-motion might drag it in indirectly).
 */
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useInView: () => false,
  animate: () => ({ stop: () => {} }),
}));

describe('KPICard', () => {
  it('renders the label in ready state', () => {
    render(<KPICard label="Total groups" value={1234} />);
    expect(screen.getByText('Total groups')).toBeTruthy();
    expect(screen.getByTestId('kpi-card')).toBeTruthy();
  });

  it('starts at zero before scrolling into view (useInView mocked false)', () => {
    render(<KPICard label="Total groups" value={1234} />);
    // Counter is at 0 because useInView returned false — animation never started.
    // Format for 0 at decimals=0 is "0".
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('applies the suffix after the formatted value', () => {
    render(<KPICard label="Volume" value={100} suffix=" XLM" />);
    expect(screen.getByText('0 XLM')).toBeTruthy();
  });

  it('renders the loading skeleton when value is null', () => {
    render(<KPICard label="Total groups" value={null} />);
    expect(screen.queryByTestId('kpi-card')).toBeNull();
    expect(screen.getByTestId('kpi-card-loading')).toBeTruthy();
    expect(screen.getByText('Total groups')).toBeTruthy();
  });

  it('renders the loading skeleton when value is undefined', () => {
    render(<KPICard label="Active today" value={undefined} />);
    expect(screen.getByTestId('kpi-card-loading')).toBeTruthy();
    expect(screen.getByText('Active today')).toBeTruthy();
  });

  it('renders the loading skeleton when loading=true even with a number value', () => {
    render(<KPICard label="Settled" value={500} loading={true} />);
    expect(screen.getByTestId('kpi-card-loading')).toBeTruthy();
  });

  it('renders the error state with em-dash placeholder', () => {
    render(<KPICard label="Volume" value={100} error={true} />);
    expect(screen.queryByTestId('kpi-card')).toBeNull();
    expect(screen.getByTestId('kpi-card-error')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Volume')).toBeTruthy();
  });

  it('error state takes precedence over loading', () => {
    render(<KPICard label="Volume" value={null} loading={true} error={true} />);
    expect(screen.getByTestId('kpi-card-error')).toBeTruthy();
    expect(screen.queryByTestId('kpi-card-loading')).toBeNull();
  });

  it('renders the icon when provided in ready state', () => {
    render(
      <KPICard
        label="Volume"
        value={100}
        icon={<svg data-testid="kpi-icon" />}
      />,
    );
    expect(screen.getByTestId('kpi-icon')).toBeTruthy();
  });

  it('loading skeleton is aria-busy for accessibility', () => {
    render(<KPICard label="Total" value={null} />);
    expect(screen.getByTestId('kpi-card-loading').getAttribute('aria-busy')).toBe('true');
  });
});
