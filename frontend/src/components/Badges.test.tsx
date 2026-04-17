import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Badges } from './Badges';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => React.createElement('div', p, children),
    button: ({ children, ...p }: any) => React.createElement('button', p, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('../lib/sbt', () => ({
  mintSBT: vi.fn().mockResolvedValue(undefined),
  isBadgeMinted: vi.fn().mockReturnValue(false),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Badges', () => {
  it('shows "0 / 7 Rozet Açıldı" with empty owned list', () => {
    render(<Badges ownedIds={[]} onOpenVault={vi.fn()} />);
    expect(screen.getByText('0 / 7 Rozet Açıldı')).toBeTruthy();
  });

  it('shows "2 / 7 Rozet Açıldı" with 2 owned badges', () => {
    render(<Badges ownedIds={[1, 2]} onOpenVault={vi.fn()} />);
    expect(screen.getByText('2 / 7 Rozet Açıldı')).toBeTruthy();
  });

  it('renders all 7 badge names', () => {
    render(<Badges ownedIds={[]} onOpenVault={vi.fn()} />);
    expect(screen.getByText('Sadık Ödeyen')).toBeTruthy();
    expect(screen.getByText('Tasarruf Ustası')).toBeTruthy();
    expect(screen.getByText('Güvenilir Üye')).toBeTruthy();
    expect(screen.getByText('Sosyal Kelebek')).toBeTruthy();
    expect(screen.getByText('The Flash')).toBeTruthy();
    expect(screen.getByText('Vault Master')).toBeTruthy();
    expect(screen.getByText('Geliştirici')).toBeTruthy();
  });

  it('calls onOpenVault when Soulbound Vault button is clicked', () => {
    const onOpenVault = vi.fn();
    render(<Badges ownedIds={[]} onOpenVault={onOpenVault} />);
    fireEvent.click(screen.getByText(/Soulbound Vault/));
    expect(onOpenVault).toHaveBeenCalledTimes(1);
  });

  it('shows Mint SBT button for owned badges that are not yet minted', () => {
    render(<Badges ownedIds={[1]} onOpenVault={vi.fn()} />);
    expect(screen.getByText('Mint SBT')).toBeTruthy();
  });

  it('calls mintSBT when Mint SBT button is clicked', async () => {
    const { mintSBT } = await import('../lib/sbt');
    render(<Badges ownedIds={[1]} onOpenVault={vi.fn()} />);

    fireEvent.click(screen.getByText('Mint SBT'));

    await waitFor(() => {
      expect(mintSBT).toHaveBeenCalledTimes(1);
    });
  });
});
