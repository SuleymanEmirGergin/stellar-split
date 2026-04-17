import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, 
  Loader2, 
  CheckCircle2, 
  Globe, 
  Zap, 
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { useToast } from './Toast';

type BridgeStatus = 'idle' | 'approving' | 'transferring' | 'vaa_waiting' | 'redeeming' | 'completed' | 'error';

interface Chain {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CHAINS: Chain[] = [
  { id: 'stellar', name: 'Stellar (Soroban)', icon: '✨', color: 'bg-indigo-500' },
  { id: 'ethereum', name: 'Ethereum (Sepolia)', icon: '⟠', color: 'bg-blue-600' },
  { id: 'solana', name: 'Solana (Devnet)', icon: '◎', color: 'bg-purple-500' },
  { id: 'base', name: 'Base (Goerli)', icon: '🔵', color: 'bg-blue-400' },
];

export const BridgeDemo: React.FC = () => {
  const [status, setStatus] = useState<BridgeStatus>('idle');
  const [amount, setAmount] = useState('100');
  const [sourceChain] = useState(CHAINS[0]);
  const [destChain, setDestChain] = useState(CHAINS[1]);
  const toast = useToast();
  const addToast = toast.addToast;

  const handleBridge = async () => {
    if (status !== 'idle') return;
    
    setStatus('approving');
    await new Promise(r => setTimeout(r, 1500));
    
    setStatus('transferring');
    await new Promise(r => setTimeout(r, 2000));
    
    setStatus('vaa_waiting');
    await new Promise(r => setTimeout(r, 2500));
    
    setStatus('redeeming');
    await new Promise(r => setTimeout(r, 2000));
    
    setStatus('completed');
    addToast("Cross-chain transfer completed! 🚀", "success");
  };

  const reset = () => setStatus('idle');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <ArrowRightLeft className="text-indigo-500" size={32} />
          Cross-Chain Bridge <span className="text-sm font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg uppercase tracking-widest ml-2 border border-indigo-500/20">Alpha Demo</span>
        </h2>
        <p className="text-muted-foreground mt-2 font-medium">
          Wormhole SDK kullanarak Stellar varlıklarını diğer ağlara taşıyın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Globe size={120} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4 relative z-10">
              {/* Source */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Source Chain</label>
                <div className="bg-secondary/50 border border-white/5 p-4 rounded-3xl flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${sourceChain.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {sourceChain.icon}
                  </div>
                  <div>
                    <div className="text-sm font-black">{sourceChain.name}</div>
                    <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Connected</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                  <ArrowRight size={20} className="text-white" />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Destination Chain</label>
                <select 
                  value={destChain.id}
                  onChange={(e) => setDestChain(CHAINS.find(c => c.id === e.target.value) || CHAINS[1])}
                  className="w-full bg-secondary/50 border border-white/5 p-4 rounded-3xl flex items-center gap-4 outline-none focus:border-indigo-500/50 transition-all cursor-pointer font-bold text-sm"
                >
                  {CHAINS.slice(1).map(c => (
                    <option key={c.id} value={c.id} className="bg-card text-foreground">{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-secondary/30 rounded-3xl p-6 border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Send Amount</label>
                  <span className="text-[10px] font-bold text-indigo-400">Balance: 1250 XLM</span>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-4xl font-black outline-none w-full tracking-tighter"
                    placeholder="0.00"
                  />
                  <div className="bg-white/5 px-4 py-2 rounded-2xl font-black text-sm border border-white/5">XLM</div>
                </div>
              </div>

              <button 
                onClick={handleBridge}
                disabled={status !== 'idle'}
                className={`w-full py-5 rounded-3xl font-black text-lg transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                  status === 'idle' 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                    : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                {status === 'idle' ? (
                  <>
                    <Zap size={20} fill="currentColor" />
                    Bridge Now
                  </>
                ) : (
                  <>
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                    Processing...
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Visualization */}
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em]">Bridge Lifecycle</h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <ShieldCheck size={14} />
                    Secured by Wormhole Guardians
                  </div>
                </div>

                <div className="relative">
                  {/* Connector Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5" />
                  
                  <div className="space-y-10 relative">
                    <StatusStep 
                      active={status === 'approving'} 
                      done={['transferring', 'vaa_waiting', 'redeeming', 'completed'].includes(status)} 
                      title="Wallet Approval" 
                      subtitle="Confirming Soroban contract interaction..." 
                    />
                    <StatusStep 
                      active={status === 'transferring'} 
                      done={['vaa_waiting', 'redeeming', 'completed'].includes(status)} 
                      title="Locking on Stellar"
                      subtitle="Funds committed to vault on Soroban Testnet."
                    />
                    <StatusStep 
                      active={status === 'vaa_waiting'} 
                      done={['redeeming', 'completed'].includes(status)} 
                      title="Wormhole Guardian Network"
                      subtitle="Waiting for 13/19 guardian signatures (VAA)..."
                    />
                    <StatusStep 
                      active={status === 'redeeming'} 
                      done={status === 'completed'} 
                      title={`Minting on ${destChain.name}`}
                      subtitle="Redeeming VAA signed package on target chain."
                    />
                  </div>
                </div>

                {status === 'completed' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-6 border-t border-white/5 flex flex-col items-center text-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <div className="text-xl font-black">Transfer Successful!</div>
                      <p className="text-sm text-muted-foreground mt-1">Varlıklar başarıyla köprülendi.</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
                        <ExternalLink size={14} />
                        View on Wormholescan
                      </button>
                      <button onClick={reset} className="px-6 py-2 bg-indigo-600 rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none">
                        New Bridge
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-6 text-indigo-300">
            <h5 className="font-black flex items-center gap-2 mb-3">
              <Info size={18} />
              Biliyor muydunuz?
            </h5>
            <p className="text-xs font-medium leading-relaxed">
              Soroban'ın yüksek hızı ve Wormhole'un 30'dan fazla zinciri birbirine bağlayan yapısı sayesinde, ödemelerinizi dilediğiniz ekosisteme taşıyabilirsiniz.
            </p>
          </div>

          <div className="bg-card/40 border border-white/5 rounded-[2rem] p-6">
            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Bridge Stats</h5>
            <div className="space-y-4">
              <StatRow label="Network Fee" value="~0.00001 XLM" />
              <StatRow label="Guardian Confirmations" value="19/19 Required" />
              <StatRow label="Estimated Time" value="~2 Minutes" />
              <StatRow label="Protocol" value="Wormhole NTT" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusStep: React.FC<{ active: boolean; done: boolean; title: string, subtitle: string }> = ({ active, done, title, subtitle }) => (
  <div className="flex gap-6 items-start group">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-500 ${
      done ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
      active ? 'bg-indigo-500 animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 
      'bg-secondary border border-white/5'
    }`}>
      {done ? <CheckCircle2 size={24} className="text-white" /> : 
       active ? <Loader2 size={24} className="animate-spin text-white" /> : 
       <div className="w-2 h-2 rounded-full bg-slate-600" />}
    </div>
    <div className="pt-1">
      <div className={`text-sm font-black transition-colors ${done ? 'text-white' : active ? 'text-indigo-400' : 'text-slate-500'}`}>
        {title}
      </div>
      <div className="text-[10px] text-muted-foreground font-medium mt-1">
        {subtitle}
      </div>
    </div>
  </div>
);

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-[10px] font-bold">
    <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className="text-white">{value}</span>
  </div>
);
