import { motion } from 'framer-motion';
import { Users, Plus, AlertTriangle } from 'lucide-react';
import { type Group } from '../../lib/contract';
import { type Proposal, type Dispute, type DisputeVoteOption, calculateProposalMetrics } from '../../lib/governance';
import type { TranslationKey } from '../../lib/i18n';

interface GovernanceTabProps {
  group: Group;
  proposals: Proposal[];
  disputes: Dispute[];
  walletAddress: string;
  setShowAddPropose: (val: boolean) => void;
  handleVote: (proposalId: string, vote: 'yes' | 'no') => void;
  handleVoteDispute: (disputeId: string, option: DisputeVoteOption) => void;
  t: (key: TranslationKey) => string;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'passed': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'rejected': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default: return 'bg-white/[0.04] text-muted-foreground border border-white/[0.08]';
  }
}

function disputeStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'dismissed': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default: return 'bg-white/[0.04] text-muted-foreground border border-white/[0.08]';
  }
}

function proposalStatusLabel(status: string, t: (key: TranslationKey) => string): string {
  if (status === 'active') return t('group.status_active');
  if (status === 'passed') return t('group.status_passed');
  if (status === 'rejected') return t('group.status_rejected');
  return status;
}

function disputeStatusLabel(status: string, t: (key: TranslationKey) => string): string {
  if (status === 'open') return t('group.dispute_status_open');
  if (status === 'resolved') return t('group.dispute_status_resolved');
  if (status === 'dismissed') return t('group.dispute_status_dismissed');
  return status;
}

export default function GovernanceTab({
  group,
  walletAddress,
  proposals,
  disputes,
  setShowAddPropose,
  handleVote,
  handleVoteDispute,
  t,
}: GovernanceTabProps) {
  return (
    <div className="space-y-8">
      {/* ── Proposals ── */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <h3 className="font-black text-lg tracking-tight">{t('group.governance_title')}</h3>
          </div>
          <button
            data-testid="add-proposal-btn"
            onClick={() => setShowAddPropose(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl w-10 h-10 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:-translate-y-px transition-all"
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
            <p className="text-lg font-black text-white/90 tracking-tight">{t('group.governance_empty')}</p>
            <p className="text-sm font-bold text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed">{t('group.governance_empty_desc')}</p>
          </motion.div>
        )}

        <div className="space-y-4">
          {proposals.map(p => {
            const metrics = calculateProposalMetrics(p, group.members.length);
            const hasVoted = !!p.votes[walletAddress];
            const canVote = p.status === 'active' && !hasVoted;
            return (
              <motion.div
                key={p.id}
                variants={itemVars}
                data-testid="proposal-card"
                className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="font-bold text-base tracking-tight">{p.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                  <div className={`shrink-0 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${statusBadgeClass(p.status)}`}>
                    {proposalStatusLabel(p.status, t)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>{t('group.governance_approval')}</span>
                    <span>%{metrics.yesPercent.toFixed(1)} / %{p.threshold}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.yesPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    data-testid="vote-yes-btn"
                    onClick={() => handleVote(p.id, 'yes')}
                    disabled={!canVote}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${p.votes[walletAddress] === 'yes' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                  >
                    {t('group.vote_yes')} {p.votes[walletAddress] === 'yes' && '✓'}
                  </button>
                  <button
                    data-testid="vote-no-btn"
                    onClick={() => handleVote(p.id, 'no')}
                    disabled={!canVote}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${p.votes[walletAddress] === 'no' ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
                  >
                    {t('group.vote_no')} {p.votes[walletAddress] === 'no' && '✓'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Disputes ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <h3 className="font-black text-lg tracking-tight">{t('group.disputes_title')}</h3>
        </div>

        {disputes.length === 0 ? (
          <div className="py-10 text-center bg-secondary/20 rounded-[32px] border border-dashed border-white/5">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">{t('group.disputes_empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map(d => {
              const hasVoted = !!d.votes[walletAddress];
              const canVote = d.status === 'open' && !hasVoted;
              const totalVotes = Object.keys(d.votes).length;
              const upholdCount = Object.values(d.votes).filter(v => v === 'uphold').length;
              const upholdPct = totalVotes > 0 ? Math.round((upholdCount / totalVotes) * 100) : 0;

              return (
                <motion.div
                  key={d.id}
                  variants={itemVars}
                  data-testid="dispute-card"
                  className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-bold text-sm tracking-tight truncate">{d.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {d.category} · {d.amount} XLM
                      </p>
                    </div>
                    <div className={`shrink-0 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${disputeStatusBadgeClass(d.status)}`}>
                      {disputeStatusLabel(d.status, t)}
                    </div>
                  </div>

                  {totalVotes > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>{t('group.dispute_uphold')}</span>
                        <span>%{upholdPct}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${upholdPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      data-testid="dispute-uphold-btn"
                      onClick={() => handleVoteDispute(d.id, 'uphold')}
                      disabled={!canVote}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${d.votes[walletAddress] === 'uphold' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                    >
                      {t('group.dispute_uphold')} {d.votes[walletAddress] === 'uphold' && '✓'}
                    </button>
                    <button
                      data-testid="dispute-dismiss-btn"
                      onClick={() => handleVoteDispute(d.id, 'dismiss')}
                      disabled={!canVote}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${d.votes[walletAddress] === 'dismiss' ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
                    >
                      {t('group.dispute_dismiss')} {d.votes[walletAddress] === 'dismiss' && '✓'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
