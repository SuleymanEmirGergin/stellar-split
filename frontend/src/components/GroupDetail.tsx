import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Users,
  Zap,
  Shield,
  Info,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  DollarSign,
  Repeat,
  Image as ImageIcon,
  ArrowLeft,
  Camera,
  QrCode,
  Plus,
  Share2,
  Link,
  Target,
  Clock,
} from 'lucide-react';
import { estimateSettleGroupFee, type EstimatedFee } from '../lib/contract';
import ErrorBoundary from './ErrorBoundary';
import { useGroup, useGroupExpenses, useBalances, useGroupSettlements, groupKeys } from '../hooks/useGroupQuery';
import { useAddExpenseMutation, useCancelExpenseMutation, useSettleGroupMutation, useAddMemberMutation, useRemoveMemberMutation } from '../hooks/useExpenseMutations';
import { useSecurityData } from '../hooks/useSecurityData';
import { useGovernanceData } from '../hooks/useGovernanceData';
import { useRecurringData } from '../hooks/useRecurringData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useQueryClient } from '@tanstack/react-query';
import { server, CONTRACT_ID } from '../lib/stellar';
import { subscribeGroupEvents } from '../lib/events';
import { useGroupEvents } from '../hooks/useGroupEvents';
import {
  useBackendExpenses,
  useBackendBalances,
  useBackendAudit,
  useSettlementPlan,
  backendGroupKeys,
} from '../hooks/useBackendGroups';
import { getAccessToken } from '../lib/api';
import { StrKey } from '@stellar/stellar-sdk';
import { translateError, type Lang } from '../lib/errors';
import Confetti from './Confetti';
import QRCode from './QRCode';
import { SkeletonShimmer } from './ui/SkeletonShimmer';
import InsightsPanel from './InsightsPanel';
import { uploadReceipt } from '../lib/storage';
import { addressBook } from '../lib/contacts';

// Tab Components
import ExpensesTab from './tabs/ExpensesTab';
import BalancesTab from './tabs/BalancesTab';
import SettleTab from './tabs/SettleTab';
import GalleryTab from './tabs/GalleryTab';
import DeFiTab from './tabs/DeFiTab';
import RecurringTab from './tabs/RecurringTab';
import SocialTab from './tabs/SocialTab';
import GovernanceTab from './tabs/GovernanceTab';
import SecurityTab from './tabs/SecurityTab';
import AuditTab from './tabs/AuditTab';
import { SocialSavings } from './SocialSavings';

import { sendWebhookNotification, sendSettlementReadyNotification, sendLocalNotification, requestNotificationPermission } from '../lib/notifications';
import { useNotificationStore } from '../store/useNotificationStore';
import { type RecurringTemplate } from '../lib/recurring';
import { getLiveApy } from '../lib/defi';
import { type Proposal, type VoteOption, type Dispute } from '../lib/governance';
import { scanReceiptAI, hasReceiptAI, getMockScannedData, type ScannedData } from '../lib/ai';
import { useI18n } from '../lib/i18n';
import { useToast } from './Toast';
import { TxStatusTimeline, type TxStatus } from './ui/TxStatusTimeline';
import SubscriptionModal from './SubscriptionModal';
import { NotificationCenter } from './NotificationCenter';
import { useXlmUsd } from '../lib/xlmPrice';
import { track } from '../lib/analytics';
import BottomSheet from './BottomSheet';

interface Props {
  walletAddress: string;
  groupId: number | string;
  onBack: () => void;
  isDemo?: boolean;
  isOffline?: boolean;
}

type Tab = 'expenses' | 'balances' | 'settle' | 'insights' | 'savings' | 'social' | 'recurring' | 'defi' | 'security' | 'governance' | 'gallery' | 'audit';

