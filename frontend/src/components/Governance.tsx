import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Vote, 
  ShieldCheck, 
  Award, 
  Clock, 
  ArrowLeft,
  MessageSquare,
  BarChart3,
  Rocket,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { MOCK_PROPOSALS, calculateSocialCredit, type Proposal } from '../lib/dao';

interface Props {
  onBack: () => void;
}

export function Governance({ onBack }: Props) {
  
  // Real stats for power calculation
  const karma = 145; // Mock actual user karma
  const creditProfile = useMemo(() => {
    const mockBadges = [{}, {}, {}]; // Mock 3 badges
    return calculateSocialCredit(karma, mockBadges as Parameters<typeof calculateSocialCredit>[1]);
  }, [karma]);

  const [filter, setFilter] = useState<'Active' | 'Passed' | 'All'>('Active');
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const filteredProposals = MOCK_PROPOSALS.filter(p => {
    if (filter === 'All') return true;
    return p.status === filter;
  });

  const handleVote = (id: string, choice: 'yes' | 'no') => {
    setVotedIds(prev => new Set(prev).add(id));
    // In a real app, this would be a Soroban transaction
    console.log(`Voted ${choice} on ${id}`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Breadcrumb */}
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
            DAO Governance
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest font-black border border-indigo-500/20">Active Epoch</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-card/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Voting Power</div>
            <div className="text-xl font-black text-indigo-400 font-mono">{creditProfile.votingPower} <span className="text-[10px] text-white/40">VP</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Vote size={20} />
          </div>
        </div>
      </div>

      {/* Social Credit Tier Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Award size={80} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
              <ShieldCheck size={14} />
              Social Credit
            </h3>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black tracking-tight">{creditProfile.tier}</span>
                <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-md">Tier 2/5</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">Progress to Gold</span>
                  <span>{Math.round(creditProfile.nextTierProgress)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${creditProfile.nextTierProgress}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">My Benefits</p>
                {creditProfile.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-white/80">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Governance Tips</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1"><Rocket size={14} className="text-purple-400" /></div>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">Voting early increases your "Early Settlement" karma potential by 5%.</p>
              </div>
              <div className="flex gap-3">
                <div className="mt-1"><BarChart3 size={14} className="text-emerald-400" /></div>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">Delegation to reputable agents is coming next epoch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Proposals List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl border border-white/5">
              {(['Active', 'Passed', 'All'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filter === f ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search Proposals..." 
                className="bg-secondary/30 border border-white/5 pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-500/50 transition-all w-48"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredProposals.map((p) => (
              <ProposalCard 
                key={p.id} 
                proposal={p} 
                hasVoted={votedIds.has(p.id)}
                onVote={(choice) => handleVote(p.id, choice)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, hasVoted, onVote }: { proposal: Proposal, hasVoted: boolean, onVote: (c: 'yes' | 'no') => void }) {
  const totalVotes = proposal.voteCount.yes + proposal.voteCount.no + proposal.voteCount.abstain;
  const yesPercent = Math.round((proposal.voteCount.yes / totalVotes) * 100);
  const noPercent = Math.round((proposal.voteCount.no / totalVotes) * 100);

  return (
    <motion.div 
      layout
      className="bg-card/60 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors backdrop-blur-lg"
    >
      <div className="p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                proposal.category === 'Rule' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                proposal.category === 'Finance' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {proposal.category}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Clock size={10} /> {proposal.status === 'Active' ? '2 days remaining' : 'Closed'}
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{proposal.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {proposal.description}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Proposer</div>
            <div className="text-xs font-mono font-bold bg-white/5 px-2 py-1 rounded-lg">{proposal.proposer}</div>
          </div>
        </div>

        {/* Vote Results Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-emerald-400">Yes ({yesPercent}%)</span>
            <span className="text-red-400">No ({noPercent}%)</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
            <div style={{ width: `${yesPercent}%` }} className="h-full bg-emerald-500/60" />
            <div style={{ width: `${noPercent}%` }} className="h-full bg-red-500/60" />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
            <span>{totalVotes} Total Votes Cast</span>
            <span>Quorum: 2000 VP Required</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
              <MessageSquare size={14} /> 12 Comments
            </button>
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
              <HelpCircle size={14} /> Full Spec
            </button>
          </div>

          <div className="flex items-center gap-3">
            {proposal.status === 'Active' ? (
              hasVoted ? (
                <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-400 rounded-2xl text-xs font-black border border-emerald-500/20">
                  <CheckCircle2 size={16} /> Vote Cast
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => onVote('no')}
                    className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-xs font-black border border-red-500/20 transition-all flex items-center gap-2"
                  >
                    <XCircle size={16} /> Vote No
                  </button>
                  <button 
                    onClick={() => onVote('yes')}
                    className="px-8 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Vote Yes
                  </button>
                </>
              )
            ) : (
              <div className="px-6 py-3 bg-white/5 text-muted-foreground rounded-2xl text-xs font-black border border-white/5 flex items-center gap-2 opacity-60">
                <Clock size={16} /> Voting Ended
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
