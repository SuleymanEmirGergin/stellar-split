/**
 * useGroupRealtime tests
 *
 * Verifies that the hook correctly:
 *   – subscribes to the right SSE channel (passed to useGroupEvents)
 *   – invalidates the right query keys on each event type
 *   – shows the right toasts
 *   – sets realtimeConnected = true on first event
 *   – falls back to Soroban polling when JWT is absent
 *   – skips polling for demo mode
 */
import { renderHook, act } from '@testing-library/react';
import { useGroupRealtime } from './useGroupRealtime';

// ── Mock useGroupEvents so we can trigger synthetic events ──────────────────
type EventHandler = (event: { type: string; payload?: Record<string, unknown> }) => void;
const capturedHandlers: EventHandler[] = [];

vi.mock('./useGroupEvents', () => ({
  useGroupEvents: (_id: string | null, handler: EventHandler) => {
    if (_id !== null) capturedHandlers.push(handler);
  },
}));

// ── Mock react-query queryClient ─────────────────────────────────────────────
const invalidate = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}));

// ── Mock Soroban polling ─────────────────────────────────────────────────────
const subscribeCleanup = vi.fn().mockReturnValue(vi.fn());
vi.mock('../lib/events', () => ({
  subscribeGroupEvents: (..._args: unknown[]) => subscribeCleanup(),
}));

// ── Mock stellar lib ─────────────────────────────────────────────────────────
vi.mock('../lib/stellar', () => ({
  server: {},
  CONTRACT_ID: 'TEST_CONTRACT',
}));

// ── Mock query key factories ─────────────────────────────────────────────────
vi.mock('./useGroupQuery', () => ({
  groupKeys: {
    detail: (id: number) => ['group', id],
  },
}));
vi.mock('./useBackendGroups', () => ({
  backendGroupKeys: {
    expenses: (id: string) => ['be-expenses', id],
    balances: (id: string) => ['be-balances', id],
    settlementPlan: (id: string) => ['be-settlement-plan', id],
    audit: (id: string) => ['be-audit', id],
    analytics: (id: string) => ['be-analytics', id],
    recurring: (id: string) => ['be-recurring', id],
    settlements: (id: string) => ['be-settlements', id],
    detail: (id: string) => ['be-detail', id],
  },
}));

// ─────────────────────────────────────────────────────────────────────────────

const baseProps = () => ({
  groupIdStr: 'g1',
  numericGroupId: 1,
  isDemo: false,
  hasJwt: true,
  addToast: vi.fn(),
  t: (key: string) => key,
});

function fire(event: { type: string; payload?: Record<string, unknown> }) {
  capturedHandlers.forEach((h) => h(event));
}

beforeEach(() => {
  capturedHandlers.length = 0;
  invalidate.mockClear();
  subscribeCleanup.mockClear();
});

// ── realtimeConnected ─────────────────────────────────────────────────────────
describe('realtimeConnected', () => {
  it('starts as false', () => {
    const { result } = renderHook(() => useGroupRealtime(baseProps()));
    expect(result.current.realtimeConnected).toBe(false);
  });

  it('becomes true after any event fires', () => {
    const { result } = renderHook(() => useGroupRealtime(baseProps()));
    act(() => { fire({ type: 'heartbeat' }); });
    expect(result.current.realtimeConnected).toBe(true);
  });
});

// ── expense:added ─────────────────────────────────────────────────────────────
describe('expense:added event', () => {
  it('invalidates 6 query keys', () => {
    renderHook(() => useGroupRealtime(baseProps()));
    act(() => { fire({ type: 'expense:added', payload: { actorName: 'Alice', amount: 5, currency: 'XLM', label: 'Dinner' } }); });
    expect(invalidate).toHaveBeenCalledTimes(6);
  });

  it('shows addToast with actor name', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'expense:added', payload: { actorName: 'Alice', label: 'Lunch', amount: 10, currency: 'XLM' } }); });
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Alice'), 'info');
  });

  it('falls back to t("realtime.a_member") when actor is absent', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'expense:added' }); });
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('realtime.a_member'), 'info');
  });
});

// ── expense:cancelled ─────────────────────────────────────────────────────────
describe('expense:cancelled event', () => {
  it('shows error toast with translated key', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'expense:cancelled', payload: { actor: 'GBXXX' } }); });
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('realtime.expense_cancelled'), 'info');
  });
});

// ── recurring:triggered ───────────────────────────────────────────────────────
describe('recurring:triggered event', () => {
  it('invalidates recurring key additionally', () => {
    renderHook(() => useGroupRealtime(baseProps()));
    act(() => { fire({ type: 'recurring:triggered' }); });
    const keys = invalidate.mock.calls.map(([arg]) => arg.queryKey);
    expect(keys.some((k: unknown[]) => (k as string[])[0] === 'be-recurring')).toBe(true);
  });
});

// ── settlement:confirmed ──────────────────────────────────────────────────────
describe('settlement:confirmed event', () => {
  it('shows success toast', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'settlement:confirmed', payload: { amount: 2.5, currency: 'USDC' } }); });
    expect(addToast).toHaveBeenCalledWith(expect.any(String), 'success');
  });
});

// ── settlement:failed ─────────────────────────────────────────────────────────
describe('settlement:failed event', () => {
  it('shows error toast', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'settlement:failed', payload: { label: 'timeout' } }); });
    expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ── member:joined / member:left ───────────────────────────────────────────────
describe('member events', () => {
  it('member:joined shows success toast', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'member:joined', payload: { actorName: 'Bob' } }); });
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Bob'), 'success');
  });

  it('member:left shows info toast', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'member:left', payload: {} }); });
    expect(addToast).toHaveBeenCalledWith(expect.any(String), 'info');
  });
});

// ── heartbeat ─────────────────────────────────────────────────────────────────
describe('heartbeat event', () => {
  it('does not call invalidate or addToast', () => {
    const addToast = vi.fn();
    renderHook(() => useGroupRealtime({ ...baseProps(), addToast }));
    act(() => { fire({ type: 'heartbeat' }); });
    // realtimeConnected set to true but nothing else should fire
    expect(invalidate).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });
});

// ── Soroban polling (no-JWT) ──────────────────────────────────────────────────
describe('Soroban event poller', () => {
  it('does NOT start the poller when hasJwt=true', () => {
    renderHook(() => useGroupRealtime({ ...baseProps(), hasJwt: true }));
    expect(subscribeCleanup).not.toHaveBeenCalled();
  });

  it('starts the poller when hasJwt=false and isDemo=false', () => {
    renderHook(() => useGroupRealtime({ ...baseProps(), hasJwt: false }));
    expect(subscribeCleanup).toHaveBeenCalledTimes(1);
  });

  it('does NOT start the poller in demo mode', () => {
    renderHook(() => useGroupRealtime({ ...baseProps(), hasJwt: false, isDemo: true }));
    expect(subscribeCleanup).not.toHaveBeenCalled();
  });

  it('skips SSE subscription when isDemo=true (groupIdStr → null)', () => {
    renderHook(() => useGroupRealtime({ ...baseProps(), isDemo: true }));
    // capturedHandlers empty because useGroupEvents received null
    expect(capturedHandlers).toHaveLength(0);
  });
});
