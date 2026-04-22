import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallPrompt } from './InstallPrompt';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
  i18n: { t: (k: string) => k },
}));

function makeMatchMedia(matches: boolean) {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });
}

function stubUserAgent(ua: string, platform = 'iPhone', touchPoints = 5) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true });
}

const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

beforeEach(() => {
  localStorage.clear();
  stubUserAgent(DESKTOP_UA, 'Linux x86_64', 0);
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: makeMatchMedia(false),
  });
});

describe('InstallPrompt', () => {
  it('does not render when no beforeinstallprompt event has fired', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.querySelector('[data-testid="install-prompt"]')).toBeNull();
  });

  it('shows prompt after beforeinstallprompt fires', () => {
    render(<InstallPrompt />);

    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    });
    act(() => { window.dispatchEvent(promptEvent); });

    expect(screen.getByTestId('install-prompt')).toBeTruthy();
    expect(screen.getByText('install.prompt')).toBeTruthy();
  });

  it('hides prompt when dismiss is clicked and persists to localStorage', () => {
    render(<InstallPrompt />);

    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    });
    act(() => { window.dispatchEvent(promptEvent); });

    const cancelBtn = screen.getByText('common.cancel');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('install-prompt')).toBeNull();
    expect(localStorage.getItem('stellarsplit_install_prompt_dismissed')).toBe('1');
  });

  it('does not render when already dismissed via localStorage', () => {
    localStorage.setItem('stellarsplit_install_prompt_dismissed', '1');
    render(<InstallPrompt />);

    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    });
    act(() => { window.dispatchEvent(promptEvent); });

    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('shows prompt on iOS Safari even without beforeinstallprompt event', () => {
    stubUserAgent(IOS_SAFARI_UA, 'iPhone', 5);
    render(<InstallPrompt />);
    // iOS never fires beforeinstallprompt — banner should still appear.
    expect(screen.getByTestId('install-prompt')).toBeTruthy();
  });

  it('opens the iOS guide modal when Install is tapped on iOS', () => {
    stubUserAgent(IOS_SAFARI_UA, 'iPhone', 5);
    render(<InstallPrompt />);

    // Banner present, guide modal not yet
    expect(screen.queryByTestId('install-prompt-ios-guide')).toBeNull();

    fireEvent.click(screen.getByText('install.install'));

    expect(screen.getByTestId('install-prompt-ios-guide')).toBeTruthy();
    // Step content rendered
    expect(screen.getByText('install.ios_step1')).toBeTruthy();
    expect(screen.getByText('install.ios_step2')).toBeTruthy();
    expect(screen.getByText('install.ios_step3')).toBeTruthy();
  });

  it('does NOT show iOS guide modal on desktop even when Install is tapped', () => {
    // Desktop UA (default from beforeEach), plus fire beforeinstallprompt so
    // the banner shows. Tapping Install should trigger the deferred prompt,
    // not the iOS guide modal.
    render(<InstallPrompt />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    });
    act(() => { window.dispatchEvent(promptEvent); });

    fireEvent.click(screen.getByText('install.install'));

    expect(screen.queryByTestId('install-prompt-ios-guide')).toBeNull();
    expect(prompt).toHaveBeenCalledOnce();
  });
});
