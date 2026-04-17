import React from 'react';
import {
  Trophy,
  Target,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronLeft,
  Users,
  Award
} from 'lucide-react';
import { BalanceMetric } from './ui/BalanceMetric';
import { CardWithHover } from './ui/CardWithHover';
import { useI18n } from '../lib/i18n';

interface ReputationDashboardProps {
  walletAddress: string;
  isDemo: boolean;
  onBack: () => void;
}

export const ReputationDashboard: React.FC<ReputationDashboardProps> = ({
  walletAddress,
  isDemo,
  onBack
}) => {
  const { t } = useI18n();

  const stats = [
    { label: t('reputation.trust_score'), value: '98/100', icon: ShieldCheck, color: 'text-emerald-400' },
    { label: t('reputation.settlement_speed'), value: '< 2 hours', icon: Zap, color: 'text-amber-400' },
    { label: t('reputation.group_reliability'), value: 'Rank #42', icon: Trophy, color: 'text-purple-400' },
    { label: t('reputation.history_depth'), value: '2.4 yrs', icon: TrendingUp, color: 'text-indigo-400' },
  ];

  const badges = [
    { title: t('reputation.badge_early_adopter'), icon: Target, active: true },
    { title: t('reputation.badge_defi_savant'), icon: Zap, active: true },
    { title: t('reputation.badge_group_leader'), icon: Users, active: true },
    { title: t('reputation.badge_stellar_whale'), icon: TrendingUp, active: false },
    { title: t('reputation.badge_trust_node'), icon: ShieldCheck, active: true },
    { title: t('reputation.badge_top_settler'), icon: Trophy, active: false },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/50 border border-white/5 hover:bg-secondary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            {t('reputation.title')}
          </h1>
          <p className="text-sm text-muted-foreground font-mono opacity-80">{walletAddress}</p>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <CardWithHover key={i} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-white/5 ${s.color}`}>
                <s.icon size={20} />
              </div>
            </div>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
          </CardWithHover>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* badges */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card border border-white/5 rounded-3xl p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Award size={160} />
            </div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="text-indigo-400" /> {t('reputation.verified_achievements')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center
                  ${b.active ? 'bg-indigo-500/5 border-indigo-500/20 grayscale-0' : 'bg-secondary/20 border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 cursor-help'}`}
                >
                  <b.icon size={24} className={b.active ? 'text-indigo-400' : 'text-muted-foreground'} />
                  <span className="text-[10px] font-black uppercase tracking-tight">{b.title}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">{t('reputation.splt_rewards')}</h3>
              <p className="text-sm opacity-80 mb-6">{t('reputation.splt_desc')}</p>
              <div className="text-4xl font-black mb-1">
                <BalanceMetric value={isDemo ? 750 : null} suffix="SPLT" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-8">{t('reputation.available_to_claim')}</div>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-2xl font-black text-sm shadow-xl shadow-indigo-900/20 active:scale-95 transition-all">
                {t('reputation.claim_now')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
