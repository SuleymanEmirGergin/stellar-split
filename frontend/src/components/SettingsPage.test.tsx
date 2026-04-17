import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// ── Dış bağımlılık mock'ları ──────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (sel: (s: { walletAddress: string; backendUser: null }) => unknown) =>
    sel({ walletAddress: 'GTEST12345678', backendUser: null }),
}));

vi.mock('../lib/format', () => ({
  maskAddress: (a: string) => a.slice(0, 4) + '...' + a.slice(-4),
}));

const mockDownloadGdprExport = vi.fn().mockResolvedValue(undefined);
const mockDeleteAccount = vi.fn().mockResolvedValue(undefined);
vi.mock('../lib/api', () => ({
  downloadGdprExport: () => mockDownloadGdprExport(),
  usersApi: { deleteAccount: () => mockDeleteAccount() },
  getAccessToken: () => 'mock-token',
}));

const mockAddToast = vi.fn();
vi.mock('./Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ lang: 'tr', setLang: vi.fn(), t: (k: string) => k }),
  i18n: { t: (k: string) => k },
}));

vi.mock('../lib/motion', () => ({
  useMotionEnabled: () => true,
}));

const mockSubscribe = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({
    isSubscribed: false,
    isSupported: true,
    subscribe: mockSubscribe,
  }),
}));

// Lucide ikonlarını basit mock'a al
vi.mock('lucide-react', () => {
  const Icon = ({ 'data-testid': tid }: { 'data-testid'?: string }) => (
    <svg data-testid={tid} />
  );
  const icons = ['User', 'Palette', 'Shield', 'Bell', 'Download', 'Trash2', 'Sun', 'Moon',
    'CheckCircle', 'AlertTriangle', 'Loader2', 'Cloud', 'Link'];
  return Object.fromEntries(icons.map(name => [name, Icon]));
});

// ── Test yardımcıları ────────────────────────────────────────────────────────

function renderSettings() {
  return render(
    <SettingsPage dark={false} toggleTheme={vi.fn()} onDisconnect={vi.fn()} />,
  );
}

// ── Testler ──────────────────────────────────────────────────────────────────

describe('SettingsPage — genel', () => {
  beforeEach(() => {
    mockAddToast.mockReset();
    localStorage.clear();
  });

  it('cüzdan adresi maskeli gösterilir', () => {
    renderSettings();
    expect(screen.getByText('GTES...5678')).toBeInTheDocument();
  });

  it('Settings başlığı görünür', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

describe('SettingsPage — Bildirimler bölümü', () => {
  beforeEach(() => localStorage.clear());

  it('Bildirimler section başlığı görünür', () => {
    renderSettings();
    expect(screen.getByText('settings.notifications')).toBeInTheDocument();
  });

  it('"Push subscribe" butonu görünür', () => {
    renderSettings();
    expect(screen.getByText('settings.push_subscribe')).toBeInTheDocument();
  });

  it('subscribe butonuna tıklanınca subscribe() çağrılır', async () => {
    renderSettings();
    fireEvent.click(screen.getByText('settings.push_subscribe'));
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledOnce());
  });
});

describe('SettingsPage — Webhook bölümü', () => {
  beforeEach(() => localStorage.clear());

  it('Webhook section başlığı görünür', () => {
    renderSettings();
    expect(screen.getByText('settings.webhooks_title')).toBeInTheDocument();
  });

  it('Discord URL inputu kaydet düğmesi localStorage yazıyor', () => {
    renderSettings();
    const inputs = screen.getAllByPlaceholderText(/discord|slack/i);
    fireEvent.change(inputs[0], { target: { value: 'https://discord.com/api/webhooks/test' } });
    fireEvent.click(screen.getAllByText('common.save')[0]);
    expect(localStorage.getItem('webhook_global_discord')).toBe('https://discord.com/api/webhooks/test');
  });
});
