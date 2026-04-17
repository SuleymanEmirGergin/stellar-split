import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtGraph } from './DebtGraph';

describe('DebtGraph', () => {
  it('renders SVG with correct dimensions', () => {
    const { container } = render(
      <DebtGraph members={['ALICE', 'BOB']} debts={[]} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('300');
    expect(svg?.getAttribute('height')).toBe('300');
  });

  it('renders member circles with abbreviated labels', () => {
    render(
      <DebtGraph members={['ALICE', 'BOB']} debts={[]} />
    );
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('BO')).toBeTruthy();
  });

  it('renders debt lines and labels for provided debts', () => {
    // 10 XLM = 100_000_000 stroops
    render(
      <DebtGraph
        members={['ALICE', 'BOB']}
        debts={[{ from: 'ALICE', to: 'BOB', amount: 100_000_000 }]}
      />
    );
    expect(screen.getByText('10.0 XLM')).toBeTruthy();
  });

  it('renders "Interaktif Borç Ağı" footer label', () => {
    render(<DebtGraph members={[]} debts={[]} />);
    expect(screen.getByText('Interaktif Borç Ağı')).toBeTruthy();
  });

  it('skips debt lines for unknown member addresses', () => {
    const { container } = render(
      <DebtGraph
        members={['ALICE']}
        debts={[{ from: 'UNKNOWN', to: 'ALSO_UNKNOWN', amount: 10_000_000 }]}
      />
    );
    // No line elements rendered for unknown members
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(0);
  });
});
