import { useState, useCallback, useEffect } from 'react';
import { estimateSettleGroupFee, type EstimatedFee, type Group } from '../lib/contract';
import { translateError, type Lang } from '../lib/errors';
import type { TranslationKey } from '../lib/i18n';
import { track } from '../lib/analytics';
import type { TxStatus } from '../components/ui/TxStatusTimeline';

interface SettleMutation {
  mutateAsync: () => Promise<{ txHash?: string }>;
}

type Tab = 'expenses' | 'balances' | 'settle' | 'insights' | 'savings' | 'social' | 'recurring' | 'defi' | 'security' | 'governance' | 'gallery' | 'audit';

interface UseSettleHandlerProps {
  group: Group | undefined;
  walletAddress: string;
  numericGroupId: number;
  groupId: number | string;
  settleGroupMutation: SettleMutation;
  t: (key: TranslationKey) => string;
  addToast: (msg: string, type: 'success' | 'error') => void;
  langKey: Lang;
  tab: Tab;
  settlementsCount: number;
}

export function useSettleHandler({
  group, walletAddress, numericGroupId, groupId,
  settleGroupMutation, t, addToast, langKey, tab, settlementsCount,
}: UseSettleHandlerProps) {
  const [settling, setSettling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [estimatedSettleFee, setEstimatedSettleFee] = useState<EstimatedFee | null>(null);
  const [lastTxStatus, setLastTxStatus] = useState<TxStatus | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastTxError, setLastTxError] = useState<string | null>(null);
  const [lastFeePaid, setLastFeePaid] = useState<string | null>(null);

  const handleSettle = useCallback(async () => {
    if (!group) return;
    setSettling(true);
    setLastTxStatus('signing');
    setLastTxHash(null);
    setLastTxError(null);
    setLastFeePaid(null);
    try {
      const result = await settleGroupMutation.mutateAsync();
      setLastTxStatus('confirmed');
      setLastTxHash(result.txHash ?? null);
      setLastFeePaid(estimatedSettleFee ? `~${estimatedSettleFee.xlm} XLM` : null);
      track('group_settled');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      addToast(t('group.settled_success'), 'success');
      addToast(t('group.reward_earned'), 'success');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Takas başarısız';
      const msg = translateError(raw, langKey);
      setLastTxStatus('failed');
      setLastTxError(msg);
      addToast(msg, 'error');
    } finally {
      setSettling(false);
    }
  }, [group, addToast, langKey, settleGroupMutation, t, estimatedSettleFee]);

  useEffect(() => {
    if (tab !== 'settle' || settlementsCount === 0 || !walletAddress) {
      setEstimatedSettleFee(null);
      return;
    }
    let cancelled = false;
    estimateSettleGroupFee(walletAddress, numericGroupId)
      .then((fee) => { if (!cancelled) setEstimatedSettleFee(fee); })
      .catch(() => { if (!cancelled) setEstimatedSettleFee(null); });
    return () => { cancelled = true; };
  }, [tab, settlementsCount, walletAddress, groupId]);

  return {
    settling,
    showConfetti,
    estimatedSettleFee,
    lastTxStatus, setLastTxStatus,
    lastTxHash,
    lastTxError, setLastTxError,
    lastFeePaid,
    handleSettle,
  };
}
