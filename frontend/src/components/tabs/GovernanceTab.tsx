import { motion } from 'framer-motion';
import { Users, Plus } from 'lucide-react';
import { type Group } from '../../lib/contract';
import { type Proposal, calculateProposalMetrics } from '../../lib/governance';

interface GovernanceTabProps {
  group: Group;
  proposals: Proposal[];
  walletAddress: string;
  setShowAddPropose: (val: boolean) => void;
  handleVote: (proposalId: number, vote: 'yes' | 'no') => void;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default function GovernanceTab({
  group,
  walletAddress,
  proposals,
  setShowAddPropose,
  handleVote
}: GovernanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg tracking-tight">Grup Kararları</h3>
        <button 
          onClick={() => setShowAddPropose(true)} 
          className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 hover:scale-110 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {proposals.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="py-20 text-center bg-secondary/20 rounded-[32px] border border-dashed border-white/5 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Users className="w-16 h-16 mx-auto text-indigo-500/20 mb-6" />
          </motion.div>
          <p className="text-lg font-black text-white/90 tracking-tight">Oylama Yok</p>
          <p className="text-sm font-bold text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed">Şu anda onay bekleyen aktif bir grup kararı bulunmuyor.</p>
        </motion.div>
      )}

      <div className="space-y-4">
        {proposals.map(p => {
          const metrics = calculateProposalMetrics(p, group.members.length);
          const hasVoted = !!p.votes[walletAddress];
          return (
            <motion.div key={p.id} variants={itemVars} className="bg-card border border-white/5 p-6 rounded-[32px] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-base tracking-tight">{p.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                  {p.status}
                </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                   <span>Onay Oranı</span>
                   <span>%{metrics.yesPercent.toFixed(1)} / %{p.threshold}</span>
                 </div>
                 <div className="h-2 bg-secondary rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${metrics.yesPercent}%` }} />
                 </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleVote(Number(p.id), 'yes')}
                  disabled={hasVoted}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${p.votes[walletAddress] === 'yes' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-muted-foreground hover:bg-emerald-500/10'}`}
                >
                  Evet {p.votes[walletAddress] === 'yes' && '✓'}
                </button>
                <button 
                  onClick={() => handleVote(Number(p.id), 'no')}
                  disabled={hasVoted}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${p.votes[walletAddress] === 'no' ? 'bg-rose-500 text-white' : 'bg-white/5 text-muted-foreground hover:bg-rose-500/10'}`}
                >
                  Hayır {p.votes[walletAddress] === 'no' && '✓'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
