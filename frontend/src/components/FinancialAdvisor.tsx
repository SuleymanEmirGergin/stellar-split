import * as React from 'react';
import { Sparkles, Brain, ArrowRight, TrendingUp, Wallet, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancialAdvisor } from '../hooks/useFinancialAdvisor';
import { useI18n } from '../lib/i18n';

interface Props {
  walletAddress: string;
  groups: unknown[];
  balances: Record<string, number>;
}

export const FinancialAdvisor: React.FC<Props> = ({ walletAddress, groups, balances }) => {
  const { advice, loading, error, refreshAdvice } = useFinancialAdvisor(walletAddress);
  const { t } = useI18n();

  React.useEffect(() => {
    if (!advice && !loading && !error) {
      refreshAdvice(groups, balances);
    }
  }, [advice, loading, error, refreshAdvice, groups, balances]);

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-[2.5rem] p-8 relative overflow-hidden backdrop-blur-xl shadow-2xl">
      {/* Decorative Orbs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="text-white w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Stellar Intelligence <Sparkles className="w-5 h-5 text-indigo-400" />
              </h3>
              <p className="text-sm text-indigo-200/60 font-medium">Gemini 3.0 Flash Powered Advisor</p>
            </div>
          </div>
          <button 
            onClick={() => refreshAdvice(groups, balances)}
            disabled={loading}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-indigo-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 py-8"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-3 h-3 bg-indigo-300 rounded-full animate-bounce" />
                </div>
                <p className="text-indigo-200/80 font-bold text-lg">{t('advisor.analyzing')}</p>
                <p className="text-xs text-indigo-300/40">{t('advisor.analyzing_subtitle')}</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl"
            >
              <AlertCircle className="text-red-400" />
              <p className="text-sm text-red-400 font-bold">{t('advisor.connection_failed')}: {error}</p>
            </motion.div>
          ) : advice ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Main Summary */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <TrendingUp size={60} />
                </div>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">{t('advisor.financial_summary')}</h4>
                <p className="text-lg text-white font-medium leading-relaxed">
                  {advice.summary}
                </p>
              </div>

              {/* Actionable Tips Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {advice.tips.map((tip, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl hover:bg-indigo-500/20 transition-all cursor-default"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center mb-3 text-white">
                      <ShieldCheck size={18} />
                    </div>
                    <p className="text-sm text-indigo-100 font-bold leading-snug">{tip}</p>
                  </motion.div>
                ))}
              </div>

              {/* Saving Plan / DeFi Context */}
              {advice.savingPlan && (
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 text-white">
                    <Wallet size={32} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-emerald-400 uppercase tracking-tighter mb-1">{t('advisor.saving_plan_title')}</h4>
                    <p className="text-xs text-emerald-100/80 font-medium leading-relaxed italic">
                      "{advice.savingPlan}"
                    </p>
                  </div>
                  <button className="px-6 py-3 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2 shrink-0">
                    {t('advisor.apply_strategy')} <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
