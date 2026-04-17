import { renderHook, act } from '@testing-library/react';
import { useExpenseHandlers } from './useExpenseHandlers';

vi.mock('../lib/notifications', () => ({
  sendWebhookNotification: vi.fn(),
  sendLocalNotification: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue(false),
}));

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: {
    getState: () => ({ add: vi.fn() }),
  },
}));

const makeGroup = (overrides = {}) => ({
  id: 1,
  name: 'Test Group',
  members: ['GCTEST1', 'GCTEST2'],
  expenses: [],
  currency: 'XLM' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeProps = (overrides: Partial<Parameters<typeof useExpenseHandlers>[0]> = {}) => ({
  walletAddress: 'GCTEST1',
  group: makeGroup(),
  addExpenseMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
  cancelExpenseMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
  webhookUrl: '',
  webhookNotifyPref: 'off' as const,
  t: (key: string) => key,
  addToast: vi.fn(),
  langKey: 'tr' as const,
  ...overrides,
});

describe('useExpenseHandlers', () => {
  describe('handleAddExpense()', () => {
    it('does nothing when amount is invalid', async () => {
      const addFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({ addExpenseMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => {
        result.current.setExpAmount('0');
        result.current.setExpDesc('test');
      });
      await act(async () => { await result.current.handleAddExpense(); });

      expect(addFn).not.toHaveBeenCalled();
    });

    it('does nothing when description is empty', async () => {
      const addFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({ addExpenseMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => {
        result.current.setExpAmount('10');
        result.current.setExpDesc('');
      });
      await act(async () => { await result.current.handleAddExpense(); });

      expect(addFn).not.toHaveBeenCalled();
    });

    it('calls mutateAsync and resets state on success', async () => {
      const addFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({ addExpenseMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => {
        result.current.setExpAmount('10');
        result.current.setExpDesc('Lunch');
      });
      await act(async () => { await result.current.handleAddExpense(); });

      expect(addFn).toHaveBeenCalledWith(expect.objectContaining({
        payer: 'GCTEST1',
        amount: 100_000_000, // 10 XLM in stroops
        description: 'Lunch',
      }));
      expect(result.current.showAdd).toBe(false);
      expect(result.current.expAmount).toBe('');
      expect(result.current.expDesc).toBe('');
      expect(result.current.addExpenseError).toBeNull();
    });

    it('sets addExpenseError and calls addToast on failure', async () => {
      const addToast = vi.fn();
      const addFn = vi.fn().mockRejectedValue(new Error('Contract error'));
      const props = makeProps({ addExpenseMutation: { mutateAsync: addFn }, addToast });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => {
        result.current.setExpAmount('5');
        result.current.setExpDesc('Coffee');
      });
      await act(async () => { await result.current.handleAddExpense(); });

      expect(result.current.addExpenseError).toBeTruthy();
      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('sends webhook when webhookUrl and pref are set', async () => {
      const { sendWebhookNotification } = await import('../lib/notifications');
      const addFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({
        addExpenseMutation: { mutateAsync: addFn },
        webhookUrl: 'https://hooks.example.com/test',
        webhookNotifyPref: 'all',
      });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => {
        result.current.setExpAmount('20');
        result.current.setExpDesc('Dinner');
      });
      await act(async () => { await result.current.handleAddExpense(); });

      expect(sendWebhookNotification).toHaveBeenCalled();
    });
  });

  describe('handleCancelLastExpense()', () => {
    it('shows success toast on success', async () => {
      const addToast = vi.fn();
      const cancelFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({ cancelExpenseMutation: { mutateAsync: cancelFn }, addToast });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => { await result.current.handleCancelLastExpense(); });

      expect(cancelFn).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('shows error toast on failure', async () => {
      const addToast = vi.fn();
      const cancelFn = vi.fn().mockRejectedValue(new Error('Not authorized'));
      const props = makeProps({ cancelExpenseMutation: { mutateAsync: cancelFn }, addToast });
      const { result } = renderHook(() => useExpenseHandlers(props));

      await act(async () => { await result.current.handleCancelLastExpense(); });

      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('state toggles', () => {
    it('setShowAdd toggles showAdd', () => {
      const { result } = renderHook(() => useExpenseHandlers(makeProps()));
      expect(result.current.showAdd).toBe(false);
      act(() => { result.current.setShowAdd(true); });
      expect(result.current.showAdd).toBe(true);
    });

    it('setOcrResult updates ocrResult', () => {
      const { result } = renderHook(() => useExpenseHandlers(makeProps()));
      const fakeOcr = { items: [], total: 0, currency: 'XLM', merchant: '' };
      act(() => { result.current.setOcrResult(fakeOcr); });
      expect(result.current.ocrResult).toEqual(fakeOcr);
    });

    it('setSelectedOcrItems updates selectedOcrItems', () => {
      const { result } = renderHook(() => useExpenseHandlers(makeProps()));
      act(() => { result.current.setSelectedOcrItems([0, 1]); });
      expect(result.current.selectedOcrItems).toEqual([0, 1]);
    });
  });
});