export default function GroupDetail({ walletAddress, groupId, onBack, isDemo, isOffline }: Props) {
  const { t, lang } = useI18n();
  const { addToast } = useToast();
  const xlmUsd = useXlmUsd();
  const langKey = (lang === 'tr' ? 'tr' : 'en') as Lang;
  // Soroban contract uses numeric IDs; backend uses string UUIDs.
  // Cast so hooks typed as (id: number) remain satisfied.
  const numericGroupId = groupId as number;
  const { data: group, isLoading: groupLoading } = useGroup(numericGroupId);
  const { data: expenses = [] } = useGroupExpenses(numericGroupId, group?.expense_count || 0);
  const { data: balancesRaw } = useBalances(numericGroupId);
  const balances = balancesRaw || new Map<string, number>();
  const { data: settlements = [] } = useGroupSettlements(numericGroupId);
  const loading = groupLoading;

  const [tab, setTab] = useState<Tab>('expenses');

  // ── Backend hooks (REST API) ──────────────────────────────────────────────
  const groupIdStr = String(groupId);
  const hasJwt = !isDemo && !!getAccessToken();
  const { data: backendExpenses } = useBackendExpenses(isDemo ? null : groupIdStr);
  const { data: backendBalancesRaw } = useBackendBalances(isDemo ? null : groupIdStr);
  const { data: auditData, isLoading: auditLoading } = useBackendAudit(groupIdStr, hasJwt && tab === 'audit');
  const { data: settlementPlanData } = useSettlementPlan(hasJwt ? groupIdStr : null, tab === 'balances');

  // Prefer backend data when available; fall back to Soroban contract data
  const activeExpenses = (backendExpenses ?? expenses) as typeof expenses;
  const activeBalances: Map<string, number> = backendBalancesRaw
    ? new Map((backendBalancesRaw.data ?? []).map((b) => [b.userId, b.balance]))
    : balances;

  // SSE: invalidate backend + Soroban caches on live events
  useGroupEvents(isDemo ? null : groupIdStr, (event) => {
    queryClient.invalidateQueries({ queryKey: backendGroupKeys.expenses(groupIdStr) });
    queryClient.invalidateQueries({ queryKey: backendGroupKeys.balances(groupIdStr) });
    queryClient.invalidateQueries({ queryKey: backendGroupKeys.detail(groupIdStr) });
    queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
    if (event.type !== 'heartbeat') {
      addToast(t('group.updated'), 'success');
    }
  });
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [contacts] = useState<Record<string, string>>(() => addressBook.getAll());

  const [showAdd, setShowAdd] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [expReceipt, setExpReceipt] = useState<string>('');

  const [estimatedSettleFee, setEstimatedSettleFee] = useState<EstimatedFee | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  type WebhookNotifyPref = 'all' | 'mine' | 'off';
  const [webhookUrl, setWebhookUrl] = useLocalStorage<string>(`webhook_${groupId}`, '');
  const [webhookNotifyPref, setWebhookNotifyPref] = useLocalStorage<WebhookNotifyPref>(`webhook_pref_${groupId}`, 'all');
  const [webhookNotifySettlement, setWebhookNotifySettlement] = useLocalStorage<boolean>(`webhook_settlement_${groupId}`, true);
  const [liveApy, setLiveApy] = useState<number | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showVisualGraph, setShowVisualGraph] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<ScannedData | null>(null);
  const [selectedOcrItems, setSelectedOcrItems] = useState<number[]>([]);
  const [filterSearch, setFilterSearch] = useState('');

  const { activeRecovery, guardianConfig, loadSecurityData } = useSecurityData(walletAddress, numericGroupId);

  const {
    proposals,
    disputes,
    setDisputes,
    showAddPropose,
    setShowAddPropose,
    newPropTitle,
    setNewPropTitle,
    newPropDesc,
    setNewPropDesc,
    handleAddProposal,
    handleVote,
    handleInitiateDispute,
  } = useGovernanceData(numericGroupId, walletAddress, { hasJwt, groupIdStr });

  const {
    subscriptions,
    recurringLoading,
    handleAddSubscription,
    handleToggleSubscription,
    handleDeleteSubscription,
  } = useRecurringData(numericGroupId, {
    groupIdStr,
    hasJwt,
    walletAddress,
    group,
    loading,
  });

  const [settling, setSettling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPayQRIndex, setShowPayQRIndex] = useState<number | null>(null);
  const [lastTxStatus, setLastTxStatus] = useState<TxStatus | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastTxError, setLastTxError] = useState<string | null>(null);
  const [lastFeePaid, setLastFeePaid] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => { setAddExpenseError(null); setShowAdd(true); };
    window.addEventListener('stellarsplit:new-expense', handler);
    return () => window.removeEventListener('stellarsplit:new-expense', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showAdd) setShowAdd(false);
      else if (showAddPropose) setShowAddPropose(false);
      else if (showAddSub) setShowAddSub(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAdd, showAddPropose, showAddSub]);

  const queryClient = useQueryClient();
  const addExpenseMutation = useAddExpenseMutation(numericGroupId);
  const cancelExpenseMutation = useCancelExpenseMutation(numericGroupId);
  const addMemberMutation = useAddMemberMutation(numericGroupId);
  const removeMemberMutation = useRemoveMemberMutation(numericGroupId);
  const settleGroupMutation = useSettleGroupMutation(numericGroupId);



  // Event polling: refresh group when Soroban contract events fire.
  // Skipped when JWT is available because backend SSE (useGroupEvents above) already covers these events.
  useEffect(() => {
    if (isDemo || hasJwt) return;
    const cleanup = subscribeGroupEvents(server, CONTRACT_ID, numericGroupId, () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
    });
    return cleanup;
  }, [groupId, isDemo, hasJwt, queryClient]);

  useEffect(() => {
    let cancelled = false;
    getLiveApy().then(apy => { if (!cancelled) setLiveApy(apy); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!webhookUrl || !webhookNotifySettlement || !group || settlements.length === 0) return;
    const key = `webhook_settlement_sent_${groupId}`;
    const lastSent = localStorage.getItem(key);
    if (lastSent === String(settlements.length)) return;
    localStorage.setItem(key, String(settlements.length));
    sendSettlementReadyNotification(webhookUrl, { groupName: group.name, transactionCount: settlements.length });
    useNotificationStore.getState().add({
      title: t('group.settle'),
      body: `${group.name}: ${settlements.length} transfer ile takas planı hazır.`,
      type: 'settlement',
    });
  }, [groupId, group, webhookUrl, webhookNotifySettlement, settlements.length, t]);

  const handleAddExpense = useCallback(async () => {
    const amountXlm = parseFloat(expAmount);
    if (!Number.isFinite(amountXlm) || amountXlm <= 0 || !expDesc.trim() || !group) return;
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
        attachmentUrl: expReceipt
      });
      track('expense_added');
      if (webhookUrl && webhookNotifyPref !== 'off') {
        sendWebhookNotification(webhookUrl, { description: expDesc.trim(), amount: amountStroops, payer: walletAddress, groupName: group.name });
      }
      
      requestNotificationPermission().then(granted => {
        if (granted) sendLocalNotification(t('group.new_expense'), `${expDesc.trim()} eklendi.`);
      });
      useNotificationStore.getState().add({ title: t('group.new_expense'), body: `${expDesc.trim()} — ${amountXlm.toFixed(2)} XLM`, type: 'expense' });

      setShowAdd(false);
      setExpAmount('');
      setExpDesc('');
      setExpCategory('');
      setExpReceipt('');
      setAddExpenseError(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Harcama eklenemedi';
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
      const raw = err instanceof Error ? err.message : 'Harcama iptal edilemedi';
      addToast(translateError(raw, langKey), 'error');
    } finally {
      setCancelling(false);
    }
  }, [addToast, t, langKey, cancelExpenseMutation]);

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
      const raw = err instanceof Error ? err.message : 'Üye eklenemedi';
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
      const raw = err instanceof Error ? err.message : 'Üye çıkarılamadı';
      addToast(translateError(raw, langKey), 'error');
    } finally {
      setRemovingMember(null);
    }
  }, [group, addToast, t, langKey, removeMemberMutation]);



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
      setLastFeePaid(
        estimatedSettleFee ? `~${estimatedSettleFee.xlm} XLM` : null
      );
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

  // Estimate settle fee when on Settle tab with settlements
  useEffect(() => {
    if (tab !== 'settle' || settlements.length === 0 || !walletAddress) {
      setEstimatedSettleFee(null);
      return;
    }
    let cancelled = false;
    estimateSettleGroupFee(walletAddress, numericGroupId)
      .then((fee) => { if (!cancelled) setEstimatedSettleFee(fee); })
      .catch(() => { if (!cancelled) setEstimatedSettleFee(null); });
    return () => { cancelled = true; };
  }, [tab, settlements.length, walletAddress, groupId]);


  if (loading) return (
    <div className="space-y-6">
      <SkeletonShimmer className="h-40 w-full" rounded="3xl" />
      <p className="text-center text-xs font-bold text-muted-foreground">{t('common.loading_group')}</p>
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <SkeletonShimmer key={i} className="h-10" rounded="xl" />)}
      </div>
      <SkeletonShimmer className="h-64 w-full" rounded="3xl" />
    </div>
  );
  
  if (!group) return (
    <div className="p-20 text-center flex flex-col items-center gap-6">
      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center">
        <AlertTriangle size={40} className="text-rose-500" />
      </div>
      <h3 className="text-2xl font-black">{t('group.not_found')}</h3>
      <button onClick={onBack} className="px-8 py-3 bg-secondary rounded-xl font-bold flex items-center gap-2">
        <ArrowLeft size={18} /> {t('nav.back_short')}
      </button>
    </div>
  );

  const currencyLabel = group?.currency || 'XLM';

  const tabItems: { key: Tab, label: string, icon: React.ElementType }[] = [
    { key: 'expenses', label: t('group.expenses'), icon: Receipt },
    { key: 'balances', label: t('group.balances'), icon: BarChart3 },
    { key: 'settle', label: t('group.settle'), icon: Zap },
    { key: 'savings', label: t('group.tab_savings'), icon: Target },
    { key: 'insights', label: t('group.insights'), icon: Info },
    { key: 'recurring', label: t('group.recurring'), icon: Repeat },
    { key: 'defi', label: t('group.tab_defi'), icon: DollarSign },
    { key: 'social', label: t('group.tab_social'), icon: Share2 },
    { key: 'governance', label: t('group.tab_governance'), icon: Users },
    { key: 'security', label: 'Safety', icon: Shield },
    { key: 'gallery', label: t('group.tab_gallery'), icon: ImageIcon },
    { key: 'audit', label: t('group.tab_audit'), icon: Clock },
  ];

  return (
    <div className="pb-24">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 pb-6 border-b border-white/5"
      >
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onBack} 
            className="w-10 h-10 rounded-xl bg-secondary border border-white/5 flex items-center justify-center hover:bg-white/5 transition-all active:scale-90"
            aria-label={t('nav.back')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tighter">{group.name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-muted-foreground">{currencyLabel}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                <Users size={12} /> {group.members.length} {t('group.members_count')}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                <Receipt size={12} /> {expenses.length} {t('group.expenses_count')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            type="button"
            onClick={async () => {
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${groupId}`;
              try {
                await navigator.clipboard.writeText(url);
                addToast(t('group.invite_link_copied'), 'success');
              } catch {
                addToast(t('common.error'), 'error');
              }
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary border border-white/5 text-muted-foreground hover:bg-white/5 hover:text-white transition-all"
            title={t('group.copy_invite_link')}
            aria-label={t('group.copy_invite_link')}
          >
            <Link size={20} />
          </button>
          <button 
            type="button"
            onClick={() => setShowQR(!showQR)} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showQR ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-secondary border border-white/5 text-muted-foreground hover:bg-white/5'}`}
            aria-label={showQR ? t('group.hide_qr') : t('group.show_payment_qr')}
            aria-expanded={showQR}
          >
            <QrCode size={20} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 mb-6 flex flex-col items-center gap-4 overflow-hidden"
          >
            <QRCode groupId={numericGroupId} groupName={group.name} />
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest text-indigo-400">{t('group.share_group')}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{t('group.qr_scan_hint')}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Balance Summary Widget ── */}
      {group && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {
              label: 'Toplam Harcama',
              value: activeExpenses.length > 0
                ? `${(activeExpenses.reduce((s, e) => {
                    const amt = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount / 10_000_000
                    return s + amt
                  }, 0)).toFixed(2)} ${group.currency || 'XLM'}`
                : `0 ${group.currency || 'XLM'}`,
              color: 'text-foreground',
            },
            {
              label: 'Harcama Sayısı',
              value: String(activeExpenses.length),
              color: 'text-foreground',
            },
            {
              label: (() => {
                const b = activeBalances.get(walletAddress) ?? 0
                return b >= 0 ? 'Alacaklısın' : 'Borçlusun'
              })(),
              value: (() => {
                const b = activeBalances.get(walletAddress) ?? 0
                return `${Math.abs(b / 10_000_000).toFixed(2)} ${group.currency || 'XLM'}`
              })(),
              color: (() => {
                const b = activeBalances.get(walletAddress) ?? 0
                return b > 0 ? 'text-emerald-400' : b < 0 ? 'text-red-400' : 'text-foreground/50'
              })(),
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card/50 border border-white/5 rounded-2xl p-3 text-center">
              <p className={`text-base font-bold truncate ${color}`}>{value}</p>
              <p className="text-xs text-foreground/40 mt-0.5 truncate">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Layout: left sidebar menu + main content */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar – hidden on mobile, icon-only on tablet, full on desktop */}
        <nav
          role="tablist"
          aria-label={t('group.tabs_nav')}
          className="hidden sm:flex shrink-0 sm:w-14 md:w-[220px] sticky top-4 rounded-2xl bg-secondary/30 border border-white/5 p-2 space-y-1 flex-col"
        >
          {tabItems.map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              data-testid={`tab-${item.key}`}
              onClick={() => setTab(item.key)}
              title={item.label}
              className={`w-full px-3 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-wider flex items-center gap-3 transition-all ${tab === item.key ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="hidden md:inline truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content area */}
        <div className="flex-1 min-w-0 pb-20 sm:pb-0">
      <ErrorBoundary fallback={
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-rose-500" />
          </div>
          <div>
            <p className="font-black tracking-tight mb-1">{t('common.error_fallback_title')}</p>
            <p className="text-xs text-muted-foreground">{t('common.error_fallback_desc')}</p>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors">
            {t('common.reload_page')}
          </button>
        </div>
      }>
      <motion.div
        key={tab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === 'expenses' && (
          <ExpensesTab
            group={group}
            expenses={activeExpenses}
            walletAddress={walletAddress}
            currencyLabel={currencyLabel}
            xlmUsd={xlmUsd}
            cancelling={cancelling}
            filterSearch={filterSearch}
            setFilterSearch={setFilterSearch}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            setViewingReceipt={setViewingReceipt}
            handleCancelLastExpense={handleCancelLastExpense}
            setShowAdd={setShowAdd}
            setAddExpenseError={setAddExpenseError}
            t={t}
            onDispute={(exp) => {
              handleInitiateDispute(exp.id.toString(), exp.amount, exp.category || 'other', `${t('group.dispute_initiate')}: ${exp.description}`);
              addToast(t('group.dispute_started'));
            }}
          />
        )}

        {tab === 'gallery' && (
          <GalleryTab
            expenses={activeExpenses}
            currencyLabel={currencyLabel}
            xlmUsd={xlmUsd}
            t={t}
          />
        )}

        {tab === 'balances' && (
          <BalancesTab
            group={group}
            expenses={activeExpenses}
            settlements={settlements}
            balances={activeBalances}
            walletAddress={walletAddress}
            currencyLabel={currencyLabel}
            showVisualGraph={showVisualGraph}
            setShowVisualGraph={setShowVisualGraph}
            removingMember={removingMember}
            handleRemoveMember={handleRemoveMember}
            newMemberInput={newMemberInput}
            setNewMemberInput={setNewMemberInput}
            addingMember={addingMember}
            handleAddMember={handleAddMember}
            contacts={contacts}
            settlementPlan={settlementPlanData ?? undefined}
            t={t}
          />
        )}

        {tab === 'settle' && (
          <>
            {lastTxStatus && (
              <div className="mb-6 p-5 rounded-2xl bg-card/60 border border-border">
                <TxStatusTimeline
                  status={lastTxStatus}
                  hash={lastTxHash}
                  error={lastTxError}
                  feePaid={lastFeePaid}
                  onCopyHash={() => addToast(t('common.copied') || 'Copied')}
                  t={t as (key: string) => string}
                  onRetry={() => {
                    setLastTxStatus(null);
                    setLastTxError(null);
                    handleSettle();
                  }}
                />
              </div>
            )}
            <SettleTab
            groupId={numericGroupId}
            groupMembers={group.members}
            walletAddress={walletAddress}
            expenses={activeExpenses}
            settlements={settlements}
            currencyLabel={currencyLabel}
            xlmUsd={xlmUsd}
            isDemo={isDemo ?? false}
            showPayQRIndex={showPayQRIndex}
            setShowPayQRIndex={setShowPayQRIndex}
            settling={settling}
            handleSettle={handleSettle}
            estimatedSettleFee={estimatedSettleFee}
            t={t}
            isOffline={isOffline}
          />
          </>
        )}

        {tab === 'insights' && <InsightsPanel expenses={activeExpenses} members={group.members} group={group} currentUser={walletAddress} />}

        {tab === 'defi' && (
          <DeFiTab
            groupId={numericGroupId}
            liveApy={liveApy}
            currencyLabel={currencyLabel}
            t={t}
            addToast={addToast}
          />
        )}

        {tab === 'recurring' && (
          <RecurringTab
            subscriptions={subscriptions}
            setShowAddSub={setShowAddSub}
            isLoading={recurringLoading}
            isBackend={hasJwt}
            onToggle={handleToggleSubscription}
            onDelete={handleDeleteSubscription}
            t={t}
          />
        )}

        {tab === 'social' && (
          <SocialTab
            groupId={numericGroupId}
            groupName={group.name}
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            webhookNotifyPref={webhookNotifyPref}
            setWebhookNotifyPref={setWebhookNotifyPref}
            webhookNotifySettlement={webhookNotifySettlement}
            setWebhookNotifySettlement={setWebhookNotifySettlement}
            t={t}
          />
        )}

        {tab === 'savings' && (
          <SocialSavings 
            groupId={groupId} 
            walletAddress={walletAddress} 
          />
        )}

        {tab === 'governance' && (
          <GovernanceTab
            group={group}
            proposals={proposals}
            walletAddress={walletAddress}
            setShowAddPropose={setShowAddPropose ?? (() => {})}
            handleVote={(id: number, vote: 'yes' | 'no') => {
              handleVote(String(id), vote);
            }}
            t={t}
          />
        )}

        {tab === 'security' && (
          <SecurityTab
            group={group}
            walletAddress={walletAddress}
            activeRecovery={activeRecovery}
            guardianConfig={guardianConfig}
            onRefresh={loadSecurityData}
            t={t}
            addToast={addToast}
          />
        )}

        {tab === 'audit' && (
          <AuditTab
            entries={auditData?.data?.items ?? []}
            isLoading={auditLoading}
            hasJwt={hasJwt}
          />
        )}
      </motion.div>
      </ErrorBoundary>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] hidden md:flex items-center justify-center p-4 overflow-y-auto"
            onClick={()=>setShowAdd(false)}
          >
             <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-expense-modal-title"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-sm rounded-[40px] p-10 shadow-2xl relative border border-white/5" 
              onClick={e=>e.stopPropagation()}
             >
                <button onClick={()=>setShowAdd(false)} className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-white transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Receipt size={24} />
                  </div>
                  <h3 id="add-expense-modal-title" className="text-2xl font-black tracking-tighter">{t('group.new_expense')}</h3>
                </div>

                <div className="space-y-4">
                   <div className="relative">
                     <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                     <input data-testid="expense-description-input" aria-label={t('group.what_for')} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all" placeholder={t('group.what_for')} value={expDesc} onChange={e=>setExpDesc(e.target.value)} />
                   </div>
                   
                   <div className="relative">
                     <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                     <input data-testid="expense-amount-input" aria-label={t('group.amount') || 'Amount'} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-xl font-black tabular-nums outline-none focus:border-indigo-500/50 transition-all" placeholder="0.00" value={expAmount} onChange={e=>setExpAmount(e.target.value)} />
                   </div>

                   <div>
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">{t('group.category')}</label>
                     <select value={expCategory} onChange={e=>setExpCategory(e.target.value)} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500/50 transition-all">
                       <option value="">—</option>
                       <option value="food">{t('group.category_food')}</option>
                       <option value="transport">{t('group.category_transport')}</option>
                       <option value="accommodation">{t('group.category_accommodation')}</option>
                       <option value="entertainment">{t('group.category_entertainment')}</option>
                       <option value="market">{t('group.category_market')}</option>
                       <option value="other">{t('group.category_other')}</option>
                     </select>
                   </div>

                   <div className="flex gap-2">
                      <input 
                        type="file" 
                        id="f-up" 
                        className="hidden" 
                        onChange={async e => { 
                          const f=e.target.files?.[0]; 
                          if(f){ 
                            setUploading(true); 
                            const url = await uploadReceipt(f); 
                            setExpReceipt(url); 
                             setAiScanning(true); 
                             const d = await scanReceiptAI(url); 
                             setOcrResult(d);
                             setSelectedOcrItems(d.items.map((_, i) => i));
                             setAiScanning(false); 
                             setUploading(false); 
                           } 
                         }} 
                       />
                      <label htmlFor="f-up" className="flex-1 p-4 bg-indigo-500/5 border border-indigo-500/20 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 text-center cursor-pointer hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2">
                        {uploading || aiScanning ? <Zap className="animate-spin" size={14} /> : <Camera size={14} />}
                        {uploading ? t('group.uploading') : (aiScanning ? t('group.analyzing') : t('group.scan_receipt'))}
                      </label>
                      {!hasReceiptAI() && (
                        <button
                          type="button"
                          onClick={() => {
                            const mock = getMockScannedData();
                            setOcrResult(mock);
                            setSelectedOcrItems(mock.items.map((_, i) => i));
                          }}
                          className="px-4 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-all whitespace-nowrap"
                          data-testid="demo-receipt-btn"
                        >
                          {t('ocr.demo_receipt')}
                        </button>
                      )}
                   </div>

                    {addExpenseError && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
                        <p className="text-sm font-bold text-red-400">{addExpenseError}</p>
                        <button type="button" onClick={() => { setAddExpenseError(null); handleAddExpense(); }} className="text-sm font-black text-red-400 hover:text-red-300 underline">
                          {t('common.retry')}
                        </button>
                      </div>
                    )}
                    <AnimatePresence>
                      {ocrResult && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-6 border-t border-white/5 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('ocr.review_title')}</h4>
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">{ocrResult.merchant}</span>
                          </div>
                          
                          {ocrResult.currency !== 'XLM' && (
                            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400">
                              <AlertTriangle size={12} />
                              {t('ocr.currency_warn')}
                            </div>
                          )}

                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {ocrResult.items.map((item: { description: string, amount: number }, idx: number) => (
                              <div 
                                key={idx}
                                onClick={() => setSelectedOcrItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedOcrItems.includes(idx) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-secondary/30 border-white/5 opacity-50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${selectedOcrItems.includes(idx) ? 'bg-indigo-500 animate-pulse' : 'bg-white/20'}`} />
                                  <span className="text-xs font-bold leading-tight">{item.description}</span>
                                </div>
                                <span className="text-xs font-black tabular-nums">{item.amount} XLM</span>
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={() => {
                              const selected = ocrResult.items.filter((_, i) => selectedOcrItems.includes(i));
                              if (selected.length > 0) {
                                setExpDesc(selected.map(s => s.description).join(', '));
                                setExpAmount(String(selected.reduce((acc, s) => acc + s.amount, 0)));
                                setOcrResult(null);
                              }
                            }}
                            className="w-full py-4 bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={14} /> {t('ocr.add_button')}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                   <div className="flex gap-3 pt-4">
                      <button data-testid="add-expense-modal-submit" onClick={handleAddExpense} disabled={adding} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50">
                        {adding ? t('common.processing') : `${t('group.add_expense')} ✨`}
                      </button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Expense BottomSheet – mobile only (md:hidden is built into BottomSheet) */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title={t('group.new_expense')}>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input data-testid="expense-description-input-mobile" aria-label={t('group.what_for')} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all" placeholder={t('group.what_for')} value={expDesc} onChange={e => setExpDesc(e.target.value)} />
          </div>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input data-testid="expense-amount-input-mobile" aria-label={t('group.amount') || 'Amount'} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-xl font-black tabular-nums outline-none focus:border-indigo-500/50 transition-all" placeholder="0.00" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">{t('group.category')}</label>
            <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500/50 transition-all">
              <option value="">—</option>
              <option value="food">{t('group.category_food')}</option>
              <option value="transport">{t('group.category_transport')}</option>
              <option value="accommodation">{t('group.category_accommodation')}</option>
              <option value="entertainment">{t('group.category_entertainment')}</option>
              <option value="market">{t('group.category_market')}</option>
              <option value="other">{t('group.category_other')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <label htmlFor="f-up" className="flex-1 p-4 bg-indigo-500/5 border border-indigo-500/20 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 text-center cursor-pointer hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2">
              {uploading || aiScanning ? <Zap className="animate-spin" size={14} /> : <Camera size={14} />}
              {uploading ? t('group.uploading') : (aiScanning ? t('group.analyzing') : t('group.scan_receipt'))}
            </label>
            {!hasReceiptAI() && (
              <button
                type="button"
                onClick={() => {
                  const mock = getMockScannedData();
                  setOcrResult(mock);
                  setSelectedOcrItems(mock.items.map((_, i) => i));
                }}
                className="px-4 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-all whitespace-nowrap"
              >
                {t('ocr.demo_receipt')}
              </button>
            )}
          </div>
          {addExpenseError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
              <p className="text-sm font-bold text-red-400">{addExpenseError}</p>
              <button type="button" onClick={() => { setAddExpenseError(null); handleAddExpense(); }} className="text-sm font-black text-red-400 hover:text-red-300 underline">
                {t('common.retry')}
              </button>
            </div>
          )}
          <AnimatePresence>
            {ocrResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-white/5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('ocr.review_title')}</h4>
                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">{ocrResult.merchant}</span>
                </div>
                {ocrResult.currency !== 'XLM' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400">
                    <AlertTriangle size={12} />
                    {t('ocr.currency_warn')}
                  </div>
                )}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {ocrResult.items.map((item: { description: string, amount: number }, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedOcrItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedOcrItems.includes(idx) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-secondary/30 border-white/5 opacity-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${selectedOcrItems.includes(idx) ? 'bg-indigo-500 animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-xs font-bold leading-tight">{item.description}</span>
                      </div>
                      <span className="text-xs font-black tabular-nums">{item.amount} XLM</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const selected = ocrResult.items.filter((_, i) => selectedOcrItems.includes(i));
                    if (selected.length > 0) {
                      setExpDesc(selected.map(s => s.description).join(', '));
                      setExpAmount(String(selected.reduce((acc, s) => acc + s.amount, 0)));
                      setOcrResult(null);
                    }
                  }}
                  className="w-full py-4 bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> {t('ocr.add_button')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="pt-2">
            <button onClick={handleAddExpense} disabled={adding} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50">
              {adding ? t('common.processing') : `${t('group.add_expense')} ✨`}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Proposal Modal */}
      <AnimatePresence>
        {showAddPropose && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4"
            onClick={() => setShowAddPropose(false)}
          >
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-proposal-modal-title"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-sm rounded-[40px] p-8 border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <h3 id="add-proposal-modal-title" className="text-xl font-black mb-6 tracking-tight">{t('group.new_proposal')}</h3>
              <div className="space-y-4">
                <input 
                  aria-label={t('group.proposal_title_placeholder')}
                  className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500/50 transition-all font-medium" 
                  placeholder={t('group.proposal_title_placeholder')} 
                  value={newPropTitle} 
                  onChange={e => setNewPropTitle(e.target.value)} 
                />
                <textarea 
                  aria-label={t('group.proposal_desc_placeholder')}
                  className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500/50 transition-all font-medium" 
                  placeholder={t('group.proposal_desc_placeholder')} 
                  rows={4}
                  value={newPropDesc} 
                  onChange={e => setNewPropDesc(e.target.value)} 
                />
                <button 
                  onClick={handleAddProposal} 
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-500 transition-all active:scale-95"
                >
                  {t('group.proposal_submit')} 🚀
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/95 p-8 z-[700] flex flex-col items-center justify-center" onClick={()=>setViewingReceipt(null)}>
          <motion.img 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={viewingReceipt} 
            className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border border-white/10" 
            alt={t('group.receipt')} 
          />
          <button className="mt-8 px-6 py-3 bg-white/10 rounded-xl font-bold text-white hover:bg-white/20 transition-all">Close Viewer</button>
        </div>
      )}

      <Confetti active={showConfetti} />

      <SubscriptionModal
        isOpen={showAddSub}
        onClose={() => setShowAddSub(false)}
        onSave={handleAddSubscription}
      />

      {/* Mobile bottom tab bar – visible only on sm and below */}
      {(() => {
        const primaryTabs = tabItems.slice(0, 5);
        const moreTabs = tabItems.slice(5);
        return (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-white/5">
            <div className="flex items-center justify-around px-2 py-2">
              {primaryTabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setTab(item.key); setShowMobileMore(false); }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                    tab === item.key && !showMobileMore
                      ? 'text-indigo-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-[9px] font-black uppercase tracking-wider">{item.label.slice(0, 6)}</span>
                </button>
              ))}
              <button
                onClick={() => setShowMobileMore((v) => !v)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  showMobileMore ? 'text-indigo-400' : 'text-muted-foreground'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-wider">More</span>
              </button>
            </div>

            {/* "More" bottom sheet */}
            <AnimatePresence>
              {showMobileMore && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="absolute bottom-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-white/5 rounded-t-3xl p-4"
                >
                  <div className="w-8 h-1 rounded-full bg-white/20 mx-auto mb-4" />
                  <div className="grid grid-cols-3 gap-2">
                    {moreTabs.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => { setTab(item.key); setShowMobileMore(false); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                          tab === item.key
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-white/5 text-muted-foreground hover:text-foreground border border-transparent'
                        }`}
                      >
                        <item.icon size={20} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}
    </div>
  );
}
