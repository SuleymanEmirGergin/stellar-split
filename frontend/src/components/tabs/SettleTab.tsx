import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, QrCode, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { type Settlement, type Expense, type EstimatedFee } from '../../lib/contract';
import { truncateAddress } from '../../lib/stellar';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';
import Avatar from '../Avatar';
import QRCode from '../QRCode';
import ImpactPanel from '../ImpactPanel';
import type { TranslationKey } from '../../lib/i18n';

interface SettleTabProps {
  groupId: number;
  walletAddress: string;
  expenses: Expense[];
  settlements: Settlement[];
  currencyLabel: string;
  xlmUsd: number | null;
  isDemo: boolean;
  showPayQRIndex: number | null;
  setShowPayQRIndex: (val: number | null) => void;
  settling: boolean;
  handleSettle: () => void;
  estimatedSettleFee?: EstimatedFee | null;
  t: (key: TranslationKey) => string;
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
  t
}: SettleTabProps) {
  const [pathPayIndex, setPathPayIndex] = useState<number | null>(null);
  const [simulatingPath, setSimulatingPath] = useState(false);
  const [pathSuccess, setPathSuccess] = useState(false);

  const handleSimulatePathPayment = async () => {
    setSimulatingPath(true);
    setPathSuccess(false);
    // Simulate DEX routing delay
    await new Promise(r => setTimeout(r, 2000));
    setSimulatingPath(false);
    setPathSuccess(true);
    // Add toast or success state
    setTimeout(() => {
      setPathPayIndex(null);
      setPathSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      <ImpactPanel 
        expensesCount={expenses.length} 
        totalVolume={expenses.reduce((s,e)=>s+e.amount, 0)} 
        isDemo={isDemo} 
      />
      
      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">{t('group.optimized_settlements')}</h4>
        {settlements.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
            <Zap className="mx-auto w-14 h-14 text-emerald-500/40 mb-4" />
            <p className="text-lg font-black text-white/90">{t('group.empty_settlements')}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">{t('group.empty_settlements_hint')}</p>
          </div>
        ) : settlements.map((s: Settlement, i: number) => {
          const amountXlm = (s.amount / 10_000_000).toFixed(2);
          const amountDisplay = currencyLabel === 'XLM' ? formatStroopsWithUsd(s.amount, xlmUsd) : `${amountXlm} ${currencyLabel}`;
          return (
            <div key={i} className="p-6 bg-secondary/30 border border-white/5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar address={s.from} size={28} />
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <Avatar address={s.to} size={28} />
                </div>
                <div className="text-right">
                  <div className="font-black text-lg">{amountDisplay}</div>
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
                    <ArrowRightLeft size={14} /> Path Payment
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
                        <span className="text-xs font-bold text-muted-foreground">Hedef (USDC)</span>
                        <span className="text-sm font-black">{amountXlm} USDC</span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-muted-foreground">Tahmini Tutar (XLM)</span>
                        <span className="text-sm font-black text-indigo-400">~{(parseFloat(amountXlm) / (xlmUsd || 0.1)).toFixed(2)} XLM</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground italic mb-4 text-center">
                        * Stellar DEX kullanılarak cüzdanınızdan XLM çekilecek, alıcıya anında USDC varacaktır.
                      </div>
                      
                      {pathSuccess ? (
                        <div className="w-full py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> İşlem Başarılı!
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleSimulatePathPayment()}
                          disabled={simulatingPath}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all disabled:opacity-50"
                        >
                          {simulatingPath ? <Zap className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
                          {simulatingPath ? 'DEX Üzerinden Swap Ediliyor...' : 'XLM ile Öde'}
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
          <button 
            onClick={handleSettle} 
            disabled={settling} 
            className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {settling ? <Zap className="animate-spin" /> : <Zap />}
            {settling ? t('group.settling') : t('group.mark_group_settled')}
          </button>
        </>
      )}
    </div>
  );
}
