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
  Link
} from 'lucide-react';
import { getRecovery, type RecoveryRequest, estimateSettleGroupFee, type EstimatedFee } from '../lib/contract';
import { useGroup, useGroupExpenses, useBalances, useGroupSettlements, groupKeys } from '../hooks/useGroupQuery';
import { useAddExpenseMutation, useCancelExpenseMutation, useSettleGroupMutation, useAddMemberMutation, useRemoveMemberMutation } from '../hooks/useExpenseMutations';
import { useQueryClient } from '@tanstack/react-query';
import { server, CONTRACT_ID } from '../lib/stellar';
import { subscribeGroupEvents } from '../lib/events';
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

import { sendWebhookNotification, sendSettlementReadyNotification, sendLocalNotification, requestNotificationPermission } from '../lib/notifications';
import { 
  type RecurringTemplate, 
  loadSubscriptions, 
  loadSubscriptionsFromApi,
  saveSubscriptions, 
} from '../lib/recurring';
import { getLiveApy } from '../lib/defi';
import { type Proposal, loadProposals, saveProposals, type VoteOption } from '../lib/governance';
import { scanReceiptAI, type ScannedData } from '../lib/ai';
import { useI18n } from '../lib/i18n';
import { useToast } from './Toast';
import { TxStatusTimeline, type TxStatus } from './ui/TxStatusTimeline';
import SubscriptionModal from './SubscriptionModal';
import { isSubscriptionDue } from '../lib/recurring';
import { useXlmUsd } from '../lib/xlmPrice';
import { track } from '../lib/analytics';

interface Props {
  walletAddress: string;
  groupId: number;
  onBack: () => void;
  isDemo?: boolean;
  isOffline?: boolean;
}

type Tab = 'expenses' | 'balances' | 'settle' | 'insights' | 'social' | 'recurring' | 'defi' | 'security' | 'governance' | 'gallery';

