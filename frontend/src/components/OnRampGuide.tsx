import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ExternalLink, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { openTransakWidget, hasTransakApiKey, EXCHANGE_LINKS } from '../lib/onramp';
import { useAppStore } from '../store/useAppStore';

interface Props {
  /** If provided, pre-fills the wallet address in the widget */
  walletAddress?: string;
}

/**
 * OnRampGuide — Helps users acquire XLM/USDC.
 * - With VITE_TRANSAK_API_KEY: shows a "Buy with Card" button (Transak widget)
 * - Without: shows exchange directory + educational guide
 */
export default function OnRampGuide({ walletAddress: walletProp }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'XLM' | 'USDC'>('XLM');
  const { t } = useI18n();
  const storeAddress = useAppStore((s) => s.walletAddress);
  const address = walletProp ?? storeAddress ?? '';
  const hasTransak = hasTransakApiKey();

  const steps = [
    { title: t('onramp.step1_title'), desc: t('onramp.step1_desc'), icon: '🔐' },
    { title: t('onramp.step2_title'), desc: t('onramp.step2_desc'), icon: '💳' },
    { title: t('onramp.step3_title'), desc: t('onramp.step3_desc'), icon: '🚀' },
  ];

  const handleBuyWithCard = () => {
    openTransakWidget({
      walletAddress: address,
      currency: selectedCurrency,
      fiatCurrency: 'TRY',
      environment: 'staging',
    });
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.04] border border-emerald-500/15 rounded-3xl p-6">
      {/* Header button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
            <CreditCard size={15} className="text-emerald-400" />
          </div>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-black text-2xl leading-none">
            {t('onramp.guide_prompt')}
          </span>
        </div>
        {isOpen ? <ChevronUp size={14} className="text-emerald-400/60" /> : <ChevronDown size={14} className="text-emerald-400/60" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-4">
              {/* "Buy with Card" prominent banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 via-card/60 to-teal-950/40 border border-emerald-500/[0.12] rounded-2xl p-5 mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                    💳
                  </div>
                  <div>
                    <div className="font-black text-base text-emerald-300">Kart ile XLM/USDC Satın Al</div>
                    <div className="text-xs text-muted-foreground mt-0.5">TL, EUR veya USD ile anında kripto alın</div>
                  </div>
                </div>
              </div>

              <h4 className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-black text-2xl">{t('onramp.guide_title')}</h4>

              {/* Transak CTA — only shown when API key is set */}
              {hasTransak && address && (
                <div className="bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={12} /> {t('onramp.buy_with_card_title')}
                  </p>
                  <div className="flex gap-2">
                    {(['XLM', 'USDC'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCurrency(c)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                          selectedCurrency === c
                            ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleBuyWithCard}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
                  >
                    <CreditCard size={16} />
                    {t('onramp.buy_btn')} {selectedCurrency}
                  </button>
                  <p className="text-[9px] text-muted-foreground text-center">{t('onramp.powered_by_transak')}</p>
                </div>
              )}

              {/* Steps guide */}
              <div className="grid grid-cols-1 gap-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
                    <span className="text-lg shrink-0">{s.icon}</span>
                    <div>
                      <div className="font-bold text-xs">{s.title}</div>
                      <div className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exchange links */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('onramp.exchanges')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {EXCHANGE_LINKS.map((ex) => (
                    <a
                      key={ex.name}
                      href={ex.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                    >
                      <span className="text-sm">{ex.flag}</span>
                      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-white transition-colors truncate">{ex.name}</span>
                      <ExternalLink size={10} className="text-muted-foreground/50 shrink-0 ml-auto" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="bg-amber-500/[0.08] border border-amber-500/[0.15] rounded-xl p-3 text-xs text-amber-200/70">
                <p className="font-bold text-amber-300/90 mb-1">Bilgi</p>
                <p>İşlemler Stellar ağı üzerinden gerçekleşir. Cüzdanınızın doğru olduğundan emin olun.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
