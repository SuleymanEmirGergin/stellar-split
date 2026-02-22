import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useVault } from '../../hooks/useGroupQuery';
import { useStakeVaultMutation, useWithdrawVaultMutation, useDonateVaultMutation } from '../../hooks/useExpenseMutations';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { TranslationKey } from '../../lib/i18n';

interface DeFiTabProps {
  groupId: number;
  liveApy: number | null;
  currencyLabel: string;
  t: (key: TranslationKey) => string;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default function DeFiTab({
  groupId,
  liveApy,
  currencyLabel,
  t
}: DeFiTabProps) {
  const { data: vault, isLoading } = useVault(groupId);
  const stakeMutation = useStakeVaultMutation(groupId);
  const withdrawMutation = useWithdrawVaultMutation(groupId);
  const donateMutation = useDonateVaultMutation(groupId);

  const [amount, setAmount] = useState('100');
  const [donateAmount, setDonateAmount] = useState('');
  const [donateAddress, setDonateAddress] = useState('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'); // Default dummy address
  const [isTxAction, setIsTxAction] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  // Ensure vault is not null before accessing its properties
  if (isLoading) {
    return <div className="text-center p-8 opacity-50">Kasa Yükleniyor...</div>;
  }
  if (!vault) {
    return <div className="text-center p-8 opacity-50">Kasa Bilgisi Bulunamadı</div>;
  }

  const handleStake = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setIsTxAction(true);
    try {
      await stakeMutation.mutateAsync(val);
    } catch (e) {
      console.error(e);
      alert('Stake işlemi başarısız: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    } finally {
      setIsTxAction(false);
    }
  };

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setIsTxAction(true);
    try {
      await withdrawMutation.mutateAsync(val);
    } catch (e) {
      console.error(e);
      alert('Çekim işlemi başarısız: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    } finally {
      setIsTxAction(false);
    }
  };

  const handleDonate = async () => {
    const val = parseFloat(donateAmount);
    if (!val || val <= 0 || !donateAddress) return;
    setIsTxAction(true);
    try {
      await donateMutation.mutateAsync({ amountXlm: val, address: donateAddress });
      setDonateAmount('');
      setShowDonate(false);
    } catch (e) {
      console.error(e);
      alert('Bağış işlemi başarısız: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    } finally {
      setIsTxAction(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div variants={itemVars} className="p-8 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-[40px] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full" />
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black tracking-tight">{t('group.defi_title')}</h3>
            <p className="text-xl font-black mt-1 tracking-tight">{vault.total_staked ? `${vault.total_staked.toFixed(2)} ${currencyLabel}` : '$0.00'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${vault.active ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {vault.active ? 'Kasa Aktif' : 'Kasa Devre Dışı'}
              </span>
            </div>
          </div>
          <div className="bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 text-[10px] font-black text-indigo-400">
            %{(liveApy ?? 7.5).toFixed(1)} APY
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Staked Balance</div>
            <div className="text-xl font-mono font-black">{vault.total_staked.toFixed(2)} <span className="text-[10px] opacity-40">{currencyLabel}</span></div>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Yield</div>
            <div className="text-xl font-mono font-black text-emerald-400">+{vault.yield_earned.toFixed(6)} <span className="text-[10px] opacity-40">{currencyLabel}</span></div>
          </div>
        </div>

        {vault.total_donated > 0 && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-emerald-400">
              <Heart size={16} className="fill-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Total Donated</span>
            </div>
            <div className="font-mono font-black text-emerald-400">{vault.total_donated.toFixed(2)} {currencyLabel}</div>
          </div>
        )}

        <div className="flex flex-col gap-3 relative z-10">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Miktar (${currencyLabel})`}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="flex gap-3">
            <button 
              onClick={handleStake} 
              disabled={isTxAction || stakeMutation.isPending}
              className={`flex-1 py-4 rounded-2xl font-black transition-all ${(isTxAction || stakeMutation.isPending) ? 'bg-secondary text-muted-foreground opacity-50' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'}`}
            >
              {stakeMutation.isPending ? 'Bekleyin...' : `Stake ${currencyLabel} 🚀`}
            </button>
            <button 
              onClick={handleWithdraw}
              disabled={isTxAction || withdrawMutation.isPending || vault.total_staked <= 0}
              className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {withdrawMutation.isPending ? '⏳' : 'Geri Çek'}
            </button>
          </div>
        </div>
      </motion.div>

      {vault.yield_earned > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Heart size={16} /> Yield Donation
              </h4>
              <p className="text-[10px] text-emerald-400/60 font-medium mt-1">
                Sosyal etki yaratın! Getirinizi hayır kurumlarına bağışlayın.
              </p>
            </div>
            <button
              onClick={() => setShowDonate(!showDonate)}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/30 transition-colors"
            >
              {showDonate ? 'Gizle' : 'Bağış Yap'}
            </button>
          </div>
          
          {showDonate && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 flex flex-col gap-3"
            >
              <input 
                type="text" 
                value={donateAddress}
                onChange={(e) => setDonateAddress(e.target.value)}
                placeholder="Kurumun Stellar Adresi"
                className="w-full bg-black/20 border border-emerald-500/20 rounded-xl px-4 py-3 text-[10px] font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder={`Miktar (${currencyLabel})`}
                  max={vault.yield_earned}
                  className="w-full bg-black/20 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button
                  onClick={() => setDonateAmount(vault.yield_earned.toFixed(6))}
                  className="px-3 bg-black/20 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-400 hover:bg-black/40"
                >
                  MAX
                </button>
              </div>
              <button 
                onClick={handleDonate}
                disabled={isTxAction || donateMutation.isPending || !donateAmount}
                className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {donateMutation.isPending ? 'Bekleyin...' : '🙏 Getiriyi Bağışla'}
              </button>
            </motion.div>
          )}
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-4">
        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-200/90 mb-1">DeFi Güvenlik Notu</h4>
          <p className="text-[10px] text-amber-200/60 leading-relaxed font-medium">Bu özellik Soroban Lending havuzlarını simüle eder. Gerçek yield, akıllı kontratlar aracılığıyla havuzlara likidite sağlandığında oluşur.</p>
        </div>
      </div>
    </div>
  );
}
