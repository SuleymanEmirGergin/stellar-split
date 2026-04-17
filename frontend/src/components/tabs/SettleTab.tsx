import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, QrCode, ArrowRightLeft, CheckCircle2, History, XCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { type Settlement, type Expense, type EstimatedFee } from '../../lib/contract';
import { truncateAddress } from '../../lib/stellar';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';
import Avatar from '../Avatar';
import QRCode from '../QRCode';
import ImpactPanel from '../ImpactPanel';
import { Glow } from '../ui/Glow';
import type { TranslationKey } from '../../lib/i18n';
import { useBackendSettlements, useUpdateSettlementStatusMutation } from '../../hooks/useBackendGroups';
import type { BackendSettlement } from '../../lib/api';

interface SettleTabProps {
  groupId: number;
  walletAddress: string;
  groupMembers: string[];
  expenses: Expense[];
  settlements: Settlement[];
  currencyLabel: string;
  xlmUsd: number | null;
  isDemo: boolean;
  showPayQRIndex: number | null;
  setShowPayQRIndex: (val: number | null) => void;
  settling: boolean;
  handleSettle: () => void;
  onRefresh?: () => Promise<void>;
  estimatedSettleFee?: EstimatedFee | null;
  t: (key: TranslationKey) => string;
  isOffline?: boolean;
  groupIdStr?: string;
  hasJwt?: boolean;
  addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function SettleTab({
  groupId,
  walletAddress,
  expenses,
  settlements,
  currencyLabel,
  xlmUsd,
  isDemo,
  showPayQRIndex,
  setShowPayQRIndex,
  settling,
  handleSettle,
  estimatedSettleFee,
  t,
  isOffline = false,
  groupIdStr,
  hasJwt = false,
  addToast,
}: SettleTabProps) {
  const [pathPayIndex, setPathPayIndex] = useState<number | null>(null);
  const [simulatingPath, setSimulatingPath] = useState(false);
  const [pathSuccess, setPathSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Backend settlement history (JWT mode) ──
  const showBackendHistory = hasJwt && !!groupIdStr;
  const { data: backendSettlementsData, isLoading: loadingHistory } = useBackendSettlements(
    showBackendHistory && showHistory ? groupIdStr! : null,
  );
  const backendSettlements: BackendSettlement[] = (backendSettlementsData?.data?.items ?? []) as BackendSettlement[];
  const updateStatusMutation = useUpdateSettlementStatusMutation(groupIdStr ?? '');

  const handleUpdateStatus = (id: string, status: 'CONFIRMED' | 'FAILED') => {
    updateStatusMutation.mutate({ id, status }, {
      onSuccess: () => addToast?.(t('group.settlement_status_updated'), 'success'),
      onError: () => addToast?.(t('group.settlement_status_update_failed'), 'error'),
    });
  };

  const handleSimulatePathPayment = async () => {
    setSimulatingPath(true);
    setPathSuccess(false);
    await new Promise(r => setTimeout(r, 2000));
    setSimulatingPath(false);
    setPathSuccess(true);
    setTimeout(() => {
      setPathPayIndex(null);
      setPathSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl">
        <ImpactPanel
          expensesCount={expenses.length}
          totalVolume={expenses.reduce((s,e)=>s+e.amount, 0)}
          isDemo={isDemo}
        />
      </div>
      
      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">{t('group.optimized_settlements')}</h4>
        {settlements.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-6">
            <Zap className="mx-auto w-14 h-14 text-emerald-500/40 mb-4" />
            <p className="text-lg font-black text-emerald-400">{t('group.empty_settlements')}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">{t('group.empty_settlements_hint')}</p>
          </div>
        ) : settlements.map((s: Settlement, i: number) => {
          const amountXlm = (s.amount / 10_000_000).toFixed(2);
          const amountDisplay = currencyLabel === 'XLM' ? formatStroopsWithUsd(s.amount, xlmUsd) : `${amountXlm} ${currencyLabel}`;
          return (
            <div key={i} className="relative overflow-hidden p-6 bg-white/[0.025] border border-white/[0.07] rounded-2xl space-y-4 hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar address={s.from} size={28} />
                  <ArrowRight size={14} className="text-indigo-400" />
                  <Avatar address={s.to} size={28} />
                </div>
                <div className="text-right">
                  <div className="text-xl font-black tabular-nums bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{amountDisplay}</div>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{truncateAddress(s.from)} {t('group.owes')} {truncateAddress(s.to)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setShowPayQRIndex(showPayQRIndex === i ? null : i); setPathPayIndex(null); }} 
                  className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <QrCode size={14} /> {showPayQRIndex === i ? t('group.hide_qr') : t('group.show_payment_qr')}
                </button>
                {currencyLabel === 'USDC' && s.from === walletAddress && (
                  <button 
                    type="button" 
                    onClick={() => { setPathPayIndex(pathPayIndex === i ? null : i); setShowPayQRIndex(null); setPathSuccess(false); }} 
                    className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRightLeft size={14} /> {t('group.path_payment')}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {showPayQRIndex === i && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 border-t border-white/5 flex flex-col items-center overflow-hidden"
                  >
                    <QRCode type="pay" destination={s.to} amount={amountXlm} memo={`StellarSplit #${groupId}`} />
                    <p className="text-[10px] text-muted-foreground mt-4 font-medium italic">{t('group.pay_via_freighter')}</p>
                  </motion.div>
                )}
                {pathPayIndex === i && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 border-t border-white/5 overflow-hidden"
                  >
                    <div className="bg-black/20 rounded-2xl p-4 border border-indigo-500/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-muted-foreground">{t('group.path_pay_target')}</span>
                        <span className="text-sm font-black">{amountXlm} USDC</span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-muted-foreground">{t('group.path_pay_estimated')}</span>
                        <span className="text-sm font-black text-indigo-400">~{(parseFloat(amountXlm) / (xlmUsd || 0.1)).toFixed(2)} XLM</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground italic mb-4 text-center">
                        {t('group.path_pay_note')}
                      </div>

                      {pathSuccess ? (
                        <div className="w-full py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> {t('group.path_pay_success')}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSimulatePathPayment()}
                          disabled={simulatingPath}
                          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
                        >
                          {simulatingPath ? <Zap className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
                          {simulatingPath ? t('group.path_pay_swapping') : t('group.path_pay_btn')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {settlements.length > 0 && (
        <>
          {estimatedSettleFee && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              {t('fee.estimated_fee')}: {estimatedSettleFee.stroops.toLocaleString()} stroops (~{estimatedSettleFee.xlm} XLM)
              {xlmUsd != null && (() => {
                const usd = parseFloat(estimatedSettleFee.xlm) * xlmUsd;
                return usd > 0 ? ` (~$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)})` : '';
              })()}
            </p>
          )}
          <div className="relative rounded-3xl">
            {settling && (
              <Glow intensity="subtle" color="success" className="rounded-3xl" />
            )}
            <button 
              onClick={handleSettle} 
              disabled={settling || isOffline} 
              className={`relative w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)] hover:-translate-y-px transition-all active:scale-95 flex items-center justify-center gap-2 ${
                settling
                  ? 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-background'
                  : ''
              } disabled:opacity-90`}
              title={isOffline ? (t('network.offline') || 'You\'re offline') : undefined}
            >
              {settling ? <Zap className="animate-spin" /> : <Zap />}
              {settling ? t('group.settling') : t('group.mark_group_settled')}
            </button>
          </div>
        </>
      )}

      {/* ── Backend Settlement History (JWT mode) ── */}
      {showBackendHistory && (
        <div className="p-5 bg-white/[0.025] border border-white/[0.07] rounded-2xl">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between text-xs font-black tracking-tight bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] rounded-xl px-3 py-2 transition-all"
          >
            <span className="flex items-center gap-2">
              <History size={14} className="text-indigo-400" />
              {t('group.settlement_history')}
            </span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {loadingHistory ? (
                <div className="space-y-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : backendSettlements.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                backendSettlements.map((s: BackendSettlement) => {
                  const statusColor = s.status === 'CONFIRMED'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : s.status === 'FAILED'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/20';

                  return (
                    <div key={s.id} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-muted-foreground truncate">
                            {s.txHash.slice(0, 8)}…{s.txHash.slice(-6)}
                          </span>
                          <button
                            onClick={() => { void navigator.clipboard.writeText(s.txHash); addToast?.('txHash copied', 'info'); }}
                            className="p-0.5 hover:text-white text-muted-foreground transition-colors"
                            title="Copy txHash"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${statusColor}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-black text-foreground">{parseFloat(s.amount).toFixed(2)} {s.currency}</span>
                        <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                      </div>
                      {s.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'CONFIRMED')}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] rounded-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 size={11} /> {t('group.settlement_confirm')}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'FAILED')}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-[10px] rounded-lg hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle size={11} /> {t('group.settlement_mark_failed')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
