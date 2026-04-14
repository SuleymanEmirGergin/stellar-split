import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Zap, CheckCircle2, UserCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { type Group, type RecoveryRequest, setGuardians, initiateRecovery, approveRecovery, getRecovery, isDemoMode } from '../../lib/contract';
import { saveGuardians, approveRecovery as localApproveRecovery, initiateRecovery as localInitiateRecovery, loadAllGuardians, loadRecoveryRequest } from '../../lib/recovery';
import type { TranslationKey } from '../../lib/i18n';

interface PendingRecovery {
  target: string;
  request: RecoveryRequest;
}

interface SecurityTabProps {
  group: Group;
  walletAddress: string;
  activeRecovery: RecoveryRequest | null;
  guardianConfig: { user: string; guardians: string[]; threshold: number } | null;
  onRefresh: () => Promise<void>;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

function truncate(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function SecurityTab({
  group,
  walletAddress,
  activeRecovery,
  guardianConfig,
  onRefresh,
  t,
  addToast,
}: SecurityTabProps) {
  const [updatingGuardians, setUpdatingGuardians] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [approvingTarget, setApprovingTarget] = useState<string | null>(null);
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const otherMembers = (group?.members ?? []).filter(m => m !== walletAddress);

  const loadPendingRecoveries = useCallback(async () => {
    if (otherMembers.length === 0) return;
    setLoadingPending(true);
    try {
      if (isDemoMode()) {
        const results: PendingRecovery[] = [];
        for (const member of otherMembers) {
          const req = loadRecoveryRequest(group.id);
          if (req && req.targetAddress === member && req.status === 'pending') {
            results.push({
              target: member,
              request: {
                target: req.targetAddress,
                new_address: req.newAddress,
                approvals: req.approvals,
                status: 0,
              },
            });
          }
        }
        setPendingRecoveries(results);
      } else {
        const results = await Promise.all(
          otherMembers.map(async member => {
            try {
              const req = await getRecovery(walletAddress, member);
              if (req && req.status === 0) return { target: member, request: req };
            } catch {
              // member has no recovery request
            }
            return null;
          })
        );
        setPendingRecoveries(results.filter((r): r is PendingRecovery => r !== null));
      }
    } finally {
      setLoadingPending(false);
    }
  }, [walletAddress, group.id, otherMembers]);

  useEffect(() => {
    loadPendingRecoveries();
  }, [loadPendingRecoveries]);

  async function handleUpdateGuardians() {
    const guardians = otherMembers.slice(0, 3);
    if (guardians.length === 0) {
      addToast(t('group.recovery_guardians_failed'), 'error');
      return;
    }
    const threshold = Math.min(2, guardians.length);
    setUpdatingGuardians(true);
    try {
      await setGuardians(walletAddress, guardians, threshold);
      addToast(t('group.recovery_guardians_updated'), 'success');
      await onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/non-existent|MissingValue|set_guardians/i.test(msg)) {
        saveGuardians(group.id, walletAddress, guardians);
        addToast(t('group.recovery_guardians_saved_local'), 'success');
      } else {
        addToast(t('group.recovery_guardians_failed'), 'error');
      }
    } finally {
      setUpdatingGuardians(false);
    }
  }

  async function handleInitiateRecovery() {
    if (!targetAddress || !newAddress) return;
    setInitiating(true);
    try {
      if (isDemoMode()) {
        localInitiateRecovery(group.id, targetAddress, newAddress);
      } else {
        await initiateRecovery(walletAddress, targetAddress, newAddress);
      }
      addToast(t('group.recovery_initiated'), 'success');
      setShowInitiateForm(false);
      setTargetAddress('');
      setNewAddress('');
      await loadPendingRecoveries();
    } catch {
      addToast(t('group.recovery_initiate_failed'), 'error');
    } finally {
      setInitiating(false);
    }
  }

  async function handleApproveRecovery(target: string) {
    setApprovingTarget(target);
    try {
      if (isDemoMode()) {
        localApproveRecovery(group.id, target, walletAddress);
      } else {
        await approveRecovery(walletAddress, target);
      }
      addToast(t('group.recovery_approved_chain'), 'success');
      await loadPendingRecoveries();
      await onRefresh();
    } catch {
      addToast(t('group.recovery_approve_failed'), 'error');
    } finally {
      setApprovingTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-6 bg-secondary/30 border border-white/5 rounded-[32px] text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full" />
        <div className="w-14 h-14 rounded-[20px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-emerald-400">
          <Shield size={28} />
        </div>
        <h3 className="font-black text-lg mb-1 tracking-tight">{t('group.security_center')}</h3>
        <p className="text-xs text-muted-foreground font-medium max-w-[300px] mx-auto leading-relaxed">
          {t('group.recovery_desc')}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
          <Shield size={11} /> {t('group.recovery_shielded')}
        </div>
      </div>

      {/* My Guardian Config */}
      <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={15} className="text-emerald-400" />
            <span className="text-xs font-black tracking-tight">{t('group.recovery_my_guardians')}</span>
          </div>
          {guardianConfig && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {t('group.recovery_threshold_label')}: {guardianConfig.threshold}/{guardianConfig.guardians.length}
            </span>
          )}
        </div>

        {guardianConfig ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {guardianConfig.guardians.map(g => (
              <span key={g} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 font-mono">
                {truncate(g)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mb-4">{t('group.recovery_no_guardians')}</p>
        )}

        <button
          onClick={handleUpdateGuardians}
          disabled={updatingGuardians || otherMembers.length === 0}
          className="w-full py-3 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 font-black text-xs rounded-xl hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {updatingGuardians ? <Zap className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
          {t('group.recovery_update_guardians')}
        </button>
      </div>

      {/* Active Recovery on My Account */}
      {activeRecovery && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[24px]">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-3">
            <AlertTriangle size={14} />
            {activeRecovery.status === 1 ? t('group.recovery_completed') : t('group.recovery_active_request')}
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{t('group.recovery_new_address')}:</span>{' '}
              <span className="font-mono">{truncate(activeRecovery.new_address)}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">{t('group.recovery_approvals')}:</span>{' '}
              {activeRecovery.approvals.length}{guardianConfig ? `/${guardianConfig.threshold}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Initiate Recovery (as guardian) */}
      <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px]">
        <button
          onClick={() => setShowInitiateForm(v => !v)}
          className="w-full flex items-center justify-between text-xs font-black tracking-tight"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            {t('group.initiate_recovery')}
          </span>
          {showInitiateForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showInitiateForm && (
          <div className="mt-4 space-y-3">
            <p className="text-[10px] text-muted-foreground">{t('group.recovery_initiate_hint')}</p>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                {t('group.recovery_target_label')}
              </label>
              {otherMembers.length > 0 ? (
                <select
                  value={targetAddress}
                  onChange={e => setTargetAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">— select member —</option>
                  {otherMembers.map(m => (
                    <option key={m} value={m}>{truncate(m)}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={targetAddress}
                  onChange={e => setTargetAddress(e.target.value)}
                  placeholder="G..."
                  className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500/50"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                {t('group.recovery_new_addr_label')}
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder="G..."
                className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <button
              onClick={handleInitiateRecovery}
              disabled={initiating || !targetAddress || !newAddress}
              className="w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xs rounded-xl hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {initiating ? <Zap className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
              {t('group.initiate_recovery')}
            </button>
          </div>
        )}
      </div>

      {/* Pending Recoveries to Approve */}
      <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-400" />
            <span className="text-xs font-black tracking-tight">{t('group.approve_recovery')}</span>
          </div>
          <button
            onClick={loadPendingRecoveries}
            disabled={loadingPending}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground"
            title={t('group.recovery_check_pending')}
          >
            <RefreshCw size={12} className={loadingPending ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingPending ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Zap size={12} className="animate-spin" /> {t('group.recovery_check_pending')}…
          </div>
        ) : pendingRecoveries.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">—</p>
        ) : (
          <div className="space-y-3">
            {pendingRecoveries.map(({ target, request }) => (
              <div key={target} className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  {t('group.recovery_pending_for')}
                </p>
                <p className="font-mono text-xs text-foreground mb-1">{truncate(target)}</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {t('group.recovery_new_address')}: <span className="font-mono">{truncate(request.new_address)}</span>
                  {'  '}
                  {t('group.recovery_approvals')}: {request.approvals.length}
                </p>
                <button
                  onClick={() => handleApproveRecovery(target)}
                  disabled={approvingTarget === target}
                  className="w-full py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-[11px] rounded-lg hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {approvingTarget === target ? <Zap className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                  {t('group.recovery_as_guardian')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
