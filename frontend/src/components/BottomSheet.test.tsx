import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomSheet from './BottomSheet';

vi.mock('framer-motion', () => {
  const Comp = ({
    children,
    onClick,
    onDragEnd,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & { onDragEnd?: unknown; drag?: unknown; dragConstraints?: unknown; dragElastic?: unknown }) => (
    <div onClick={onClick} data-drag={String(!!onDragEnd)} {...rest}>
      {children}
    </div>
  );
  return {
    motion: { div: Comp },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('BottomSheet', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('open=false iken içerik render etmez', () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <p>İçerik</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('İçerik')).toBeNull();
  });

  it('open=true iken içerik gösterir', () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <p>İçerik</p>
      </BottomSheet>,
    );
    expect(screen.getByText('İçerik')).toBeInTheDocument();
  });

  it('title prop geçildiğinde başlık gösterir', () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()} title="Yeni Harcama">
        <span>form</span>
      </BottomSheet>,
    );
    expect(screen.getByText('Yeni Harcama')).toBeInTheDocument();
  });

  it('backdrop tıklandığında onClose çağrılır', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open={true} onClose={onClose}>
        <span>içerik</span>
      </BottomSheet>,
    );
    // İlk motion.div backdrop
    const divs = document.querySelectorAll('[data-drag]');
    fireEvent.click(divs[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('open=true iken body scroll kilitler', () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <span>x</span>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('kapatılınca body scroll serbest bırakır', () => {
    const { rerender } = render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <span>x</span>
      </BottomSheet>,
    );
    rerender(
      <BottomSheet open={false} onClose={vi.fn()}>
        <span>x</span>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
