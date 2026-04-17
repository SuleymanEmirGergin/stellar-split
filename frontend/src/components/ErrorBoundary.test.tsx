import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

vi.mock('../lib/i18n', () => ({
  i18n: { t: (k: string) => k },
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

// Component that throws on demand
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test error');
  return <div>safe content</div>;
}

// Suppress console.error for expected throws
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('hello world')).toBeTruthy();
  });

  it('shows default error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('common.error_fallback_title')).toBeTruthy();
    expect(screen.getByText('common.error_fallback_desc')).toBeTruthy();
  });

  it('renders custom fallback when provided and child throws', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom fallback')).toBeTruthy();
    expect(screen.queryByText('common.error_fallback_title')).toBeNull();
  });

  it('shows reload button that calls window.location.reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    const btn = screen.getByText('common.reload_page');
    fireEvent.click(btn);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
