import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeGroupEvents } from './events';

vi.mock('@stellar/stellar-sdk', () => ({
  scValToNative: vi.fn((val: any) => val),
  xdr: { ScVal: class {} },
}));

function makeMockServer(overrides: Partial<{ ledger: number; events: any[] }> = {}) {
  const ledger = overrides.ledger ?? 100;
  const events = overrides.events ?? [];
  return {
    getLatestLedger: vi.fn().mockResolvedValue({ sequence: ledger }),
    getEvents: vi.fn().mockResolvedValue({ events }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('subscribeGroupEvents', () => {
  it('returns a cleanup function', () => {
    const server = makeMockServer();
    const cleanup = subscribeGroupEvents(server as any, 'CONTRACT1', 1, vi.fn());
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('calls onUpdate when a relevant event for the correct groupId is found', async () => {
    const { scValToNative } = await import('@stellar/stellar-sdk');
    let callCount = 0;
    (scValToNative as any).mockImplementation((val: any) => {
      callCount++;
      return callCount % 2 === 1 ? 'expense_added' : 1;
    });

    const onUpdate = vi.fn();
    const server = makeMockServer({
      ledger: 100,
      events: [{ topic: ['expense_added', 1] }],
    });

    const cleanup = subscribeGroupEvents(server as any, 'CONTRACT1', 1, onUpdate);
    await vi.advanceTimersByTimeAsync(8500);
    cleanup();

    expect(onUpdate).toHaveBeenCalled();
  });

  it('does NOT call onUpdate for a different groupId', async () => {
    const { scValToNative } = await import('@stellar/stellar-sdk');
    let callCount = 0;
    (scValToNative as any).mockImplementation((val: any) => {
      callCount++;
      return callCount % 2 === 1 ? 'expense_added' : 99;
    });

    const onUpdate = vi.fn();
    const server = makeMockServer({
      ledger: 100,
      events: [{ topic: ['expense_added', 99] }],
    });

    const cleanup = subscribeGroupEvents(server as any, 'CONTRACT1', 1, onUpdate);
    await vi.advanceTimersByTimeAsync(8500);
    cleanup();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('does NOT call onUpdate for an irrelevant event name', async () => {
    const { scValToNative } = await import('@stellar/stellar-sdk');
    let callCount = 0;
    (scValToNative as any).mockImplementation((val: any) => {
      callCount++;
      return callCount % 2 === 1 ? 'some_other_event' : 1;
    });

    const onUpdate = vi.fn();
    const server = makeMockServer({
      events: [{ topic: ['some_other_event', 1] }],
    });

    const cleanup = subscribeGroupEvents(server as any, 'CONTRACT1', 1, onUpdate);
    await vi.advanceTimersByTimeAsync(8500);
    cleanup();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('stops polling after cleanup is called', async () => {
    const onUpdate = vi.fn();
    const server = makeMockServer({ events: [] });
    const cleanup = subscribeGroupEvents(server as any, 'CONTRACT1', 1, onUpdate);
    cleanup();
    await vi.advanceTimersByTimeAsync(16000);
    // getLatestLedger should have been called at most once (the initial poll before cleanup)
    expect(server.getLatestLedger.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
