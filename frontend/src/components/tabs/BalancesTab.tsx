import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Receipt, Cpu, UserMinus, UserPlus } from 'lucide-react';
import { type Group, type Settlement, type Expense } from '../../lib/contract';
import { truncateAddress } from '../../lib/stellar';
import { calculateKarma } from '../../lib/karma';
import { calculateBadges, type Badge } from '../../lib/badges';
import Avatar from '../Avatar';
import { DebtGraph } from '../DebtGraph';
import type { TranslationKey } from '../../lib/i18n';

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
  t: (key: TranslationKey) => string;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default function BalancesTab({
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
  t
}: BalancesTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <BarChart3 className="text-indigo-400" size={20} /> {t('group.net_balances')}
        </h3>
        <button 
          onClick={()=>setShowVisualGraph(!showVisualGraph)} 
          className="text-[10px] font-black uppercase tracking-widest bg-secondary px-4 py-2 rounded-xl border border-white/5 hover:border-white/10 transition-all flex items-center gap-2"
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
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-secondary/20 border border-white/5 rounded-[32px] overflow-hidden divide-y divide-white/5">
            {group.members.map((member: string) => {
              const balance = balances.get(member) || 0;
              const bEarned = calculateBadges(member, expenses);
              const karma = calculateKarma(member, expenses, false);
              const canRemove = group.members.length > 2;
              const isRemoving = removingMember === member;
              return (
                <div key={member} className="flex justify-between items-center p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar address={member} size={32} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-tight">{truncateAddress(member)}</span>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          <span className="text-[10px]">{karma.icon}</span>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${karma.color}`}>{karma.level}</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {bEarned.map((badge: Badge) => (
                          <span key={badge.id} title={badge.name} className="text-[10px] filter drop-shadow-sm cursor-help">{badge.icon}</span>
                        ))}
                      </div>
                      {member === walletAddress && <span className="inline-block mt-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase font-black">You</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-mono font-black text-base tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {balance > 0 ? '+' : ''}{balance} <span className="text-[10px] opacity-40 ml-1">{currencyLabel}</span>
                    </div>
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
                  className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-indigo-500/50"
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <h4 className="font-black tracking-tight">{t('group.explain_title')}</h4>
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-[400px]">
          The settlement algorithm has compressed potential debt flows to <span className="text-indigo-400 font-bold">{settlements.length} {settlements.length === 1 ? 'transaction' : 'transactions'}</span> through graph optimization.
        </p>
      </motion.div>
    </div>
  );
}
