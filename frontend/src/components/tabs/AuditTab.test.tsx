import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AuditLogEntry } from '../../lib/api';

vi.mock('../ui/SkeletonShimmer', () => ({
  SkeletonShimmer: () => <div data-testid="skeleton" />,
}));

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

import AuditTab from './AuditTab';

const makeEntry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: 'entry-1',
  actorType: 'user',
  actorId: 'user-uuid',
  actorWallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ',
  groupId: 'group-1',
  entityType: 'EXPENSE',
  entityId: 'exp-1',
  action: 'ADD',
  metadata: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('AuditTab', () => {
  it('hasJwt=false iken wallet connect mesajı görünür', () => {
    render(<AuditTab entries={[]} isLoading={false} hasJwt={false} />);
    expect(screen.getByText('audit.connect_wallet_hint')).toBeInTheDocument();
  });

  it('isLoading=true iken skeleton element\'ler görünür', () => {
    render(<AuditTab entries={[]} isLoading={true} hasJwt={true} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('entries=[] iken "No activity yet" empty state görünür', () => {
    render(<AuditTab entries={[]} isLoading={false} hasJwt={true} />);
    expect(screen.getByText('audit.no_activity')).toBeInTheDocument();
  });

  it('entry listesini humanize ederek render eder', () => {
    const entry = makeEntry({ action: 'ADD', entityType: 'EXPENSE' });
    render(<AuditTab entries={[entry]} isLoading={false} hasJwt={true} />);
    expect(screen.getByText('audit.action_add audit.entity_expense')).toBeInTheDocument();
  });

  it('actorWallet maskeli olarak görünür', () => {
    const entry = makeEntry({ actorWallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ' });
    render(<AuditTab entries={[entry]} isLoading={false} hasJwt={true} />);
    // maskAddress defaults: 4 chars start, 4 chars end → 'GABC...WXYZ'
    expect(screen.getByText('GABC...WXYZ')).toBeInTheDocument();
  });
});
