import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecurringTab from './RecurringTab';
import type { RecurringTemplate } from '../../lib/recurring';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../ui/SkeletonShimmer', () => ({
  SkeletonShimmer: () => <div data-testid="skeleton" />,
}));

const t = (key: string) => key;

const mockSubs: RecurringTemplate[] = [
  { id: 'sub1', name: 'Netflix', interval: 'monthly', amount: 15, members: [], category: 'entertainment', createdAt: Date.now() },
  { id: 'sub2', name: 'Spotify', interval: 'monthly', amount: 10, members: [], category: 'entertainment', createdAt: Date.now() },
];

describe('RecurringTab', () => {
  it('abonelik yokken empty state gösterir', () => {
    render(<RecurringTab subscriptions={[]} setShowAddSub={vi.fn()} t={t} />);
    expect(screen.getByText('group.recurring_empty')).toBeInTheDocument();
  });

  it('abonelik listesini render eder', () => {
    render(<RecurringTab subscriptions={mockSubs} setShowAddSub={vi.fn()} t={t} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
  });

  it('silme butonu onDelete\'i abonelik id\'siyle çağırır', () => {
    const onDelete = vi.fn();
    render(<RecurringTab subscriptions={mockSubs} setShowAddSub={vi.fn()} onDelete={onDelete} t={t} />);
    const deleteBtns = screen.getAllByTitle('Delete recurring');
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith('sub1');
  });

  it('isBackend=true ise sync badge görünür', () => {
    render(<RecurringTab subscriptions={[]} setShowAddSub={vi.fn()} isBackend={true} t={t} />);
    expect(screen.getByText('group.recurring_synced')).toBeInTheDocument();
  });

  it('isBackend=false ise sync badge görünmez', () => {
    render(<RecurringTab subscriptions={[]} setShowAddSub={vi.fn()} isBackend={false} t={t} />);
    expect(screen.queryByText('group.recurring_synced')).not.toBeInTheDocument();
  });

  it('yükleme durumunda skeleton gösterir', () => {
    render(<RecurringTab subscriptions={[]} setShowAddSub={vi.fn()} isLoading={true} t={t} />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('abonelik ekle butonu setShowAddSub\'i çağırır', () => {
    const setShowAddSub = vi.fn();
    render(<RecurringTab subscriptions={[]} setShowAddSub={setShowAddSub} t={t} />);
    fireEvent.click(screen.getByTestId('add-subscription-btn'));
    expect(setShowAddSub).toHaveBeenCalledWith(true);
  });
});
