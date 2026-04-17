import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Copy,
  Share2,
  TrendingUp,
  Zap,
  Award,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { getReferralData, claimRewards, fetchReferralData, type ReferralRecord } from '../lib/referral';
import { getAccessToken } from '../lib/api';
import { truncateAddress } from '../lib/stellar';
import { sounds } from '../lib/sound';
import { useToast } from './Toast';
import { useI18n } from '../lib/i18n';

interface ReferralDashboardProps {
  walletAddress: string;
}

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({ walletAddress }) => {
  const [data, setData] = useState<ReferralRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { addToast } = useToast();
  const { t } = useI18n();
  const hasJwt = !!getAccessToken();

  useEffect(() => {
    if (hasJwt) {
      setLoading(true);
      fetchReferralData()
        .then(setData)
        .catch(() => setData(getReferralData(walletAddress)))
        .finally(() => setLoading(false));
    } else {
      setData(getReferralData(walletAddress));
    }
  }, [walletAddress, hasJwt]);

  const handleCopy = () => {
    if (!data) return;
    const url = `${window.location.origin}?ref=${data.code}`;
    navigator.clipboard.writeText(url);
    addToast(t('group.invite_link_copied'), 'success');
    sounds.playSuccess();
  };

  const handleClaim = async () => {
    if (!data || data.unclaimedRewards <= 0) return;
    setClaiming(true);
    const claimed = await claimRewards(walletAddress);
    if (claimed > 0) {
      setData(getReferralData(walletAddress));
      addToast(`${claimed} USDC başarıyla cüzdanınıza aktarıldı!`, 'success');
      sounds.playSuccess();
    }
    setClaiming(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin text-indigo-400" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.05] border border-indigo-500/15 rounded-3xl p-8 shadow-[0_8px_32px_rgba(99,102,241,0.12)]">
        <div className="absolute top-0 right-0 p-8 opacity-[0.06]">
          <Share2 size={240} />
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest border border-indigo-500/20">
              <Zap size={14} className="text-amber-400" />
              {t('referral.program_badge')}
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none">
              {t('referral.invite_title')}<br />
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent italic">{t('referral.earn_together')}</span>
            </h1>
            <p className="text-foreground/60 text-sm font-medium max-w-sm leading-relaxed">
              {t('referral.hero_desc')}
            </p>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-300/70 uppercase tracking-widest">{t('referral.your_code')}</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 font-mono font-black text-xl flex items-center justify-center tracking-widest text-sm">
                  {data.code}
                </div>
                <button
                  onClick={handleCopy}
                  className="bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/25 p-4 rounded-xl transition-all active:scale-95"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-indigo-300/50 font-bold uppercase tracking-wider">
              {t('referral.share_hint')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-indigo-500/10 rounded-full blur-xl" />
          <Users className="text-indigo-400 mb-3" size={22} />
          <div className="font-black text-lg text-indigo-300">{data.friendsJoined}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('referral.friends_joined')}</div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl" />
          <TrendingUp className="text-emerald-400 mb-3" size={22} />
          <div className="font-black text-lg text-indigo-300">${data.totalEarnings.toFixed(2)}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('referral.total_earnings')}</div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-purple-500/10 rounded-full blur-xl" />
          <Award className="text-purple-400 mb-3" size={22} />
          <div className="font-black text-lg text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{data.tier}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('referral.account_status')}</div>
          <div className="mt-4 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: data.tier === 'Influencer' ? '100%' : data.tier === 'Pro' ? '60%' : '20%' }}
            />
          </div>
        </div>
      </div>

      {/* Claim Section */}
      <div className="bg-white/[0.025] border border-indigo-500/15 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute left-0 bottom-0 opacity-[0.03]">
          <Zap size={200} className="text-indigo-400" />
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <h3 className="text-xl font-black tracking-tight">{t('referral.wallet_rewards')}</h3>
          <p className="text-sm text-muted-foreground font-medium max-w-sm">
            {t('referral.wallet_rewards_desc')}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="text-5xl font-black text-indigo-400 tabular-nums">
            ${data.unclaimedRewards.toFixed(2)}
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming || data.unclaimedRewards <= 0}
            className={`w-full md:w-auto px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
              data.unclaimedRewards > 0
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)] active:scale-95'
                : 'bg-white/[0.04] border border-white/[0.07] text-muted-foreground cursor-not-allowed'
            }`}
          >
            {claiming ? (
              <div className="flex items-center gap-2">
                <Zap size={18} className="animate-spin text-amber-300" />
                {t('referral.signing')}
              </div>
            ) : (
              t('referral.claim_btn')
            )}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-lg font-black px-2 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {t('referral.invite_history')}
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {data.history.length > 0 ? data.history.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i}
              className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center font-bold text-indigo-400">
                  {i + 1}
                </div>
                <div>
                  <div className="font-bold font-mono text-indigo-300/70 text-sm">{truncateAddress(item.friend)}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">{new Date(item.joinedAt).toLocaleDateString('tr-TR')}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-black text-emerald-400">+${item.reward.toFixed(2)}</div>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-tighter border border-emerald-500/20">{t('referral.paid_badge')}</div>
              </div>
            </motion.div>
          )) : (
            <div className="p-12 border-2 border-dashed border-white/[0.05] rounded-[32px] text-center text-muted-foreground font-bold italic">
              {t('referral.empty_history')}
            </div>
          )}
        </div>
      </div>

      {/* Referral tiers detail */}
      <div className="p-6 bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.05] rounded-3xl border border-indigo-500/15 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
            <Zap size={16} fill="currentColor" />
            {t('referral.tier_benefits')}
          </div>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('referral.tier_benefits_desc')}
          </p>
        </div>
        <div className="flex gap-2">
          {['Starter', 'Pro', 'Influencer'].map(tier => (
            <div
              key={tier}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${
                data.tier === tier
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500/40 shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                  : 'bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {tier}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
