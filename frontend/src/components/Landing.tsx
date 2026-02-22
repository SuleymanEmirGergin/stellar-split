import { motion, type Variants, type Easing } from 'framer-motion';
import { Zap, Users, Percent, Shield, Cpu, Globe, Rocket, ChevronRight, ArrowRight, AlertTriangle } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import Logo from './Logo';

interface Props {
  onConnect: () => void;
  freighterAvailable: boolean;
  connecting: boolean;
  isDemo?: boolean;
}

const containerVars: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVars: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: "easeOut" as Easing } 
  }
};

export default function Landing({ onConnect, freighterAvailable, connecting, isDemo }: Props) {
  const { t } = useI18n();
  const canConnect = freighterAvailable || !!isDemo;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVars}
      className="relative"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-20 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="text-center py-20 pb-16 relative">
        <motion.div variants={itemVars} className="flex flex-col items-center gap-6 mb-10">
          <Logo size={48} variant="hero" className="rounded-2xl ring-2 ring-white/10 ring-offset-4 ring-offset-background" />
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('landing.powered_by')}
          </span>
        </motion.div>
        
        <motion.h1 variants={itemVars} className="text-5xl md:text-7xl font-black leading-[1.1] mb-6 tracking-tighter">
          {t('landing.hero_title').split('.').map((part, i) => (
            <span key={i} className={i === 1 ? "bg-gradient-to-r from-indigo-400 via-white to-purple-400 bg-clip-text text-transparent block" : "block"}>
              {part}{i === 0 ? '.' : ''}
            </span>
          ))}
        </motion.h1>

        <motion.p variants={itemVars} className="text-lg text-muted-foreground max-w-[650px] mx-auto mb-12 leading-relaxed font-medium">
          {t('landing.hero_subtitle')}
        </motion.p>

        {/* Hero CTA */}
        <motion.div variants={itemVars} className="flex justify-center flex-col items-center gap-6">
          <button
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            onClick={onConnect}
            disabled={!canConnect || connecting}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {connecting ? (
              <Zap size={22} className="animate-spin" />
            ) : (
              <Logo size={28} variant="hero" />
            )}
            {t('landing.cta_connect')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {!canConnect && (
            <motion.p variants={itemVars} className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              {t('landing.install_freighter_before')}
              <a href="https://freighter.app" target="_blank" rel="noopener" className="text-indigo-400 hover:text-indigo-300 underline font-bold transition-colors">{t('landing.install_freighter_link')}</a>
              {t('landing.install_freighter_after')}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Stats Section */}
      <motion.div variants={itemVars} className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[800px] mx-auto mb-24">
        {[
          { value: '2.8M', suffix: '+', label: t('landing.stats_tx'), icon: Zap, color: 'text-amber-400' },
          { value: '12.3K', suffix: '+', label: t('landing.stats_groups'), icon: Users, color: 'text-indigo-400' },
          { value: '98', suffix: '%', label: t('landing.stats_cheaper'), icon: Percent, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="group p-6 bg-secondary/30 backdrop-blur-md border border-white/5 rounded-2xl hover:border-white/10 transition-all text-center">
            <s.icon className={`w-8 h-8 mx-auto mb-4 ${s.color} transition-transform group-hover:scale-110`} />
            <div className="text-3xl font-black text-foreground tabular-nums tracking-tighter mb-1">
              {s.value}{s.suffix}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto mb-24">
        {[
          {
            icon: Cpu,
            title: t('landing.feature1_title'),
            desc: t('landing.feature1_desc'),
            gradient: 'from-indigo-500/10 to-purple-500/10',
          },
          {
            icon: Globe,
            title: t('landing.feature2_title'),
            desc: t('landing.feature2_desc'),
            gradient: 'from-blue-500/10 to-indigo-500/10',
          },
          {
            icon: Shield,
            title: t('landing.feature3_title'),
            desc: t('landing.feature3_desc'),
            gradient: 'from-emerald-500/10 to-teal-500/10',
          },
        ].map((f, i) => (
          <motion.div
            key={i}
            variants={itemVars}
            className={`group bg-gradient-to-br ${f.gradient} border border-white/5 rounded-3xl p-8 hover:border-white/10 hover:-translate-y-2 transition-all duration-500 cursor-default`}
          >
            <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all`}>
              <f.icon className="w-7 h-7 text-foreground" />
            </div>
            <h3 className="font-black text-xl mb-3 tracking-tight">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Step Progress Section */}
      <motion.div variants={itemVars} className="max-w-[700px] mx-auto py-20 px-8 bg-secondary/20 rounded-[40px] border border-white/5 relative overflow-hidden mb-24">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />
        <h2 className="text-3xl font-black text-center mb-12 tracking-tighter">How it Works</h2>
        <div className="space-y-4">
          {[
            { icon: Users, title: 'Create Group', detail: 'Invite friends with Stellar addresses', num: '01' },
            { icon: Zap, title: 'Log Expenses', detail: 'Scan receipts or enter manually', num: '02' },
            { icon: Percent, title: 'See Balances', detail: 'Smart matrix reveals debt flow', num: '03' },
            { icon: Rocket, title: 'One-Tap Settle', detail: 'Optimized txs settle on Stellar instantly', num: '04' },
          ].map((step, i) => (
            <div className="flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 transition-colors group" key={i}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                <step.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black font-mono text-indigo-500/50 uppercase tracking-widest">{step.num}</span>
                  <span className="font-bold text-lg">{step.title}</span>
                </div>
                <div className="text-sm text-muted-foreground font-medium">{step.detail}</div>
              </div>
              <ChevronRight className="text-muted-foreground/30 group-hover:text-indigo-500 transition-colors" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <div className="text-center pb-20">
        <motion.div variants={itemVars} className="inline-block p-12 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-white/5 rounded-[40px] relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
          <p className="text-2xl font-black mb-3 tracking-tight">Ready to optimize?</p>
          <p className="text-sm text-muted-foreground mb-8 font-medium">Join the fast lane of peer-to-peer settlements.</p>
          <button
            className="inline-flex items-center gap-3 px-10 py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50"
            onClick={onConnect}
            disabled={!canConnect || connecting}
          >
            <Rocket size={20} /> Let's Go
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
