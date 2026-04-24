import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

vi.mock('../lib/i18n', () => ({
  i18n: { t: (k: string) => k },
  useI18n: () => ({ t: (k: string) => k, lang: 'en' }),
}));

// Component that throws on demand.
function Bomb({ shouldThrow, error }: { shouldThrow: boolean; error?: Error }) {
  if (shouldThrow) throw error ?? new Error('test error');
  return <div>safe content</div>;
}

// Stable reload mock — reinstalled per test to keep calls isolated.
let reloadMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Silence React's expected console.error during throwing renders.
  vi.spyOn(console, 'error').mockImplementation(() => {});

  reloadMock = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { reload: reloadMock },
    writable: true,
    configurable: true,
  });

  // Flush the debounce key before each test so auto-reload fires fresh.
  try {
    sessionStorage.removeItem('stellarsplit_chunk_reload_ts');
  } catch { /* happy */ }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ErrorBoundary — baseline', () => {
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
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    const btn = screen.getByText('common.reload_page');
    fireEvent.click(btn);
    // Manual click + no auto-reload for generic errors.
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT auto-reload for a generic (non-chunk) error', async () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    // Give queueMicrotask a chance to run.
    await Promise.resolve();
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe('ErrorBoundary — stale lazy chunk detection', () => {
  /** Shapes of errors the browser emits when a previously-built chunk is 404. */
  const staleChunkErrors: Array<{ label: string; error: Error }> = [
    {
      label: 'Vite / Chromium: Failed to fetch dynamically imported module',
      error: new Error(
        'Failed to fetch dynamically imported module: https://app/assets/GroupDetail-D1SacDOj.js'
      ),
    },
    {
      label: 'Safari: Importing a module script failed',
      error: new Error('Importing a module script failed.'),
    },
    {
      label: 'Webpack-style: Loading chunk 123 failed',
      error: new Error('Loading chunk 123 failed. (missing: …)'),
    },
    {
      label: 'Webpack-style: Loading CSS chunk 7 failed',
      error: new Error('Loading CSS chunk 7 failed.'),
    },
    {
      label: 'ChunkLoadError by name',
      error: Object.assign(new Error('boom'), { name: 'ChunkLoadError' }),
    },
  ];

  for (const { label, error } of staleChunkErrors) {
    it(`renders the updating UI and schedules a reload: ${label}`, async () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow error={error} />
        </ErrorBoundary>
      );
      // Soft "refreshing…" UI is visible immediately.
      expect(screen.getByText('common.updating_title')).toBeTruthy();
      expect(screen.getByText('common.updating_desc')).toBeTruthy();
      expect(screen.queryByText('common.error_fallback_title')).toBeNull();

      // queueMicrotask flushes before this tick yields.
      await Promise.resolve();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  }

  it('does NOT auto-reload twice within the 30s debounce window', async () => {
    // Simulate: the first ErrorBoundary caught a chunk error earlier this
    // session and reloaded. When a second one fires shortly after, we must
    // NOT reload again — otherwise we trap users in a loop if the chunk
    // really is missing permanently.
    sessionStorage.setItem('stellarsplit_chunk_reload_ts', String(Date.now()));

    render(
      <ErrorBoundary>
        <Bomb
          shouldThrow
          error={new Error('Failed to fetch dynamically imported module: /assets/Foo.js')}
        />
      </ErrorBoundary>
    );
    await Promise.resolve();
    expect(reloadMock).not.toHaveBeenCalled();

    // But the soft UI is still shown so the user has a manual "Reload page"
    // button as a last resort.
    expect(screen.getByText('common.updating_title')).toBeTruthy();
  });

  it('records the reload timestamp so the debounce fires next time', async () => {
    render(
      <ErrorBoundary>
        <Bomb
          shouldThrow
          error={new Error('Failed to fetch dynamically imported module: /assets/Bar.js')}
        />
      </ErrorBoundary>
    );
    await Promise.resolve();
    const stamped = sessionStorage.getItem('stellarsplit_chunk_reload_ts');
    expect(stamped).toBeTruthy();
    expect(Number(stamped)).toBeGreaterThan(0);
  });

  it('auto-reloads again after the 30s debounce window elapses', async () => {
    // Stamp an "old" reload more than 30s in the past.
    const old = Date.now() - 31_000;
    sessionStorage.setItem('stellarsplit_chunk_reload_ts', String(old));

    render(
      <ErrorBoundary>
        <Bomb
          shouldThrow
          error={new Error('Failed to fetch dynamically imported module: /assets/Baz.js')}
        />
      </ErrorBoundary>
    );
    await Promise.resolve();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
