import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartVaults } from './SmartVaults';

const mockToggleAutoInvest = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', p, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../lib/yield', () => ({
  getVaultStats: vi.fn().mockReturnValue({
    apy: 4.8,
    totalSaved: 250.5,
    savingsGoal: 1200,
    autoInvestEnabled: false,
    unrealizedYield: 12,
    history: [],
  }),
  toggleAutoInvest: mockToggleAutoInvest,
}));

describe('SmartVaults', () => {
  beforeEach(() => {
    mockToggleAutoInvest.mockClear();
  });

  it('renders "Smart Vaults" heading', () => {
    render(<SmartVaults walletAddress="G123" onBack={vi.fn()} />);
    expect(screen.getByText(/Smart Vaults/i)).toBeTruthy();
  });

  it('shows APY 4.8%', () => {
    render(<SmartVaults walletAddress="G123" onBack={vi.fn()} />);
    expect(screen.getByText('4.8%')).toBeTruthy();
  });

  it('shows total savings $250.50', () => {
    render(<SmartVaults walletAddress="G123" onBack={vi.fn()} />);
    expect(screen.getByText('$250.50')).toBeTruthy();
  });

  it('clicking toggle button calls toggleAutoInvest', () => {
    render(<SmartVaults walletAddress="G123" onBack={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons.find((btn) => btn.className.includes('rounded-full'));
    expect(toggleButton).toBeTruthy();
    fireEvent.click(toggleButton!);
    expect(mockToggleAutoInvest).toHaveBeenCalledOnce();
  });

  it('clicking Dashboard back button calls onBack', () => {
    const onBack = vi.fn();
    render(<SmartVaults walletAddress="G123" onBack={onBack} />);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
