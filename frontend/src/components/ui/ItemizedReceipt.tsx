import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Check, Users, X } from 'lucide-react';
import { type ScannedData } from '../../lib/ai';
import { maskAddress } from '../../lib/format';

interface Props {
  data: ScannedData;
  members: string[];
  currentUser: string;
  onConfirm: (assignedAmounts: Record<string, number>, total: number, description: string) => void;
  onCancel: () => void;
}

export function ItemizedReceipt({ data, members, currentUser, onConfirm, onCancel }: Props) {
  // Mapping of item index to the address of the member who claimed it.
  // If null, it's considered unassigned (will be split equally).
  const [assignments, setAssignments] = useState<Record<number, string | null>>({});

  const handleAssign = (index: number, member: string | null) => {
    setAssignments(prev => ({ ...prev, [index]: member }));
  };

  const calculateSplits = () => {
    const splits: Record<string, number> = {};
    members.forEach(m => splits[m] = 0);

    let unassignedTotal = 0;

    data.items.forEach((item, index) => {
      const assignee = assignments[index];
      if (assignee && splits[assignee] !== undefined) {
        splits[assignee] += item.amount;
      } else {
        unassignedTotal += item.amount;
      }
    });

    // Split unassigned equally
    if (unassignedTotal > 0 && members.length > 0) {
      const equalShare = unassignedTotal / members.length;
      members.forEach(m => {
        splits[m] += equalShare;
      });
    }

    return splits;
  };

  const handleSubmit = () => {
    const splits = calculateSplits();
    onConfirm(splits, data.totalAmount, data.merchant || 'Itemized Bill');
  };

  const splits = calculateSplits();

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black">{data.merchant || 'Receipt'}</h2>
              <p className="text-xs text-muted-foreground font-bold">{data.totalAmount} {data.currency || 'XLM'} Total</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-2">Tap to Claim Items</h3>
            {data.items.map((item, i) => {
              const assignee = assignments[i];
              return (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{item.description}</span>
                    <span className="font-mono text-sm text-indigo-300">{item.amount}</span>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    <button
                      onClick={() => handleAssign(i, null)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        !assignee ? 'bg-indigo-500 text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/15'
                      }`}
                    >
                      <Users size={12} className="inline mr-1 -mt-0.5" />
                      Split Equally
                    </button>
                    {members.map(m => (
                      <button
                        key={m}
                        onClick={() => handleAssign(i, m)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          assignee === m ? 'bg-emerald-500 text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/15'
                        }`}
                      >
                        {m === currentUser ? 'Me' : maskAddress(m)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Calculated Split</h3>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m} className="flex justify-between items-center text-sm">
                  <span className="font-bold text-white/80">{m === currentUser ? 'You' : maskAddress(m)}</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {splits[m].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-secondary/50">
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
          >
            <Check size={20} />
            Confirm AI Split
          </button>
        </div>
      </motion.div>
    </div>
  );
}
