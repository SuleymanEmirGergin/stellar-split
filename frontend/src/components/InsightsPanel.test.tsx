import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightsPanel from './InsightsPanel';
import type { Group } from '../lib/contract';

// recharts responsive container jsdom'da sıfır boyut verir — mock'la
vi.mock('recharts', () => {
  const Placeholder = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-mock">{children}</div>
  );
  return {
    ResponsiveContainer: Placeholder,
    PieChart: Placeholder,
    Pie: Placeholder,
    Cell: Placeholder,
    Tooltip: Placeholder,
    BarChart: Placeholder,
    Bar: Placeholder,
    XAxis: Placeholder,
    YAxis: Placeholder,
    CartesianGrid: Placeholder,
    AreaChart: Placeholder,
    Area: Placeholder,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./DonutChart', () => ({ default: () => <div data-testid="donut-chart" /> }));
vi.mock('./Avatar', () => ({ default: ({ address }: { address: string }) => <span>{address}</span> }));
vi.mock('./ActivityFeed', () => ({ default: () => <div data-testid="activity-feed" /> }));
vi.mock('../lib/export', () => ({ exportToCSV: vi.fn(), exportToPDF: vi.fn() }));
vi.mock('../lib/i18n', () => ({
  i18n: { t: (k: string) => k },
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));
vi.mock('../hooks/useBackendGroups', () => ({ useGroupAnalytics: () => ({ data: undefined }) }));

const MEMBER_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const MEMBER_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

const mockGroup = {
  id: BigInt(1),
  name: 'Test Grubu',
  members: [MEMBER_A, MEMBER_B],
  currency: 'XLM',
} as unknown as Group;

const mockExpenses = [
  { id: 1, payer: MEMBER_A, amount: 50_000_000, description: 'Akşam yemeği', category: 'food', split_among: [MEMBER_A, MEMBER_B] },
  { id: 2, payer: MEMBER_B, amount: 20_000_000, description: 'Taksi', category: 'transport', split_among: [MEMBER_A, MEMBER_B] },
];

describe('InsightsPanel', () => {
  it('harcama yokken sıfır istatistik gösterir', () => {
    render(
      <InsightsPanel
        expenses={[]}
        members={[MEMBER_A]}
        group={mockGroup}
        currentUser={MEMBER_A}
      />,
    );
    // 0 XLM toplam → "0" veya "0.00" bir yerde görünmeli
    expect(document.body.textContent).toMatch(/0/);
  });

  it('toplam harcama miktarını hesaplar', () => {
    render(
      <InsightsPanel
        expenses={mockExpenses}
        members={[MEMBER_A, MEMBER_B]}
        group={mockGroup}
        currentUser={MEMBER_A}
      />,
    );
    // 50_000_000 + 20_000_000 stroops = 7 XLM
    expect(document.body.textContent).toMatch(/7/);
  });

  it('recharts bileşenlerini render eder', () => {
    render(
      <InsightsPanel
        expenses={mockExpenses}
        members={[MEMBER_A, MEMBER_B]}
        group={mockGroup}
        currentUser={MEMBER_A}
      />,
    );
    expect(document.querySelectorAll('[data-testid="recharts-mock"]').length).toBeGreaterThan(0);
  });

  it('createdAt olmadan timeline panel göstermez', () => {
    render(
      <InsightsPanel
        expenses={mockExpenses}
        members={[MEMBER_A]}
        group={mockGroup}
        currentUser={MEMBER_A}
      />,
    );
    // Timeline başlığı render edilmemeli (createdAt olmadan)
    expect(screen.queryByText('group.insights_timeline')).toBeNull();
  });

  it('createdAt varken timeline panel gösterir', () => {
    const expensesWithDate = mockExpenses.map(e => ({
      ...e,
      createdAt: '2025-01-15T10:00:00Z',
    }));
    render(
      <InsightsPanel
        expenses={expensesWithDate as never}
        members={[MEMBER_A, MEMBER_B]}
        group={mockGroup}
        currentUser={MEMBER_A}
      />,
    );
    expect(screen.getByText('group.insights_timeline')).toBeInTheDocument();
  });
});
