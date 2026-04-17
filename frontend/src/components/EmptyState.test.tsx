import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

// framer-motion'ı basit bir sarmalayıcıyla mock'la
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('EmptyState', () => {
  it('başlık ve ikon render eder', () => {
    render(<EmptyState icon={<span data-testid="icon">🌍</span>} title="Henüz grup yok" />);
    expect(screen.getByText('Henüz grup yok')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('description verildiğinde gösterir', () => {
    render(
      <EmptyState
        icon="💸"
        title="Harcama yok"
        description="Henüz harcama eklenmemiş"
      />,
    );
    expect(screen.getByText('Henüz harcama eklenmemiş')).toBeInTheDocument();
  });

  it('description verilmediğinde göstermez', () => {
    render(<EmptyState icon="✅" title="Temiz" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('action butonu render eder ve tıklanabilir', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon="➕"
        title="Boş"
        action={{ label: 'Grup Oluştur', onClick }}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Grup Oluştur' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('action yoksa buton göstermez', () => {
    render(<EmptyState icon="✅" title="Temiz" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
