import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Zap, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';

interface Props {
  expensesCount: number;
  totalVolume: number;
  isDemo?: boolean;
}

export default function ImpactPanel({ expensesCount, totalVolume, isDemo }: Props) {
  const { t } = useI18n();

  // Conservative estimate: each traditional bank transfer costs ~0.50$ + 1%
  // Stellar costs ~$0.00005
  const tradCost = (expensesCount * 0.50) + (totalVolume * 0.01);
  const stellarCost = expensesCount * 0.00005;
  const saved = tradCost - stellarCost;

  // Mock data for the chart: progressive savings
  const chartData = useMemo(() => {
    const points = Math.max(5, expensesCount);
    return Array.from({ length: points }).map((_, i) => {
      const stepVolume = (totalVolume / points) * (i + 1);
      const stepExpenses = (expensesCount / points) * (i + 1);
      const currentTrad = (stepExpenses * 0.50) + (stepVolume * 0.01);
      const currentStellar = stepExpenses * 0.00005;
      
      return {
        name: `Exp ${i + 1}`,
        traditional: Number(currentTrad.toFixed(2)),
        stellar: Number(currentStellar.toFixed(2)),
      };
    });
  }, [expensesCount, totalVolume]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group shadow-2xl"
    >
      {/* Decorative pulse */}
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-400" />
              {t('group.impact_stats')}
              {isDemo && <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-300 border border-indigo-500/30 ml-2">DEMO</span>}
            </h3>
            <span className="text-2xl font-black text-foreground tracking-tight mt-1">
              ${saved.toFixed(2)} <span className="text-sm font-medium text-muted-foreground ml-1">saved</span>
            </span>
          </div>
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Zap size={20} className="text-indigo-400 animate-pulse" />
          </div>
        </div>

        {/* Hero Chart Section */}
        <div className="h-40 w-full mb-6 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorStellar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                } as React.CSSProperties}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="traditional" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTrad)" 
                name={t('group.chart_traditional')}
              />
              <Area 
                type="monotone" 
                dataKey="stellar" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorStellar)" 
                name={t('group.chart_stellar')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-green-400" />
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fee Efficiency</div>
            </div>
            <div className="text-xl font-black text-green-400">99.9%</div>
            <div className="text-[10px] text-muted-foreground mt-1 underline decoration-indigo-500/30 underline-offset-4 font-medium">Stellar Soroban</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-blue-400" />
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Finality</div>
            </div>
            <div className="text-xl font-black text-blue-400">~5s</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-medium">Instant Settlements</div>
          </div>
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-muted-foreground/60 italic flex items-center gap-2">
        <Info size={10} />
        {t('group.impact_desc')}
      </div>
    </motion.div>
  );
}
