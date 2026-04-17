import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../lib/contract', () => ({
  createGroup: vi.fn(),
  isGroupSettled: vi.fn().mockResolvedValue(false),
  estimateCreateGroupFee: vi.fn().mockResolvedValue(null),
}));

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
vi.mock('../lib/xlmPrice', () => ({ useXlmUsd: () => null }));
vi.mock('../hooks/useBackendGroups', () => ({
  useBackendGroups: () => ({ data: null, isLoading: false }),
}));

vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: vi.fn(() => []),
}));

vi.mock('../lib/api', () => ({
  getAccessToken: () => null,
  groupsApi: { fetchGroups: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../lib/contacts', () => ({
  addressBook: { getAll: () => ({}) },
}));

vi.mock('./NetworkStats', () => ({ default: () => null }));
vi.mock('./ImpactPanel', () => ({ default: () => null }));
vi.mock('./GlobalImpact', () => ({ default: () => null }));
vi.mock('./UserAnalytics', () => ({ default: () => null }));
vi.mock('./OnRampGuide', () => ({ default: () => null }));
vi.mock('./Scanner', () => ({ default: () => null }));
vi.mock('./OnboardingTour', () => ({ default: () => null }));
vi.mock('./NewUserWizard', () => ({ default: () => null }));
vi.mock('./EmptyState', () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));
vi.mock('./Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock('./ui/WalletCharts', () => ({ WalletCharts: () => null }));
vi.mock('./ui/SkeletonShimmer', () => ({ SkeletonShimmer: () => <div data-testid="skeleton" /> }));

// react-router-dom Link mock
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import Dashboard from './Dashboard';

const WALLET = 'GCTEST1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function renderDashboard(props = {}) {
  return render(
    <Dashboard
      walletAddress={WALLET}
      onSelectGroup={vi.fn()}
      isDemo={false}
      {...props}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  // Set wizard done so it doesn't interfere
  localStorage.setItem('wizard_v1_done', '1');
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  it('renders without crashing', () => {
    renderDashboard();
    // The component should mount
    expect(document.body).toBeTruthy();
  });

  it('shows search input', () => {
    renderDashboard();
    const searchInput = screen.getByPlaceholderText('dash.search');
    expect(searchInput).toBeTruthy();
  });

  it('shows Yeni Grup / create button', () => {
    renderDashboard();
    // nav.create key is used for the create button
    const createBtn = screen.getByText('nav.create');
    expect(createBtn).toBeTruthy();
  });

  it('shows empty state when no groups', () => {
    renderDashboard();
    // EmptyState should be rendered (no groups in localStorage)
    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('search input is functional', () => {
    renderDashboard();
    const searchInput = screen.getByPlaceholderText('dash.search') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'tatil' } });
    expect(searchInput.value).toBe('tatil');
  });
});
