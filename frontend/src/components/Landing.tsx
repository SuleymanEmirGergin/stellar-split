import { motion, type Variants, type Easing } from 'framer-motion';
import {
  Zap, Percent, Shield, Globe, ArrowRight,
  AlertTriangle, CheckCircle2, Users, Receipt,
  TrendingDown, Sparkles, Link2, Cpu,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import Logo from './Logo';

interface Props {
  onConnect: () => void;
  onPasskey: () => void;
  freighterAvailable: boolean;
  connecting: boolean;
  isDemo?: boolean;
  onTryDemo?: () => void;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as Easing } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/** Mini product UI mockup — shown in hero */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow behind the card */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-3xl blur-2xl scale-105" />

      {/* Main card */}
      <div className="relative bg-[#111118] border border-white/10 rounded-3xl p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shrink-0">
              🏖
            </div>
            <div>
              <div className="text-sm font-bold text-white">Yaz Tatili</div>
              <div className="text-[11px] text-white/40 flex items-center gap-1">
                <Users size={10} /> 4 üye
              </div>
            </div>
          </div>
          <div className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/20">
            Aktif
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-2 mb-4">
          {[
            { emoji: '🍕', name: 'Pizza gecesi', amount: '240', user: 'Emir' },
            { emoji: '⛽', name: 'Benzin', amount: '180', user: 'Arda' },
            { emoji: '🏨', name: 'Otel', amount: '1200', user: 'Selin' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-white/[0.04] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{item.emoji}</span>
                <div>
                  <div className="text-[12px] font-semibold text-white/90">{item.name}</div>
                  <div className="text-[10px] text-white/35">{item.user} ödedi</div>
                </div>
              </div>
              <div className="text-[12px] font-bold text-white/70 font-mono">{item.amount} XLM</div>
            </div>
          ))}
        </div>

        {/* Balance callout */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-300 text-[12px] font-bold">
            <TrendingDown size={14} />
            Net bakiyeniz
          </div>
          <div className="text-emerald-400 font-black text-sm tabular-nums">+42.5 XLM</div>
        </div>

        {/* Settle button */}
        <button className="mt-3 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white text-[12px] font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
          <Zap size={13} />
          Tek tıkla takas et
        </button>
      </div>

      {/* Floating notification */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="absolute -bottom-5 -right-4 bg-[#111118] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} className="text-emerald-400" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-white">Takas tamamlandı</div>
          <div className="text-[10px] text-white/40">~4.2 saniye · $0.0001</div>
        </div>
      </motion.div>

      {/* Floating badge top-left */}
      <motion.div
        initial={{ opacity: 0, x: -8, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1.6, duration: 0.4 }}
        className="absolute -top-5 -left-4 bg-[#111118] border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-2"
      >
        <Receipt size={13} className="text-indigo-400" />
        <div className="text-[11px] font-bold text-white/90">3 harcama eklendi</div>
      </motion.div>
    </div>
  );
}

export default function Landing({ onConnect, onPasskey, freighterAvailable, connecting, isDemo, onTryDemo }: Props) {
  const { t } = useI18n();
  const canConnect = freighterAvailable || !!isDemo;

  return (
    <div className="relative min-h-full overflow-x-hidden">
      {/* ── Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Primary mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(139,92,246,0.1),transparent)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-10 max-w-6xl mx-auto"
      >
        {/* ═══════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════ */}
        <div className="min-h-[90vh] flex flex-col justify-center px-4 py-20">
          {/* Top badge */}
          <motion.div variants={fadeUp} className="flex justify-center md:justify-start mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-indigo-300 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {t('landing.powered_by')}
            </span>
          </motion.div>

          {/* Two-column hero */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text + CTAs */}
            <div className="text-center lg:text-left">
              <motion.h1
                variants={fadeUp}
                className="text-5xl md:text-6xl xl:text-7xl font-black leading-[1.06] mb-6 tracking-tighter"
              >
                {t('landing.hero_title').split('.').filter(Boolean).map((part, i, arr) => (
                  <span
                    key={i}
                    className={
                      i === arr.length - 1
                        ? 'bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent block'
                        : 'block text-white'
                    }
                  >
                    {part.trim()}{i < arr.length - 1 ? '.' : ''}
                  </span>
                ))}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-base md:text-lg text-white/55 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
              >
                {t('landing.hero_subtitle')}
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                <button
                  data-testid="landing-connect-btn"
                  onClick={onConnect}
                  disabled={!canConnect || connecting}
                  className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[15px] rounded-2xl shadow-[0_0_32px_rgba(99,102,241,0.4)] hover:shadow-[0_0_48px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {connecting ? (
                    <Zap size={18} className="animate-spin" />
                  ) : (
                    <Logo size={20} variant="hero" />
                  )}
                  {canConnect ? t('landing.cta_connect') : t('header.install_freighter')}
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  data-testid="landing-try-demo"
                  onClick={onTryDemo ?? onPasskey}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white font-bold text-[15px] rounded-2xl border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200"
                >
                  <Sparkles size={16} className="text-indigo-400" />
                  Demo Dene
                </button>
              </motion.div>

              {/* Freighter warning */}
              {!canConnect && (
                <motion.p variants={fadeUp} className="text-white/40 text-sm flex items-center justify-center lg:justify-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                  {t('landing.install_freighter_before')}{' '}
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noopener"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    {t('landing.install_freighter_link')}
                  </a>{' '}
                  {t('landing.install_freighter_after')}
                </motion.p>
              )}

              {/* Trust badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 justify-center lg:justify-start mt-8">
                {[
                  { icon: Shield, label: 'Soroban Smart Contract' },
                  { icon: Link2, label: 'Stellar Blockchain' },
                  { icon: CheckCircle2, label: 'Open Source' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-white/35 font-medium">
                    <Icon size={12} className="text-white/25" />
                    {label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Product mockup */}
            <motion.div
              variants={fadeUp}
              className="hidden lg:flex items-center justify-center pt-8"
            >
              <ProductMockup />
            </motion.div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            STATS STRIP
        ═══════════════════════════════════════ */}
        <motion.div variants={stagger} className="px-4 mb-28">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              {
                value: '<5s',
                label: t('landing.stats_tx'),
                icon: Zap,
                color: 'text-amber-400',
                bg: 'from-amber-500/10 to-amber-600/5',
                border: 'border-amber-500/15',
              },
              {
                value: '$0.001',
                label: t('landing.stats_groups'),
                icon: Cpu,
                color: 'text-indigo-400',
                bg: 'from-indigo-500/10 to-indigo-600/5',
                border: 'border-indigo-500/15',
              },
              {
                value: '98%',
                label: t('landing.stats_cheaper'),
                icon: Percent,
                color: 'text-emerald-400',
                bg: 'from-emerald-500/10 to-emerald-600/5',
                border: 'border-emerald-500/15',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`group relative bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-6 text-center overflow-hidden hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 mb-4 mx-auto ${s.color} group-hover:scale-110 transition-transform`}>
                  <s.icon size={20} />
                </div>
                <div className={`text-3xl font-black tabular-nums tracking-tighter mb-1 ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-[11px] text-white/40 uppercase font-bold tracking-[0.12em]">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════
            FEATURES
        ═══════════════════════════════════════ */}
        <motion.div variants={stagger} className="px-4 mb-28">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-3">
              Neden StellarSplit?
            </h2>
            <p className="text-white/40 text-base max-w-md mx-auto">
              Geleneksel uygulamaların yapamadığını blockchain ile gerçekleştirin.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Cpu,
                title: t('landing.feature1_title'),
                desc: t('landing.feature1_desc'),
                gradient: 'from-indigo-500/15 to-violet-500/10',
                border: 'border-indigo-500/15 hover:border-indigo-500/30',
                iconBg: 'bg-indigo-500/15',
                iconColor: 'text-indigo-400',
              },
              {
                icon: Globe,
                title: t('landing.feature2_title'),
                desc: t('landing.feature2_desc'),
                gradient: 'from-blue-500/15 to-indigo-500/10',
                border: 'border-blue-500/15 hover:border-blue-500/30',
                iconBg: 'bg-blue-500/15',
                iconColor: 'text-blue-400',
              },
              {
                icon: Shield,
                title: t('landing.feature3_title'),
                desc: t('landing.feature3_desc'),
                gradient: 'from-emerald-500/15 to-teal-500/10',
                border: 'border-emerald-500/15 hover:border-emerald-500/30',
                iconBg: 'bg-emerald-500/15',
                iconColor: 'text-emerald-400',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`group relative bg-gradient-to-br ${f.gradient} border ${f.border} rounded-3xl p-7 hover:-translate-y-2 transition-all duration-400 cursor-default overflow-hidden`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.02] to-transparent" />
                <div className={`relative w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className="relative font-black text-lg text-white mb-2.5 tracking-tight">{f.title}</h3>
                <p className="relative text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════ */}
        <motion.div variants={stagger} className="px-4 mb-28">
          <div className="max-w-2xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-3">
                Nasıl Çalışır?
              </h2>
              <p className="text-white/40 text-base">
                4 adımda harcamalarınızı takasa dönüştürün.
              </p>
            </motion.div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/30 to-transparent hidden sm:block" />

              <div className="space-y-3">
                {[
                  {
                    num: '01',
                    icon: Users,
                    title: 'Grup Oluştur',
                    detail: 'Stellar adresleriyle arkadaşlarını davet et',
                    color: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
                  },
                  {
                    num: '02',
                    icon: Receipt,
                    title: 'Harcama Ekle',
                    detail: 'Fişi tara veya manuel gir, kategori ata',
                    color: 'bg-violet-500/15 border-violet-500/25 text-violet-400',
                  },
                  {
                    num: '03',
                    icon: TrendingDown,
                    title: 'Bakiyeleri Gör',
                    detail: 'Akıllı algoritma kim kime ne kadar borçlu gösterir',
                    color: 'bg-purple-500/15 border-purple-500/25 text-purple-400',
                  },
                  {
                    num: '04',
                    icon: Zap,
                    title: 'Tek Tıkla Takas',
                    detail: 'Optimize edilmiş transferler Stellar üzerinde anında',
                    color: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
                  },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="flex items-start gap-5 p-4 rounded-2xl hover:bg-white/[0.03] transition-colors group cursor-default"
                  >
                    <div className={`w-12 h-12 rounded-xl border ${step.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <step.icon size={20} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black font-mono text-indigo-500/50 tracking-widest">{step.num}</span>
                        <span className="font-bold text-base text-white">{step.title}</span>
                      </div>
                      <div className="text-sm text-white/40">{step.detail}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════
            BOTTOM CTA
        ═══════════════════════════════════════ */}
        <motion.div variants={fadeUp} className="px-4 pb-28">
          <div className="relative max-w-2xl mx-auto text-center overflow-hidden rounded-3xl border border-white/10 p-12 bg-gradient-to-br from-indigo-950/60 via-background to-purple-950/40">
            {/* Background orbs */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-[11px] font-bold uppercase tracking-widest">
                <Sparkles size={12} />
                Başlamak ücretsiz
              </div>
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                Hazır mısın?
              </h2>
              <p className="text-white/45 text-base mb-8">
                Freighter cüzdanını bağla ve ilk grubunu saniyeler içinde oluştur.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onConnect}
                  disabled={!canConnect || connecting}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[15px] rounded-2xl shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:shadow-[0_0_40px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  <Logo size={20} variant="hero" />
                  {canConnect ? t('landing.cta_connect') : t('header.install_freighter')}
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={onTryDemo ?? onPasskey}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white font-bold text-[15px] rounded-2xl border border-white/[0.1] hover:border-white/20 transition-all"
                >
                  Demo ile Dene
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
