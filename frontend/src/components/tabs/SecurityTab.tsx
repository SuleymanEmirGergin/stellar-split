import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, AlertTriangle, Zap, CheckCircle2, UserCheck, RefreshCw, ChevronDown, ChevronUp, Plus, Trash2, Crown, XCircle, ClipboardList } from 'lucide-react';
import { type Group, type RecoveryRequest, setGuardians, initiateRecovery, approveRecovery, getRecovery, isDemoMode } from '../../lib/contract';
import { saveGuardians, approveRecovery as localApproveRecovery, initiateRecovery as localInitiateRecovery, loadRecoveryRequest } from '../../lib/recovery';
import { guardiansApi, type BackendGuardian, type BackendRecoveryRequest } from '../../lib/api';
import {
  useBackendGroup,
  useTransferOwnershipMutation,
  usePendingRecoveryRequests,
  useInitiateRecoveryMutation,
  useApproveRecoveryMutation,
  useRejectRecoveryMutation,
} from '../../hooks/useBackendGroups';
import { truncateAddress } from '../../lib/stellar';
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
  hasJwt?: boolean;
  groupIdStr?: string;
}


const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

const guardianKeys = {
  list: (groupId: string) => ['guardians', groupId] as const,
};

export default function SecurityTab({
  group,
  walletAddress,
  activeRecovery,
  guardianConfig,
  onRefresh,
  t,
  addToast,
  hasJwt = false,
  groupIdStr,
}: SecurityTabProps) {
  const queryClient = useQueryClient();

  const [updatingGuardians, setUpdatingGuardians] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [approvingTarget, setApprovingTarget] = useState<string | null>(null);
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // ── Backend guardian form ──
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [guardianAddressError, setGuardianAddressError] = useState('');

  // ── Transfer ownership ──
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferAddressError, setTransferAddressError] = useState('');

  // ── Backend recovery requests ──
  const [showRecoveryRequests, setShowRecoveryRequests] = useState(false);

  const useBackend = hasJwt && !!groupIdStr;

  // ── Backend group detail (for creator check + member list) ──
  const { data: backendGroupDetail } = useBackendGroup(useBackend ? groupIdStr! : null);
  const backendCreatorWallet = backendGroupDetail?.data?.creator?.walletAddress ?? null;
  const isCreator = !!backendCreatorWallet && backendCreatorWallet === walletAddress;
  const otherBackendMembers = (backendGroupDetail?.data?.members ?? [])
    .filter(m => m.user.walletAddress !== walletAddress)
    .map(m => ({ id: m.user.id, walletAddress: m.user.walletAddress }));

  // ── Transfer ownership mutation ──
  const transferOwnershipMutation = useTransferOwnershipMutation(groupIdStr ?? '');

  // ── Backend recovery request mutations ──
  const initiateRecoveryMutation = useInitiateRecoveryMutation(groupIdStr ?? '');
  const approveRecoveryMutation = useApproveRecoveryMutation();
  const rejectRecoveryMutation = useRejectRecoveryMutation();

  // ── Pending recovery requests (where I am a guardian) ──
  const { data: pendingRecoveryRequestsData, isLoading: loadingRecoveryRequests } = usePendingRecoveryRequests(useBackend && showRecoveryRequests);
  const pendingRecoveryRequests: BackendRecoveryRequest[] = pendingRecoveryRequestsData?.data ?? [];

  const handleTransferOwnership = () => {
    if (!transferAddress) {
      setTransferAddressError(t('group.recovery_target_label'));
      return;
    }
    if (!window.confirm(t('group.transfer_ownership_confirm'))) return;
    setTransferAddressError('');
    transferOwnershipMutation.mutate(transferAddress, {
      onSuccess: () => {
        setTransferAddress('');
        setShowTransferOwnership(false);
        addToast(t('group.transfer_ownership_success'), 'success');
      },
      onError: () => addToast(t('group.transfer_ownership_failed'), 'error'),
    });
  };

  const handleInitiateBackendRecovery = () => {
    initiateRecoveryMutation.mutate(undefined, {
      onSuccess: () => {
        addToast(t('group.recovery_request_initiated'), 'success');
      },
      onError: () => addToast(t('group.recovery_request_failed'), 'error'),
    });
  };

  const handleApproveBackendRecovery = (id: string) => {
    approveRecoveryMutation.mutate(id, {
      onSuccess: () => addToast(t('group.recovery_request_approved'), 'success'),
      onError: () => addToast(t('group.recovery_approve_failed'), 'error'),
    });
  };

  const handleRejectBackendRecovery = (id: string) => {
    rejectRecoveryMutation.mutate(id, {
      onSuccess: () => addToast(t('group.recovery_request_rejected'), 'success'),
      onError: () => addToast(t('group.recovery_request_reject_failed'), 'error'),
    });
  };

  // ── Backend guardian queries ──
  const { data: backendGuardians = [], isLoading: loadingBackendGuardians } = useQuery({
    queryKey: guardianKeys.list(groupIdStr ?? ''),
    queryFn: () => guardiansApi.list(groupIdStr!),
    select: (res) => res.data as BackendGuardian[],
    enabled: useBackend,
    staleTime: 60_000,
  });

  const addGuardianMutation = useMutation({
    mutationFn: (address: string) => guardiansApi.add(address, groupIdStr!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.list(groupIdStr ?? '') });
      setNewGuardianAddress('');
      setShowAddGuardian(false);
      addToast(t('group.guardian_added'), 'success');
    },
    onError: () => addToast(t('group.guardian_add_failed'), 'error'),
  });

  const removeGuardianMutation = useMutation({
    mutationFn: (id: string) => guardiansApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.list(groupIdStr ?? '') });
      addToast(t('group.guardian_removed'), 'success');
    },
    onError: () => addToast(t('group.guardian_remove_failed'), 'error'),
  });

  const handleAddGuardian = () => {
    if (!STELLAR_ADDRESS_RE.test(newGuardianAddress)) {
      setGuardianAddressError(t('group.guardian_invalid_address'));
      return;
    }
    setGuardianAddressError('');
    addGuardianMutation.mutate(newGuardianAddress);
  };

  // ── Local / Soroban paths (unchanged) ──
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

      {/* ── Backend Guardian Management (JWT mode) ── */}
      {useBackend && (
        <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-emerald-400" />
              <span className="text-xs font-black tracking-tight">{t('group.guardians')}</span>
            </div>
            <button
              data-testid="add-guardian-toggle"
              onClick={() => { setShowAddGuardian(v => !v); setGuardianAddressError(''); }}
              className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add guardian form */}
          {showAddGuardian && (
            <div className="space-y-2">
              <input
                data-testid="guardian-address-input"
                type="text"
                value={newGuardianAddress}
                onChange={e => { setNewGuardianAddress(e.target.value); setGuardianAddressError(''); }}
                placeholder={t('group.guardian_address_placeholder')}
                className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500/50"
              />
              {guardianAddressError && (
                <p className="text-[10px] text-rose-400">{guardianAddressError}</p>
              )}
              <button
                data-testid="add-guardian-submit"
                onClick={handleAddGuardian}
                disabled={addGuardianMutation.isPending || !newGuardianAddress}
                className="w-full py-2.5 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 font-black text-xs rounded-xl hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addGuardianMutation.isPending ? <Zap className="animate-spin" size={13} /> : <Plus size={13} />}
                {t('group.guardian_add_btn')}
              </button>
            </div>
          )}

          {/* Guardian list */}
          {loadingBackendGuardians ? (
            <div className="space-y-2">
              {[0, 1].map(i => (
                <div key={i} className="h-9 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : backendGuardians.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">{t('group.recovery_no_guardians')}</p>
          ) : (
            <div className="space-y-2">
              {backendGuardians.map((g: BackendGuardian) => (
                <div
                  key={g.id}
                  data-testid="guardian-item"
                  className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl"
                >
                  <span className="font-mono text-[11px] text-emerald-400">{truncateAddress(g.guardianAddress)}</span>
                  <button
                    data-testid="remove-guardian-btn"
                    onClick={() => removeGuardianMutation.mutate(g.id)}
                    disabled={removeGuardianMutation.isPending}
                    className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Backend: Transfer Ownership (creator only) ── */}
      {useBackend && isCreator && (
        <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px]">
          <button
            data-testid="transfer-ownership-toggle"
            onClick={() => { setShowTransferOwnership(v => !v); setTransferAddressError(''); }}
            className="w-full flex items-center justify-between text-xs font-black tracking-tight"
          >
            <span className="flex items-center gap-2">
              <Crown size={14} className="text-amber-400" />
              {t('group.transfer_ownership')}
            </span>
            {showTransferOwnership ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTransferOwnership && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-muted-foreground">{t('group.transfer_ownership_desc')}</p>
              {otherBackendMembers.length > 0 ? (
                <select
                  data-testid="transfer-ownership-select"
                  value={transferAddress}
                  onChange={e => { setTransferAddress(e.target.value); setTransferAddressError(''); }}
                  className="w-full px-3 py-2 bg-background border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">— {t('group.recovery_target_label')} —</option>
                  {otherBackendMembers.map(m => (
                    <option key={m.id} value={m.id}>{truncateAddress(m.walletAddress)}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t('group.recovery_no_guardians')}</p>
              )}
              {transferAddressError && (
                <p className="text-[10px] text-rose-400">{transferAddressError}</p>
              )}
              <button
                data-testid="transfer-ownership-btn"
                onClick={handleTransferOwnership}
                disabled={transferOwnershipMutation.isPending || !transferAddress}
                className="w-full py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xs rounded-xl hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {transferOwnershipMutation.isPending ? <Zap className="animate-spin" size={13} /> : <Crown size={13} />}
                {t('group.transfer_ownership_btn')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Backend: Recovery Requests (as guardian) ── */}
      {useBackend && (
        <div className="p-5 bg-secondary/30 border border-white/5 rounded-[24px]">
          <button
            data-testid="recovery-requests-toggle"
            onClick={() => setShowRecoveryRequests(v => !v)}
            className="w-full flex items-center justify-between text-xs font-black tracking-tight"
          >
            <span className="flex items-center gap-2">
              <ClipboardList size={14} className="text-blue-400" />
              {t('group.recovery_requests_title')}
            </span>
            {showRecoveryRequests ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showRecoveryRequests && (
            <div className="mt-4 space-y-3">
              {/* Initiate recovery for this group */}
              <button
                data-testid="initiate-backend-recovery-btn"
                onClick={handleInitiateBackendRecovery}
                disabled={initiateRecoveryMutation.isPending}
                className="w-full py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-[11px] rounded-xl hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {initiateRecoveryMutation.isPending ? <Zap className="animate-spin" size={12} /> : <Plus size={12} />}
                {t('group.recovery_request_initiate_btn')}
              </button>

              {/* Pending requests where I am guardian */}
              {loadingRecoveryRequests ? (
                <div className="space-y-2">
                  {[0, 1].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
                </div>
              ) : pendingRecoveryRequests.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                <div className="space-y-2">
                  {pendingRecoveryRequests.map((req: BackendRecoveryRequest) => (
                    <div
                      key={req.id}
                      data-testid="recovery-request-item"
                      className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {t('group.recovery_request_by')}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold">
                          {req.status}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-foreground">
                        {req.user?.walletAddress ? truncateAddress(req.user.walletAddress) : truncateAddress(req.userId)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          data-testid="approve-recovery-request-btn"
                          onClick={() => handleApproveBackendRecovery(req.id)}
                          disabled={approveRecoveryMutation.isPending}
                          className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] rounded-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {approveRecoveryMutation.isPending ? <Zap className="animate-spin" size={11} /> : <CheckCircle2 size={11} />}
                          {t('group.recovery_request_approve_btn')}
                        </button>
                        <button
                          data-testid="reject-recovery-request-btn"
                          onClick={() => handleRejectBackendRecovery(req.id)}
                          disabled={rejectRecoveryMutation.isPending}
                          className="flex-1 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-[10px] rounded-lg hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {rejectRecoveryMutation.isPending ? <Zap className="animate-spin" size={11} /> : <XCircle size={11} />}
                          {t('group.recovery_request_reject_btn')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Local Guardian Config (demo / Soroban mode) ── */}
      {!useBackend && (
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
                  {truncateAddress(g)}
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
      )}

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
              <span className="font-mono">{truncateAddress(activeRecovery.new_address)}</span>
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
                    <option key={m} value={m}>{truncateAddress(m)}</option>
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
                <p className="font-mono text-xs text-foreground mb-1">{truncateAddress(target)}</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {t('group.recovery_new_address')}: <span className="font-mono">{truncateAddress(request.new_address)}</span>
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
