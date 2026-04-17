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

beforeEach(() => {
  localStorage.clear();
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
});
