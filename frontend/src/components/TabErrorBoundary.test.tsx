import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabErrorBoundary from './TabErrorBoundary';

// Mock i18n with a tiny in-memory dictionary so the {{tab}} placeholder
// substitution path inside TabErrorBoundary is exercised by the test.
const FIXTURES: Record<string, string> = {
  'tab.error_title': "Couldn't load the {{tab}} tab",
  'tab.error_desc': 'This tab is not responding right now.',
  'tab.error_retry': 'Retry',
};
vi.mock('../lib/i18n', () => ({
  i18n: { t: (k: string) => FIXTURES[k] ?? k },
  useI18n: () => ({ t: (k: string) => FIXTURES[k] ?? k, lang: 'en' }),
}));

function Bomb({ shouldThrow, error }: { shouldThrow: boolean; error?: Error }) {
  if (shouldThrow) throw error ?? new Error('audit fetch failed: 404');
  return <div>tab content</div>;
}

beforeEach(() => {
  // The render-throw path emits a React-internal error log we don't care about.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('TabErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <TabErrorBoundary tabKey="audit" tabLabel="Activity">
        <Bomb shouldThrow={false} />
      </TabErrorBoundary>
    );
    expect(screen.getByText('tab content')).toBeTruthy();
  });

  it('shows the localised "tab failed" notice when a child throws', () => {
    render(
      <TabErrorBoundary tabKey="audit" tabLabel="Activity">
        <Bomb shouldThrow />
      </TabErrorBoundary>
    );
    // The {{tab}} placeholder must be replaced with the prop label.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText("Couldn't load the Activity tab")).toBeTruthy();
    expect(screen.getByText('This tab is not responding right now.')).toBeTruthy();
  });

  it('shows a Retry button by default and recovers when clicked', () => {
    let throws = true;
    function Toggle() {
      if (throws) throw new Error('boom');
      return <div>recovered</div>;
    }

    render(
      <TabErrorBoundary tabKey="audit" tabLabel="Activity">
        <Toggle />
      </TabErrorBoundary>
    );
    // First render: error path
    expect(screen.getByText('Retry')).toBeTruthy();

    // Stop throwing, click Retry — children should render normally
    throws = false;
    fireEvent.click(screen.getByText('Retry'));
    expect(screen.getByText('recovered')).toBeTruthy();
  });

  it('hides the Retry button when allowRetry={false}', () => {
    render(
      <TabErrorBoundary tabKey="audit" tabLabel="Activity" allowRetry={false}>
        <Bomb shouldThrow />
      </TabErrorBoundary>
    );
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('logs to console with [TabErrorBoundary] prefix and the tab key', () => {
    const logs: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logs.push(args);
    });

    render(
      <TabErrorBoundary tabKey="audit" tabLabel="Activity">
        <Bomb shouldThrow error={new Error('audit endpoint 404')} />
      </TabErrorBoundary>
    );

    // At least one log line carries our prefix and the tab key.
    const ours = logs.find(
      (line) =>
        typeof line[0] === 'string' && line[0].includes('[TabErrorBoundary] tab="audit"')
    );
    expect(ours).toBeTruthy();
  });

  it('isolates one tab failure from siblings via key remount semantics', () => {
    // Simulate parent swapping `key` from "audit" to "expenses". React
    // unmounts the first instance and creates a new one with a fresh
    // hasError=false state — verified by re-rendering with a different
    // key and a non-throwing child.
    const { rerender } = render(
      <TabErrorBoundary key="audit" tabKey="audit" tabLabel="Activity">
        <Bomb shouldThrow />
      </TabErrorBoundary>
    );
    expect(screen.getByText("Couldn't load the Activity tab")).toBeTruthy();

    rerender(
      <TabErrorBoundary key="expenses" tabKey="expenses" tabLabel="Expenses">
        <Bomb shouldThrow={false} />
      </TabErrorBoundary>
    );
    expect(screen.getByText('tab content')).toBeTruthy();
  });
});
