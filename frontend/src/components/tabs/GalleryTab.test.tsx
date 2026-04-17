import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GalleryTab from './GalleryTab';
import type { Expense } from '../../lib/contract';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../lib/xlmPrice', () => ({
  formatStroopsWithUsd: (amount: number) => `${amount / 10_000_000} XLM`,
}));

vi.mock('../../lib/contract', () => ({}));

const t = (key: string) => key;

const baseProps = {
  expenses: [] as Expense[],
  currencyLabel: 'XLM',
  xlmUsd: null,
  t,
};

const makeExpenseWithAttachment = (id: number, url: string): Expense =>
  ({ id, payer: 'GAAA', amount: 10_000_000, description: `Expense ${id}`, category: 'food', split_among: [], attachment_url: url } as unknown as Expense);

describe('GalleryTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('boş liste durumunda empty state gösterir', () => {
    render(<GalleryTab {...baseProps} />);
    expect(screen.getByText('group.gallery_empty')).toBeInTheDocument();
    expect(screen.getByText('group.gallery_empty_hint')).toBeInTheDocument();
  });

  it('attachment\'lı expenses grid item\'larını render eder', () => {
    const expenses = [
      makeExpenseWithAttachment(1, 'https://example.com/a.jpg'),
      makeExpenseWithAttachment(2, 'https://example.com/b.jpg'),
    ];
    render(<GalleryTab {...baseProps} expenses={expenses} />);
    const imgs = document.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute('src', 'https://example.com/b.jpg'); // reversed
  });

  it('attachment olmayan expenses gösterilmez', () => {
    const expenses = [
      { id: 1, payer: 'G', amount: 10_000_000, description: 'No receipt', split_among: [] } as unknown as Expense,
    ];
    render(<GalleryTab {...baseProps} expenses={expenses} />);
    expect(screen.getByText('group.gallery_empty')).toBeInTheDocument();
  });

  it('item tıklaması window.open çağırır', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const expenses = [makeExpenseWithAttachment(1, 'https://example.com/receipt.jpg')];
    render(<GalleryTab {...baseProps} expenses={expenses} />);
    const gridItem = document.querySelector('.cursor-pointer') as HTMLElement;
    fireEvent.click(gridItem);
    expect(openSpy).toHaveBeenCalledWith('https://example.com/receipt.jpg', '_blank');
    openSpy.mockRestore();
  });
});
