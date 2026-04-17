import { useState, useCallback } from 'react';
import { sendWebhookNotification, sendLocalNotification, requestNotificationPermission } from '../lib/notifications';
import { useNotificationStore } from '../store/useNotificationStore';
import { translateError, type Lang } from '../lib/errors';
import { type Group } from '../lib/contract';
import type { TranslationKey } from '../lib/i18n';
import { track } from '../lib/analytics';
import type { ScannedData } from '../lib/ai';

interface AddExpenseMutation {
  mutateAsync: (args: {
    payer: string; amount: number; splitAmong: string[];
    description: string; category?: string; attachmentUrl?: string;
  }) => Promise<void>;
}

interface CancelExpenseMutation {
  mutateAsync: () => Promise<void>;
}

interface UseExpenseHandlersProps {
  walletAddress: string;
  group: Group | undefined;
  addExpenseMutation: AddExpenseMutation;
  cancelExpenseMutation: CancelExpenseMutation;
  webhookUrl: string;
  webhookNotifyPref: 'all' | 'mine' | 'off';
  t: (key: TranslationKey) => string;
  addToast: (msg: string, type: 'success' | 'error') => void;
  langKey: Lang;
}

export function useExpenseHandlers({
  walletAddress, group, addExpenseMutation, cancelExpenseMutation,
  webhookUrl, webhookNotifyPref, t, addToast, langKey,
}: UseExpenseHandlersProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expReceipt, setExpReceipt] = useState('');
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<ScannedData | null>(null);
  const [selectedOcrItems, setSelectedOcrItems] = useState<number[]>([]);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const handleAddExpense = useCallback(async () => {
    const amountXlm = parseFloat(expAmount);
    const descTrimmed = expDesc.trim();
    // Client-side validation mirroring backend DTO constraints
    if (!descTrimmed) {
      setAddExpenseError(t('group.what_for') + ' ' + t('common.required'));
      return;
    }
    if (descTrimmed.length > 200) {
      setAddExpenseError(t('group.description_too_long'));
      return;
    }
    if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
      setAddExpenseError(t('group.amount_invalid'));
      return;
    }
    if (amountXlm > 1_000_000) {
      setAddExpenseError(t('group.amount_too_large'));
      return;
    }
    if (!group) return;
    const amountStroops = Math.round(amountXlm * 10_000_000);
    setAdding(true);
    setAddExpenseError(null);
    try {
      const splitAmong = group.members;
      await addExpenseMutation.mutateAsync({
        payer: walletAddress,
        amount: amountStroops,
        splitAmong,
        description: expDesc.trim(),
        category: expCategory,
        attachmentUrl: expReceipt,
      });
      track('expense_added');
      if (webhookUrl && webhookNotifyPref !== 'off') {
        sendWebhookNotification(webhookUrl, { description: expDesc.trim(), amount: amountStroops, payer: walletAddress, groupName: group.name });
      }
      requestNotificationPermission().then(granted => {
        if (granted) sendLocalNotification(t('group.new_expense'), `${expDesc.trim()} ${t('group.expense_added_suffix')}`);
      });
      useNotificationStore.getState().add({ title: t('group.new_expense'), body: `${expDesc.trim()} — ${amountXlm.toFixed(2)} XLM`, type: 'expense' });
      setShowAdd(false);
      setExpAmount('');
      setExpDesc('');
      setExpCategory('');
      setExpReceipt('');
      setAddExpenseError(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('group.expense_add_failed');
      const msg = translateError(raw, langKey);
      setAddExpenseError(msg);
      addToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  }, [walletAddress, group, expAmount, expDesc, expCategory, expReceipt, webhookUrl, webhookNotifyPref, addToast, langKey, addExpenseMutation, t]);

  const handleCancelLastExpense = useCallback(async () => {
    setCancelling(true);
    try {
      await cancelExpenseMutation.mutateAsync();
      addToast(t('group.expense_cancelled'), 'success');
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('group.expense_cancel_failed');
      addToast(translateError(raw, langKey), 'error');
    } finally {
      setCancelling(false);
    }
  }, [addToast, t, langKey, cancelExpenseMutation]);

  return {
    showAdd, setShowAdd,
    expAmount, setExpAmount,
    expDesc, setExpDesc,
    expCategory, setExpCategory,
    expReceipt, setExpReceipt,
    adding,
    cancelling,
    uploading, setUploading,
    aiScanning, setAiScanning,
    ocrResult, setOcrResult,
    selectedOcrItems, setSelectedOcrItems,
    addExpenseError, setAddExpenseError,
    viewingReceipt, setViewingReceipt,
    handleAddExpense,
    handleCancelLastExpense,
  };
}
