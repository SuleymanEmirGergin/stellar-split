import { renderHook, act } from '@testing-library/react';
import { useSettleHandler } from './useSettleHandler';

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
vi.mock('../lib/contract', () => ({
  estimateSettleGroupFee: vi.fn().mockResolvedValue({ stroops: 100, xlm: '0.00001' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const makeGroup = () => ({
  id: 1,
  name: 'Test Group',
  members: ['GCTEST1', 'GCTEST2'],
  expenses: [],
  currency: 'XLM' as const,
  createdAt: new Date().toISOString(),
});

const makeProps = (overrides: Partial<Parameters<typeof useSettleHandler>[0]> = {}) => ({
  group: makeGroup(),
  walletAddress: 'GCTEST1',
  numericGroupId: 1,
  groupId: 1,
  settleGroupMutation: { mutateAsync: vi.fn().mockResolvedValue({ txHash: 'abc123' }) },
  t: (key: string) => key,
  addToast: vi.fn(),
  langKey: 'tr' as const,
  tab: 'settle' as const,
  settlementsCount: 1,
  ...overrides,
});

describe('useSettleHandler', () => {
  describe('handleSettle()', () => {
    it('sets lastTxStatus to confirmed and shows toasts on success', async () => {
      const addToast = vi.fn();
      const props = makeProps({ addToast });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await result.current.handleSettle(); });

      expect(result.current.lastTxStatus).toBe('confirmed');
      expect(result.current.lastTxHash).toBe('abc123');
      expect(result.current.showConfetti).toBe(true);
      expect(addToast).toHaveBeenCalledTimes(2);
      expect(addToast).toHaveBeenCalledWith('group.settled_success', 'success');
      expect(addToast).toHaveBeenCalledWith('group.reward_earned', 'success');
    });

    it('sets lastTxStatus to failed and lastTxError on failure', async () => {
      const addToast = vi.fn();
      const settleFn = vi.fn().mockRejectedValue(new Error('Rejected by user'));
      const props = makeProps({ addToast, settleGroupMutation: { mutateAsync: settleFn } });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await result.current.handleSettle(); });

      expect(result.current.lastTxStatus).toBe('failed');
      expect(result.current.lastTxError).toBeTruthy();
      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('does nothing when group is undefined', async () => {
      const settleFn = vi.fn();
      const props = makeProps({ group: undefined, settleGroupMutation: { mutateAsync: settleFn } });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await result.current.handleSettle(); });

      expect(settleFn).not.toHaveBeenCalled();
    });
  });

  describe('fee estimation useEffect', () => {
    it('sets estimatedSettleFee to null when not on settle tab', async () => {
      const { estimateSettleGroupFee } = await import('../lib/contract');
      const props = makeProps({ tab: 'expenses' });
      const { result } = renderHook(() => useSettleHandler(props));

      // Wait for effect to run
      await act(async () => { await new Promise(r => setTimeout(r, 0)); });

      expect(result.current.estimatedSettleFee).toBeNull();
      expect(estimateSettleGroupFee).not.toHaveBeenCalled();
    });

    it('calls estimateSettleGroupFee when on settle tab with settlements', async () => {
      const { estimateSettleGroupFee } = await import('../lib/contract');
      vi.mocked(estimateSettleGroupFee).mockResolvedValue({ stroops: 100, xlm: '0.00001' });
      const props = makeProps({ tab: 'settle', settlementsCount: 2 });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await new Promise(r => setTimeout(r, 10)); });

      expect(estimateSettleGroupFee).toHaveBeenCalledWith('GCTEST1', 1);
      expect(result.current.estimatedSettleFee).toEqual({ stroops: 100, xlm: '0.00001' });
    });

    it('sets estimatedSettleFee to null when settlementsCount is 0', async () => {
      const { estimateSettleGroupFee } = await import('../lib/contract');
      const props = makeProps({ tab: 'settle', settlementsCount: 0 });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await new Promise(r => setTimeout(r, 0)); });

      expect(result.current.estimatedSettleFee).toBeNull();
      expect(estimateSettleGroupFee).not.toHaveBeenCalled();
    });
  });

  describe('setLastTxStatus / setLastTxError', () => {
    it('exposes setLastTxStatus to reset status', async () => {
      const props = makeProps();
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await result.current.handleSettle(); });
      expect(result.current.lastTxStatus).toBe('confirmed');

      act(() => { result.current.setLastTxStatus(null); });
      expect(result.current.lastTxStatus).toBeNull();
    });

    it('exposes setLastTxError to reset error', async () => {
      const settleFn = vi.fn().mockRejectedValue(new Error('error'));
      const props = makeProps({ settleGroupMutation: { mutateAsync: settleFn }, addToast: vi.fn() });
      const { result } = renderHook(() => useSettleHandler(props));

      await act(async () => { await result.current.handleSettle(); });
      expect(result.current.lastTxError).toBeTruthy();

      act(() => { result.current.setLastTxError(null); });
      expect(result.current.lastTxError).toBeNull();
    });
  });
});
