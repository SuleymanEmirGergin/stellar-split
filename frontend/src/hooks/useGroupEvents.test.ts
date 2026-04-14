import { renderHook } from '@testing-library/react';
import { useGroupEvents, type GroupEvent } from './useGroupEvents';
import { setAccessToken } from '../lib/api';

// Mock EventSource — jsdom does not implement it
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  withCredentials: boolean;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string, opts?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = opts?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  dispatchMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  dispatchRaw(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  setAccessToken('test_token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('useGroupEvents', () => {
  it('does nothing when groupId is null', () => {
    renderHook(() => useGroupEvents(null, vi.fn()));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('does nothing when no access token is set', () => {
    setAccessToken(null);
    renderHook(() => useGroupEvents('g1', vi.fn()));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('creates an EventSource with correct URL', () => {
    renderHook(() => useGroupEvents('g1', vi.fn()));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]!.url).toContain('/groups/g1/events');
    expect(MockEventSource.instances[0]!.url).toContain('token=test_token');
  });

  it('creates EventSource with withCredentials=true', () => {
    renderHook(() => useGroupEvents('g1', vi.fn()));
    expect(MockEventSource.instances[0]!.withCredentials).toBe(true);
  });

  it('calls onEvent when a message is received', () => {
    const onEvent = vi.fn();
    renderHook(() => useGroupEvents('g1', onEvent));
    const es = MockEventSource.instances[0]!;

    const event: GroupEvent = { type: 'expense:added', groupId: 'g1', ts: Date.now() };
    es.dispatchMessage(event);

    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('does not call onEvent for heartbeat events', () => {
    const onEvent = vi.fn();
    renderHook(() => useGroupEvents('g1', onEvent));
    const es = MockEventSource.instances[0]!;

    es.dispatchMessage({ type: 'heartbeat', groupId: 'g1', ts: Date.now() });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('ignores malformed event data gracefully', () => {
    const onEvent = vi.fn();
    renderHook(() => useGroupEvents('g1', onEvent));
    const es = MockEventSource.instances[0]!;

    es.dispatchRaw('not-valid-json');
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useGroupEvents('g1', vi.fn()));
    const es = MockEventSource.instances[0]!;
    expect(es.closed).toBe(false);
    unmount();
    expect(es.closed).toBe(true);
  });

  it('uses the latest onEvent reference without re-creating EventSource', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    let callback = handler1;

    const { rerender } = renderHook(() => useGroupEvents('g1', callback));
    callback = handler2;
    rerender();

    // Still only one EventSource
    expect(MockEventSource.instances).toHaveLength(1);

    // New handler is used
    MockEventSource.instances[0]!.dispatchMessage({ type: 'expense:added', groupId: 'g1', ts: 0 });
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
