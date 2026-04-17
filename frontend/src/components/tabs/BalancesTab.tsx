import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Receipt, Cpu, UserMinus, UserPlus, ArrowRight, Zap, HandCoins } from 'lucide-react';
import { type Group, type Settlement, type Expense } from '../../lib/contract';
import { truncateAddress } from '../../lib/stellar';
import { calculateKarma } from '../../lib/karma';
import { calculateBadges, type Badge } from '../../lib/badges';
import Avatar from '../Avatar';
import { DebtGraph } from '../DebtGraph';
import type { TranslationKey } from '../../lib/i18n';

export interface SettlementPlan {
  transfers: Array<{ fromUserId: string; toUserId: string; amount: number }>;
  totalTransfers: number;
  savedTransfers: number;
}

interface BalancesTabProps {
  group: Group;
  expenses: Expense[];
  settlements: Settlement[];
  balances: Map<string, number>;
  walletAddress: string;
  currencyLabel: string;
  showVisualGraph: boolean;
  setShowVisualGraph: (val: boolean) => void;
  removingMember: string | null;
  handleRemoveMember: (addr: string) => void;
  newMemberInput: string;
  setNewMemberInput: (val: string) => void;
  addingMember: boolean;
  handleAddMember: () => void;
  contacts: Record<string, string>;
  settlementPlan?: SettlementPlan;
  t: (key: TranslationKey) => string;
  onRequestPayment?: (memberAddress: string) => void;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

const BalancesTab = memo(function BalancesTab({
  group,
  expenses,
  settlements,
  balances,
  walletAddress,
  currencyLabel,
  showVisualGraph,
  setShowVisualGraph,
  removingMember,
  handleRemoveMember,
  newMemberInput,
  setNewMemberInput,
  addingMember,
  handleAddMember,
  contacts,
  settlementPlan,
  t,
  onRequestPayment,
}: BalancesTabProps) {
  const memberData = useMemo(
    () => group.members.map((member: string) => ({
      member,
      badges: calculateBadges(member, expenses),
      karma: calculateKarma(member, expenses, false),
    })),
    [group.members, expenses],
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <BarChart3 className="text-indigo-400" size={20} /> {t('group.net_balances')}
        </h3>
        <button 
          onClick={()=>setShowVisualGraph(!showVisualGraph)} 
          className="text-[10px] font-black uppercase tracking-widest bg-white/[0.04] px-4 py-2 rounded-xl border border-white/[0.07] hover:bg-white/[0.07] transition-all flex items-center gap-2"
        >
          {showVisualGraph ? <Receipt size={14} /> : <BarChart3 size={14} />}
          {showVisualGraph ? t('group.view_list') : t('group.visual_graph')}
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        {showVisualGraph ? (
          <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DebtGraph
              members={group.members}
              debts={settlements.map((s) => ({ from: s.from, to: s.to, amount: s.amount }))}
            />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
            {memberData.map(({ member, badges: bEarned, karma }) => {
              const balance = balances.get(member) || 0;
              const canRemove = group.members.length > 2;
              const isRemoving = removingMember === member;
              return (
                <div key={member} className="flex justify-between items-center px-5 py-4 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar address={member} size={32} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-tight">{truncateAddress(member)}</span>
                        <div className="flex items-center gap-1 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.08]">
                          <span className="text-[10px]">{karma.icon}</span>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${karma.color}`}>{karma.level}</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {bEarned.map((badge: Badge) => (
                          <span key={badge.id} title={badge.name} className="text-[10px] filter drop-shadow-sm cursor-help">{badge.icon}</span>
                        ))}
                      </div>
                      {member === walletAddress && <span className="inline-block mt-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase font-black">{t('group.insights_you_badge')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm tabular-nums ${
                      balance > 0
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : balance < 0
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : 'bg-white/[0.04] border border-white/[0.07] text-muted-foreground'
                    }`}>
                      {balance > 0 ? '+' : ''}{balance} <span className="text-[9px] opacity-50">{currencyLabel}</span>
                    </div>
                    {member !== walletAddress && onRequestPayment && (
                      <button
                        type="button"
                        onClick={() => onRequestPayment(member)}
                        className="p-2 rounded-xl text-indigo-400/80 hover:text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all"
                        title={t('pay_req.request_btn')}
                      >
                        <HandCoins size={16} />
                      </button>
                    )}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={isRemoving}
                        className="p-2 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50"
                        title={t('group.remove_member')}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="p-4 flex gap-2 items-center border-t border-white/5 relative overflow-visible">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t('group.new_member_placeholder')}
                  value={newMemberInput}
                  onChange={e => setNewMemberInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-indigo-500/40"
                />
                {newMemberInput.trim().length > 0 && 
                  Object.entries(contacts).filter(([addr, name]) => 
                    name.toLowerCase().includes(newMemberInput.toLowerCase()) || 
                    addr.toLowerCase().includes(newMemberInput.toLowerCase())
                  ).length > 0 && 
                  !group.members.includes(newMemberInput.trim()) && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                    {Object.entries(contacts)
                      .filter(([addr, name]) => 
                        (name.toLowerCase().includes(newMemberInput.toLowerCase()) || 
                        addr.toLowerCase().includes(newMemberInput.toLowerCase())) &&
                        !group.members.includes(addr)
                      )
                      .map(([addr, name]) => (
                         <button 
                           key={addr}
                           onClick={() => { setNewMemberInput(addr); }}
                           className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex flex-col border-b border-white/5 last:border-0"
                         >
                           <span className="font-bold text-sm text-indigo-100">{name}</span>
                           <span className="text-[10px] text-muted-foreground font-mono truncate">{addr}</span>
                         </button>
                      ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={addingMember || !newMemberInput.trim()}
                className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                title={t('group.add_member')}
              >
                <UserPlus size={18} />
                {addingMember ? '…' : t('group.add_member')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVars} className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 p-8 rounded-[40px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] group-hover:scale-125 transition-transform duration-1000" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <h4 className="font-black tracking-tight">{t('group.explain_title')}</h4>
          {settlementPlan && settlementPlan.savedTransfers > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Zap size={10} /> {t('group.saved_transfers').replace('{{n}}', String(settlementPlan.savedTransfers))}
            </span>
          )}
        </div>
        {settlementPlan && settlementPlan.transfers.length > 0 ? (
          <div className="space-y-2">
            {settlementPlan.transfers.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5">
                <span className="text-rose-400 font-black truncate max-w-[120px]" title={tx.fromUserId}>{truncateAddress(tx.fromUserId)}</span>
                <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="text-emerald-400 font-black truncate max-w-[120px]" title={tx.toUserId}>{truncateAddress(tx.toUserId)}</span>
                <span className="ml-auto text-indigo-300 font-black tabular-nums">{tx.amount} <span className="opacity-40 text-[9px]">{currencyLabel}</span></span>
              </div>
            ))}
          </div>
        ) : settlementPlan && settlementPlan.transfers.length === 0 ? (
          <p className="text-xs text-emerald-400 font-bold">{t('group.balances_all_settled')}</p>
        ) : (
          <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-[400px]">
            {t('group.algo_flow_hint')}
          </p>
        )}
      </motion.div>
    </div>
  );
});

export default BalancesTab;
