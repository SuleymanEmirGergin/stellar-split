import React from 'react';
import { Target, CheckCircle2, Circle, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';

export const WeeklyGoals: React.FC = () => {
  const { t } = useI18n();

  const GOALS = [
    { id: 1, title: t('goals.weekly_savings'), target: '50 XLM', progress: 65, status: 'in-progress' },
    { id: 2, title: t('goals.debt_payoff'), target: '3/3 Grup', progress: 100, status: 'completed' },
  ];

  return (
    <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Target className="text-rose-400" size={20} />
            {t('goals.title')}
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
            {t('goals.complete_earn')}
          </p>
        </div>
        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
          <TrendingDown size={18} />
        </div>
      </div>

      <div className="space-y-4">
        {GOALS.map((goal, i) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                {goal.status === 'completed' ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <Circle size={14} className="text-slate-500" />
                )}
                <span className={goal.status === 'completed' ? 'text-muted-foreground line-through' : 'text-white'}>
                  {goal.title}
                </span>
              </div>
              <span className="text-indigo-400">{goal.target}</span>
            </div>
            
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                className={`h-full rounded-full ${
                  goal.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-center">
        <p className="text-[10px] text-indigo-300 font-bold">
          🎁 Kalan süre: 2 gün 4 saat
        </p>
      </div>
    </div>
  );
};
