import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';

export default function GlobalImpact() {
  const { t } = useI18n();
  const [impact, setImpact] = useState({
    totalSaved: 12450.45,
    txReduced: 48293,
    activeGroups: 1204,
    co2Saved: 85.2, // kg
  });

  useEffect(() => {
    // Simulate real-time impact growth
    const interval = setInterval(() => {
      setImpact(prev => ({
        ...prev,
        totalSaved: prev.totalSaved + Math.random() * 0.1,
        txReduced: prev.txReduced + (Math.random() > 0.9 ? 1 : 0),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl group-hover:scale-110 transition-transform duration-500">🌍</div>
      <div className="relative z-10">
        <h3 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2">
          🌍 {t('group.impact_stats')}
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          {t('impact.subtitle')}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">{t('impact.total_saved')}</div>
            <div className="text-xl font-black text-foreground font-mono">{impact.totalSaved.toFixed(2)} XLM</div>
          </div>
          <div className="p-4 bg-accent/5 border border-accent/10 rounded-xl">
            <div className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">{t('impact.tx_reduction')}</div>
            <div className="text-xl font-black text-foreground font-mono">%{((impact.txReduced / (impact.txReduced * 1.8)) * 100).toFixed(1)}</div>
          </div>
          <div className="p-4 bg-muted/50 border border-border rounded-xl">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('impact.active_groups')}</div>
            <div className="text-xl font-black text-foreground font-mono">{impact.activeGroups}</div>
          </div>
          <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
            <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">{t('impact.co2_saved')}</div>
            <div className="text-xl font-black text-foreground font-mono">{impact.co2Saved.toFixed(1)} kg</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground italic">
            {t('impact.disclaimer')}
          </div>
          <div className="flex gap-1">
             {[...Array(5)].map((_, i) => (
               <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
