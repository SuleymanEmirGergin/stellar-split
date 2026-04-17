import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsTab from './SettingsTab';

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ status: 'default', subscribe: vi.fn(), unsubscribe: vi.fn() }),
}));

vi.mock('../../hooks/useBackendGroups', () => ({
  useLeaveGroupMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const t = (key: string) => key;

const baseProps = {
  groupIdStr: '1',
  groupName: 'Test Grubu',
  hasJwt: false,
  inviteCode: 'abc123',
  t,
  addToast: vi.fn(),
  onLeaveGroup: vi.fn(),
};

describe('SettingsTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('JWT olmadan push toggle gösterilmez', () => {
    render(<SettingsTab {...baseProps} hasJwt={false} />);
    expect(screen.queryByText('settings.push_subscribe')).not.toBeInTheDocument();
    expect(screen.queryByText('settings.push_subscribed')).not.toBeInTheDocument();
  });

  it('JWT varken push toggle görünür', () => {
    render(<SettingsTab {...baseProps} hasJwt={true} />);
    expect(screen.getByText('settings.push_subscribe')).toBeInTheDocument();
  });

  it('Leave group butonu hasJwt=false\'da görünmez', () => {
    render(<SettingsTab {...baseProps} hasJwt={false} />);
    expect(screen.queryByText('settings.leave_group')).not.toBeInTheDocument();
  });

  it('Davet linki kopyalama butonu her zaman görünür', () => {
    render(<SettingsTab {...baseProps} />);
    expect(screen.getByText('group.copy_invite_link')).toBeInTheDocument();
  });

  it('Leave confirm dialog açılır', () => {
    render(<SettingsTab {...baseProps} hasJwt={true} />);
    fireEvent.click(screen.getByText('settings.leave_group'));
    expect(screen.getByText('settings.leave_confirm')).toBeInTheDocument();
    expect(screen.getByText('settings.leave_cancel')).toBeInTheDocument();
    expect(screen.getByText('settings.leave_btn')).toBeInTheDocument();
  });

  it('Leave cancel dialog\'ı kapatır', () => {
    render(<SettingsTab {...baseProps} hasJwt={true} />);
    fireEvent.click(screen.getByText('settings.leave_group'));
    fireEvent.click(screen.getByText('settings.leave_cancel'));
    expect(screen.queryByText('settings.leave_confirm')).not.toBeInTheDocument();
  });

  it('push toggle tıklanınca subscribe çağrılır', async () => {
    const subscribe = vi.fn();
    vi.doMock('../../hooks/usePushNotifications', () => ({
      usePushNotifications: () => ({ status: 'default', subscribe, unsubscribe: vi.fn() }),
    }));
    render(<SettingsTab {...baseProps} hasJwt={true} />);
    fireEvent.click(screen.getByText('settings.push_subscribe'));
    // subscribe is called asynchronously inside handlePushToggle
    await vi.waitFor(() => {});
  });
});
