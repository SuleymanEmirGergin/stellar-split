import { motion } from 'framer-motion';
import { X, Cpu, Wallet, Network, ArrowRight } from 'lucide-react';
import { maskAddress } from '../lib/format';

interface Props {
  transactionHash: string;
  sourceAmount: number;
  sourceCurrency: string;
  members: string[];
  totalFee: number;
  onClose: () => void;
}

export function ContractVisualizer({ transactionHash, sourceAmount, sourceCurrency, members, totalFee, onClose }: Props) {
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.3 } }
  };

  const nodeVars = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  const lineVars = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1, transition: { duration: 1 } }
  };

  const splitAmount = ((sourceAmount - totalFee) / Math.max(1, members.length)).toFixed(2);

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col justify-center items-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
      >
        <X size={24} className="text-white" />
      </button>

      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest mb-4">
          <Network size={14} /> Soroban Smart Contract Execution
        </div>
        <h2 className="text-3xl font-black text-white">Trustless Settlement Flow</h2>
        <div className="text-muted-foreground font-mono text-xs mt-2 bg-white/5 inline-block px-3 py-1 rounded-lg">
          Tx: {transactionHash}
        </div>
      </div>

      <div className="w-full max-w-4xl relative overflow-x-auto pb-12">
        <motion.div 
          className="min-w-[800px] h-[400px] relative mx-auto"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          {/* Animated SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Wallet to Contract */}
            <motion.path 
              d="M 150 200 Q 250 200 350 200" 
              stroke="url(#flow-grad)" 
              strokeWidth="4" 
              fill="none" 
              variants={lineVars} 
              strokeDasharray="8 8"
              className="animate-[dash_1s_linear_infinite]"
            />
            {/* Contract to Fee Pool */}
            <motion.path 
              d="M 450 200 Q 550 200 650 100" 
              stroke="#fbbf24" 
              strokeWidth="3" 
              fill="none" 
              variants={lineVars} 
              strokeDasharray="4 4"
            />
            {/* Contract to Members */}
            {members.slice(0, 4).map((_, i) => {
              const yOffset = 180 + (i * 80);
              return (
                <motion.path 
                  key={i}
                  d={`M 450 200 Q 550 ${yOffset} 650 ${yOffset}`} 
                  stroke="#34d399" 
                  strokeWidth="3" 
                  fill="none" 
                  variants={lineVars} 
                />
              );
            })}
          </svg>

          {/* Nodes Layer */}
          <div className="absolute inset-0 z-10 flex">
            {/* 1. Source Node */}
            <div className="w-1/3 flex items-center justify-start pl-[50px]">
              <motion.div variants={nodeVars} className="bg-slate-900 border-2 border-indigo-500/30 rounded-2xl p-4 w-40 text-center shadow-xl shadow-indigo-500/20">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 mx-auto flex items-center justify-center mb-2">
                  <Wallet className="text-indigo-400" size={20} />
                </div>
                <div className="text-white font-black text-lg">{sourceAmount} {sourceCurrency}</div>
                <div className="text-muted-foreground text-xs font-bold uppercase mt-1">Source Wallet</div>
              </motion.div>
            </div>

            {/* 2. Contract Node */}
            <div className="w-1/3 flex items-center justify-center">
              <motion.div variants={nodeVars} className="bg-indigo-900 border-2 border-purple-500 rounded-3xl p-6 w-48 text-center shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                <div className="w-12 h-12 rounded-xl bg-purple-500 mx-auto flex items-center justify-center mb-3">
                  <Cpu className="text-white animate-pulse" size={24} />
                </div>
                <div className="text-white font-black">Birik</div>
                <div className="text-purple-200 text-xs font-bold uppercase mt-1 tracking-widest">Router Program</div>
              </motion.div>
            </div>

            {/* 3. Destination Nodes */}
            <div className="w-1/3 flex flex-col justify-center gap-4 pr-[50px] relative">
              {/* Fee Routing */}
              <motion.div variants={nodeVars} className="absolute top-[40px] right-[50px] bg-slate-900 border border-amber-500/30 rounded-xl p-3 w-40 flex items-center justify-between text-left">
                <div>
                  <div className="text-amber-400 font-black text-sm">{totalFee} XLM</div>
                  <div className="text-muted-foreground text-[10px] uppercase font-bold">Network Fee</div>
                </div>
                <ArrowRight size={14} className="text-amber-600" />
              </motion.div>

              {/* User Payouts */}
              {members.slice(0, 4).map((m, i) => (
                <motion.div key={i} variants={nodeVars} className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 w-48 ml-auto flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Wallet className="text-emerald-400" size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-black text-sm">{splitAmount} {sourceCurrency}</div>
                    <div className="text-muted-foreground text-[10px] font-mono truncate">{maskAddress(m)}</div>
                  </div>
                </motion.div>
              ))}
              {members.length > 4 && (
                <motion.div variants={nodeVars} className="text-center text-xs font-bold text-muted-foreground py-2 mr-10">
                  + {members.length - 4} more addresses
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
