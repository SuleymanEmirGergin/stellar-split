import { renderHook, act } from '@testing-library/react';
import { useMemberHandlers } from './useMemberHandlers';

// Valid Stellar public keys for testing (generated via Keypair.random())
const VALID_ADDRESS = 'GB5R5AZI6ZR2U5OK27TMCKMGH3BP5FQ2F6LFKJ63A43BAJNY2ICOG5GU';
const VALID_ADDRESS_2 = 'GD74IWXT37QXTJSPM6HLMSR2R4E64PDFL3C2IX3PS34LXYLIZX4VDMVP';

const makeGroup = (members: string[] = [VALID_ADDRESS, 'GCTEST2']) => ({
  id: 1,
  name: 'Test Group',
  members,
  expenses: [],
  currency: 'XLM' as const,
  createdAt: new Date().toISOString(),
});

const makeProps = (overrides: Partial<Parameters<typeof useMemberHandlers>[0]> = {}) => ({
  group: makeGroup(),
  addMemberMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
  removeMemberMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
  t: (key: string) => key,
  addToast: vi.fn(),
  langKey: 'tr' as const,
  ...overrides,
});

describe('useMemberHandlers', () => {
  describe('handleAddMember()', () => {
    it('shows error toast for invalid Stellar address', async () => {
      const addToast = vi.fn();
      const props = makeProps({ addToast });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { result.current.setNewMemberInput('invalid-address'); });
      await act(async () => { await result.current.handleAddMember(); });

      expect(addToast).toHaveBeenCalledWith('group.invalid_address', 'error');
      expect(props.addMemberMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('shows error toast when address is already a member', async () => {
      const addToast = vi.fn();
      const props = makeProps({ addToast, group: makeGroup([VALID_ADDRESS, VALID_ADDRESS_2]) });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { result.current.setNewMemberInput(VALID_ADDRESS); });
      await act(async () => { await result.current.handleAddMember(); });

      expect(addToast).toHaveBeenCalledWith('group.already_member', 'error');
      expect(props.addMemberMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('calls mutateAsync and resets input on success', async () => {
      const addToast = vi.fn();
      const addFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({ addToast, addMemberMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { result.current.setNewMemberInput(VALID_ADDRESS_2); });
      await act(async () => { await result.current.handleAddMember(); });

      expect(addFn).toHaveBeenCalledWith(VALID_ADDRESS_2);
      expect(addToast).toHaveBeenCalledWith('group.member_added', 'success');
      expect(result.current.newMemberInput).toBe('');
    });

    it('shows error toast on mutateAsync failure', async () => {
      const addToast = vi.fn();
      const addFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const props = makeProps({ addToast, addMemberMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { result.current.setNewMemberInput(VALID_ADDRESS_2); });
      await act(async () => { await result.current.handleAddMember(); });

      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('does nothing when input is empty', async () => {
      const addToast = vi.fn();
      const addFn = vi.fn();
      const props = makeProps({ addToast, addMemberMutation: { mutateAsync: addFn } });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { await result.current.handleAddMember(); });

      expect(addFn).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });
  });

  describe('handleRemoveMember()', () => {
    it('does nothing when group has only 2 members', async () => {
      const removeFn = vi.fn();
      const props = makeProps({
        removeMemberMutation: { mutateAsync: removeFn },
        group: makeGroup([VALID_ADDRESS, VALID_ADDRESS_2]),
      });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { await result.current.handleRemoveMember(VALID_ADDRESS_2); });

      expect(removeFn).not.toHaveBeenCalled();
    });

    it('calls mutateAsync and shows success toast', async () => {
      const addToast = vi.fn();
      const removeFn = vi.fn().mockResolvedValue(undefined);
      const props = makeProps({
        addToast,
        removeMemberMutation: { mutateAsync: removeFn },
        group: makeGroup([VALID_ADDRESS, VALID_ADDRESS_2, 'GCTEST3']),
      });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { await result.current.handleRemoveMember(VALID_ADDRESS_2); });

      expect(removeFn).toHaveBeenCalledWith(VALID_ADDRESS_2);
      expect(addToast).toHaveBeenCalledWith('group.member_removed', 'success');
    });

    it('shows error toast on failure', async () => {
      const addToast = vi.fn();
      const removeFn = vi.fn().mockRejectedValue(new Error('Contract error'));
      const props = makeProps({
        addToast,
        removeMemberMutation: { mutateAsync: removeFn },
        group: makeGroup([VALID_ADDRESS, VALID_ADDRESS_2, 'GCTEST3']),
      });
      const { result } = renderHook(() => useMemberHandlers(props));

      await act(async () => { await result.current.handleRemoveMember(VALID_ADDRESS_2); });

      expect(addToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });
});
