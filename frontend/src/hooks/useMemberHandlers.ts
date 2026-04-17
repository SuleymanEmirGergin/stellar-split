import { useState, useCallback } from 'react';
import { StrKey } from '@stellar/stellar-sdk';
import { translateError, type Lang } from '../lib/errors';
import { type Group } from '../lib/contract';
import type { TranslationKey } from '../lib/i18n';

interface AddMemberMutation {
  mutateAsync: (address: string) => Promise<void>;
}

interface RemoveMemberMutation {
  mutateAsync: (address: string) => Promise<void>;
}

interface UseMemberHandlersProps {
  group: Group | undefined;
  addMemberMutation: AddMemberMutation;
  removeMemberMutation: RemoveMemberMutation;
  t: (key: TranslationKey) => string;
  addToast: (msg: string, type: 'success' | 'error') => void;
  langKey: Lang;
}

export function useMemberHandlers({
  group, addMemberMutation, removeMemberMutation, t, addToast, langKey,
}: UseMemberHandlersProps) {
  const [newMemberInput, setNewMemberInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleAddMember = useCallback(async () => {
    const addr = newMemberInput.trim();
    if (!addr || !group) return;
    try {
      if (!StrKey.isValidEd25519PublicKey(addr)) {
        addToast(t('group.invalid_address'), 'error');
        return;
      }
      if (group.members.includes(addr)) {
        addToast(t('group.already_member'), 'error');
        return;
      }
      setAddingMember(true);
      await addMemberMutation.mutateAsync(addr);
      addToast(t('group.member_added'), 'success');
      setNewMemberInput('');
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('group.member_add_failed');
      addToast(translateError(raw, langKey), 'error');
    } finally {
      setAddingMember(false);
    }
  }, [group, newMemberInput, addToast, t, langKey, addMemberMutation]);

  const handleRemoveMember = useCallback(async (memberAddress: string) => {
    if (!group || group.members.length <= 2) return;
    setRemovingMember(memberAddress);
    try {
      await removeMemberMutation.mutateAsync(memberAddress);
      addToast(t('group.member_removed'), 'success');
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('group.member_remove_failed');
      addToast(translateError(raw, langKey), 'error');
    } finally {
      setRemovingMember(null);
    }
  }, [group, addToast, t, langKey, removeMemberMutation]);

  return {
    newMemberInput, setNewMemberInput,
    addingMember,
    removingMember,
    handleAddMember,
    handleRemoveMember,
  };
}