export default function GroupDetail({ walletAddress, groupId, onBack, isDemo, isOffline }: Props) {
  const { t, lang } = useI18n();
  const { addToast } = useToast();
  const xlmUsd = useXlmUsd();
  const langKey = (lang === 'tr' ? 'tr' : 'en') as Lang;
  const { data: group, isLoading: groupLoading } = useGroup(groupId);
  const { data: expenses = [] } = useGroupExpenses(groupId, group?.expense_count || 0);
  const { data: balancesRaw } = useBalances(groupId);
  const balances = balancesRaw || new Map<string, number>();
  const { data: settlements = [] } = useGroupSettlements(groupId);
  const loading = groupLoading;

  const [tab, setTab] = useState<Tab>('expenses');
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
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem(`webhook_${groupId}`) || '');
  type WebhookNotifyPref = 'all' | 'mine' | 'off';
  const [webhookNotifyPref, setWebhookNotifyPref] = useState<WebhookNotifyPref>(() => (localStorage.getItem(`webhook_pref_${groupId}`) as WebhookNotifyPref) || 'all');
  const [webhookNotifySettlement, setWebhookNotifySettlement] = useState<boolean>(() => localStorage.getItem(`webhook_settlement_${groupId}`) !== 'false');
  const [subscriptions, setSubscriptions] = useState<RecurringTemplate[]>(() => loadSubscriptions(groupId));
  const [liveApy, setLiveApy] = useState<number | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>(() => loadProposals(groupId));
  const [showAddPropose, setShowAddPropose] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDesc, setNewPropDesc] = useState('');
  const [showVisualGraph, setShowVisualGraph] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<ScannedData | null>(null);
  const [selectedOcrItems, setSelectedOcrItems] = useState<number[]>([]);
  const [activeRecovery, setActiveRecovery] = useState<RecoveryRequest | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

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
  const addExpenseMutation = useAddExpenseMutation(groupId);
  const cancelExpenseMutation = useCancelExpenseMutation(groupId);
  const addMemberMutation = useAddMemberMutation(groupId);
  const removeMemberMutation = useRemoveMemberMutation(groupId);
  const settleGroupMutation = useSettleGroupMutation(groupId);



  useEffect(() => {
    async function checkRecovery() {
      if (walletAddress) {
        try {
          const req = await getRecovery(walletAddress, walletAddress);
          setActiveRecovery(req);
        } catch (err) {
          console.error('Failed to fetch recovery:', err);
        }
      }
    }
    checkRecovery();
  }, [walletAddress]);

  // Event polling: refresh group when contract events (expense_added, group_settled, etc.) occur
  useEffect(() => {
    if (isDemo) return;
    const cleanup = subscribeGroupEvents(server, CONTRACT_ID, groupId, () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      addToast(t('group.updated'), 'success');
    });
    return cleanup;
  }, [groupId, isDemo, queryClient, addToast, t]);

  useEffect(() => {
    let cancelled = false;
    getLiveApy().then(apy => { if (!cancelled) setLiveApy(apy); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadSubscriptionsFromApi(groupId).then(apiSubs => {
      if (apiSubs && apiSubs.length >= 0) setSubscriptions(apiSubs);
    });
  }, [groupId]);

  useEffect(() => {
    if (!webhookUrl || !webhookNotifySettlement || !group || settlements.length === 0) return;
    const key = `webhook_settlement_sent_${groupId}`;
    const lastSent = localStorage.getItem(key);
    if (lastSent === String(settlements.length)) return;
    localStorage.setItem(key, String(settlements.length));
    sendSettlementReadyNotification(webhookUrl, { groupName: group.name, transactionCount: settlements.length });
  }, [groupId, group, webhookUrl, webhookNotifySettlement, settlements.length]);

  // Automated Subscription Processing
  useEffect(() => {
    if (!group || loading) return;
    const processSubscriptions = async () => {
      const due = subscriptions.filter(isSubscriptionDue);
      if (due.length === 0) return;

      const updatedSubs = [...subscriptions];
      for (const sub of due) {
        try {
          const splitAmong = group.members;
          await addExpenseMutation.mutateAsync({
            payer: walletAddress, 
            amount: sub.amount * 10_000_000, 
            splitAmong, 
            description: `${sub.name} (Auto)`, 
            category: ''
          });
          track('expense_added');
          const idx = updatedSubs.findIndex(s => s.id === sub.id);
          updatedSubs[idx] = { ...sub, lastProcessed: Date.now() };
          console.log(`[StellarSplit] Auto-processed subscription: ${sub.name}`);
        } catch (err) {
          console.error(`[StellarSplit] Failed to auto-process subscription ${sub.name}:`, err);
        }
      }
      setSubscriptions(updatedSubs);
      await saveSubscriptions(groupId, updatedSubs);
    };
    processSubscriptions();
  }, [group, loading, subscriptions, walletAddress, groupId, addExpenseMutation]);

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
      addToast(t('group.settled_success') || 'Group settled successfully!', 'success');
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
    estimateSettleGroupFee(walletAddress, groupId)
      .then((fee) => { if (!cancelled) setEstimatedSettleFee(fee); })
      .catch(() => { if (!cancelled) setEstimatedSettleFee(null); });
    return () => { cancelled = true; };
  }, [tab, settlements.length, walletAddress, groupId]);


  const handleAddSubscription = useCallback(async (sub: Omit<RecurringTemplate, 'id' | 'createdAt'>) => {
    const newSub: RecurringTemplate = {
      ...sub,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    await saveSubscriptions(groupId, updated);
  }, [groupId, subscriptions]);

  const handleAddProposal = useCallback(() => {
    if (!newPropTitle.trim()) return;
    const newProp: Proposal = {
      id: Math.random().toString(36).substr(2, 9),
      creator: walletAddress,
      title: newPropTitle,
      description: newPropDesc,
      votes: {},
      status: 'active',
      createdAt: Date.now(),
      endsAt: Date.now() + (3 * 24 * 60 * 60 * 1000),
      threshold: 51
    };
    const updated = [newProp, ...proposals];
    setProposals(updated);
    saveProposals(groupId, updated);
    setShowAddPropose(false);
    setNewPropTitle('');
    setNewPropDesc('');
  }, [walletAddress, newPropTitle, newPropDesc, proposals, groupId]);

  const handleVote = useCallback((proposalId: string, option: VoteOption) => {
    const updated = proposals.map(p => {
      if (p.id === proposalId) {
        return { ...p, votes: { ...p.votes, [walletAddress]: option } };
      }
      return p;
    });
    setProposals(updated);
    saveProposals(groupId, updated);
  }, [proposals, walletAddress, groupId]);

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
    { key: 'insights', label: t('group.insights'), icon: Info },
    { key: 'recurring', label: t('group.recurring'), icon: Repeat },
    { key: 'defi', label: 'DeFi', icon: DollarSign },
    { key: 'social', label: 'Social', icon: Share2 },
    { key: 'governance', label: 'Voting', icon: Users },
    { key: 'security', label: 'Safety', icon: Shield },
    { key: 'gallery', label: 'Fiş/Makbuzlar', icon: ImageIcon },
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
            <QRCode groupId={groupId} groupName={group.name} />
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest text-indigo-400">{t('group.share_group')}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{t('group.qr_scan_hint')}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout: left sidebar menu + main content */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar – tab navigation */}
        <nav
          role="tablist"
          aria-label={t('group.tabs_nav')}
          className="shrink-0 w-[220px] sticky top-4 rounded-2xl bg-secondary/30 border border-white/5 p-2 space-y-1"
        >
          {tabItems.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`w-full px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-wider flex items-center gap-3 transition-all ${tab === t.key ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <t.icon size={16} className="shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content area */}
        <div className="flex-1 min-w-0">
      <motion.div
        key={tab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === 'expenses' && (
          <ExpensesTab
            group={group}
            expenses={expenses}
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
          />
        )}

        {tab === 'gallery' && (
          <GalleryTab
            expenses={expenses}
            currencyLabel={currencyLabel}
            xlmUsd={xlmUsd}
          />
        )}

        {tab === 'balances' && (
          <BalancesTab
            group={group}
            expenses={expenses}
            settlements={settlements}
            balances={balances}
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
                  t={t}
                  onRetry={() => {
                    setLastTxStatus(null);
                    setLastTxError(null);
                    handleSettle();
                  }}
                />
              </div>
            )}
            <SettleTab
            groupId={groupId}
            walletAddress={walletAddress}
            expenses={expenses}
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

        {tab === 'insights' && <InsightsPanel expenses={expenses} members={group.members} group={group} />}

        {tab === 'defi' && (
          <DeFiTab
            groupId={groupId}
            liveApy={liveApy}
            currencyLabel={currencyLabel}
            t={t}
          />
        )}

        {tab === 'recurring' && (
          <RecurringTab
            subscriptions={subscriptions}
            setShowAddSub={setShowAddSub}
          />
        )}

        {tab === 'social' && (
          <SocialTab
            groupId={groupId}
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

        {tab === 'governance' && (
          <GovernanceTab
            group={group}
            proposals={proposals}
            walletAddress={walletAddress}
            setShowAddPropose={setShowAddPropose ?? (() => {})}
            handleVote={(id, vote) => handleVote(String(id), vote)}
          />
        )}

        {tab === 'security' && (
          <SecurityTab
            group={group}
            walletAddress={walletAddress}
            activeRecovery={activeRecovery}
            t={t}
            addToast={addToast}
          />
        )}
      </motion.div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto" 
            onClick={()=>setShowAdd(false)}
          >
             <motion.div 
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
                  <h3 className="text-2xl font-black tracking-tighter">{t('group.new_expense')}</h3>
                </div>

                <div className="space-y-4">
                   <div className="relative">
                     <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                     <input className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all" placeholder={t('group.what_for')} value={expDesc} onChange={e=>setExpDesc(e.target.value)} />
                   </div>
                   
                   <div className="relative">
                     <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                     <input className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl pl-12 text-xl font-black tabular-nums outline-none focus:border-indigo-500/50 transition-all" placeholder="0.00" value={expAmount} onChange={e=>setExpAmount(e.target.value)} />
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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-sm rounded-[40px] p-8 border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-6 tracking-tight">{t('group.new_proposal')}</h3>
              <div className="space-y-4">
                <input 
                  className="w-full bg-secondary/50 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500/50 transition-all font-medium" 
                  placeholder={t('group.proposal_title_placeholder')} 
                  value={newPropTitle} 
                  onChange={e => setNewPropTitle(e.target.value)} 
                />
                <textarea 
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
    </div>
  );
}
