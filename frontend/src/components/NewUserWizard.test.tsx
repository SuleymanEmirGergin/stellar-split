import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewUserWizard, { useShowWizard } from './NewUserWizard';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Lucide ikonları mock
vi.mock('lucide-react', () => ({
  X: () => <svg data-testid="icon-x" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Users: () => <svg data-testid="icon-users" />,
}));

const WIZARD_KEY = 'wizard_v1_done';

describe('useShowWizard', () => {
  beforeEach(() => localStorage.removeItem(WIZARD_KEY));

  it('localStorage boşken true döner', () => {
    expect(useShowWizard()).toBe(true);
  });

  it('localStorage dolu iken false döner', () => {
    localStorage.setItem(WIZARD_KEY, 'true');
    expect(useShowWizard()).toBe(false);
  });
});

describe('NewUserWizard', () => {
  beforeEach(() => localStorage.removeItem(WIZARD_KEY));

  it('ilk adımı render eder', () => {
    render(<NewUserWizard onClose={vi.fn()} />);
    expect(screen.getByText("Birik'e Hoş Geldiniz!")).toBeInTheDocument();
  });

  it('ileri butonu ile adım ilerler', () => {
    render(<NewUserWizard onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Başlayalım →'));
    expect(screen.getByText('Grup Oluşturun')).toBeInTheDocument();
  });

  it('son adımda "Hadi Başlayalım" butonu onClose çağırır ve localStorage yazar', () => {
    const onClose = vi.fn();
    render(<NewUserWizard onClose={onClose} />);
    // 4 adım — 3 kez ileri, 1 kez bitir
    fireEvent.click(screen.getByText('Başlayalım →'));
    fireEvent.click(screen.getByText('Anladım →'));
    fireEvent.click(screen.getByText('Devam →'));
    fireEvent.click(screen.getByText('Hadi Başlayalım'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem(WIZARD_KEY)).toBe('true');
  });

  it('X butonuna tıklanınca kapatır ve localStorage yazar', () => {
    const onClose = vi.fn();
    render(<NewUserWizard onClose={onClose} />);
    fireEvent.click(screen.getByTestId('icon-x').closest('button')!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem(WIZARD_KEY)).toBe('true');
  });

  it('progress dotları adım sayısını yansıtır', () => {
    render(<NewUserWizard onClose={vi.fn()} />);
    // 4 adım → 4 dot
    const dots = document.querySelectorAll('.h-1\\.5.rounded-full');
    expect(dots.length).toBe(4);
  });
});
