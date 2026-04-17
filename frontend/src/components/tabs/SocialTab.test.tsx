import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SocialTab from './SocialTab';

vi.mock('../../lib/notifications', () => ({
  generateTelegramShareUrl: (id: number, name: string) => `https://t.me/share?text=${name}+${id}`,
}));

const t = (key: string) => key;

const baseProps = {
  groupId: 1,
  groupName: 'Test Grubu',
  webhookUrl: '',
  setWebhookUrl: vi.fn(),
  webhookNotifyPref: 'all' as const,
  setWebhookNotifyPref: vi.fn(),
  webhookNotifySettlement: false,
  setWebhookNotifySettlement: vi.fn(),
  t,
};

describe('SocialTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('webhook input görünür ve setWebhookUrl çağrılır', () => {
    render(<SocialTab {...baseProps} />);
    const input = screen.getByPlaceholderText('group.social_webhook_placeholder');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'https://hooks.slack.com/test' } });
    expect(baseProps.setWebhookUrl).toHaveBeenCalledWith('https://hooks.slack.com/test');
  });

  it('bildirim tercihi radio\'ları görünür', () => {
    render(<SocialTab {...baseProps} />);
    const radios = document.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(3); // all, mine, off
  });

  it('pref değiştirince setWebhookNotifyPref çağrılır', () => {
    render(<SocialTab {...baseProps} />);
    const radios = document.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]); // 'mine'
    expect(baseProps.setWebhookNotifyPref).toHaveBeenCalledWith('mine');
  });

  it('Telegram paylaş butonu görünür', () => {
    render(<SocialTab {...baseProps} />);
    expect(screen.getByText('group.social_telegram_share')).toBeInTheDocument();
  });

  it('webhook hint metni gösterir', () => {
    render(<SocialTab {...baseProps} />);
    expect(screen.getByText('group.social_webhook_hint')).toBeInTheDocument();
  });
});
