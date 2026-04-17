import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  Target, 
  Zap, 
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { getVaultStats, toggleAutoInvest, type VaultStats } from '../lib/yield';

interface Props {
  walletAddress: string;
  onBack: () => void;
}

export function SmartVaults({ walletAddress, onBack }: Props) {
  const [stats, setStats] = useState<VaultStats>(getVaultStats());
  const [isAutoEnabled, setIsAutoEnabled] = useState(stats.autoInvestEnabled);

  const handleToggle = () => {
    const newState = !isAutoEnabled;
    setIsAutoEnabled(newState);
    toggleAutoInvest(newState);
    setStats(prev => ({ ...prev, autoInvestEnabled: newState }));
  };

  const progress = (stats.totalSaved / stats.savingsGoal) * 100;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-2"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Dashboard
          </button>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            Smart Vaults
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest font-black border border-emerald-500/20">AI Optimized</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-card/40 border border-white/5 p-2 rounded-2xl backdrop-blur-md">
           <div className="flex flex-col items-center justify-center px-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Auto-Invest</span>
              <button 
                onClick={handleToggle}
                className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isAutoEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <motion.div 
                  animate={{ x: isAutoEnabled ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-lg"
                />
              </button>
           </div>
           <div className="h-10 w-[1px] bg-white/5" />
           <div className="px-4 py-2 text-center">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Est. APY</div>
              <div className="text-sm font-black text-emerald-400">{stats.apy}%</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Totals & Goals */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 p-8 rounded-3xl relative overflow-hidden group">
             <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
               <Wallet size={160} />
             </div>
             
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300 mb-2">Total Savings</h3>
             <div className="flex items-baseline gap-2 mb-8">
               <span className="text-5xl font-black tracking-tighter">${stats.totalSaved.toFixed(2)}</span>
               <span className="text-emerald-400 text-xs font-black flex items-center gap-1">
                 <ArrowUpRight size={14} /> +12%
               </span>
             </div>

             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-white/60">
                    <span>Goal: New MacBook</span>
                    <span>${stats.totalSaved.toFixed(0)} / ${stats.savingsGoal}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
               </div>
               <button className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                 <PlusCircle size={16} /> Instant Deposit
               </button>
             </div>
          </div>

          <div className="bg-card/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap size={14} className="text-amber-400" /> AI Strategy
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-xs font-medium leading-relaxed text-white/80">
                  "Based on your 145 Karma, I've allocated funds to the <span className="text-emerald-400 font-bold">USDC/XLM Pool</span> for optimal yield stability."
                </p>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Risk Level</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Minimal (LP)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Activity */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md min-h-[400px]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Portfolio Performance</h3>
              <div className="flex gap-2">
                {['1W', '1M', '3M', '1Y'].map(t => (
                  <button key={t} className={`w-10 h-8 rounded-lg text-[10px] font-black transition-colors ${t === '1M' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-muted-foreground hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 border-b border-l border-white/5 relative flex items-end justify-between px-4 pb-4">
               {stats.history.map((h, i) => (
                 <div key={i} className="flex flex-col items-center gap-4 group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h.amount * 20}px` }}
                      className="w-12 bg-gradient-to-t from-emerald-500/10 to-emerald-500/60 rounded-t-xl group-hover:to-emerald-500 transition-all relative"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-white/10 px-2 py-1 rounded text-[10px] font-black whitespace-nowrap">
                        +${h.amount}
                      </div>
                    </motion.div>
                    <span className="text-[8px] font-black text-muted-foreground uppercase">{h.date.split('-').slice(1).join('/')}</span>
                 </div>
               ))}
               <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-white/5 pointer-events-none" />
            </div>
            
            <div className="mt-8 flex items-center justify-around gap-4 text-center">
               <div>
                 <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">Unrealized Yield</div>
                 <div className="text-xl font-black text-emerald-400 font-mono">+${stats.unrealizedYield}</div>
               </div>
               <div className="h-8 w-[1px] bg-white/5" />
               <div>
                 <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">Round-ups Count</div>
                 <div className="text-xl font-black font-mono">152</div>
               </div>
               <div className="h-8 w-[1px] bg-white/5" />
               <div>
                 <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">Protocol Efficiency</div>
                 <div className="text-xl font-black text-indigo-400 font-mono">99.8%</div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-white/5 p-6 rounded-3xl backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Insured Vaults</h4>
                  <p className="text-[10px] font-medium text-muted-foreground">Assets secured by Birik DAO.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-white/5 p-6 rounded-3xl backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Target size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Savings Goals</h4>
                  <p className="text-[10px] font-medium text-muted-foreground">Configure custom spending targets.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
