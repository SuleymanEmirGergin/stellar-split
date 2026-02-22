import { motion } from 'framer-motion';
import { Plus, Repeat } from 'lucide-react';
import { type RecurringTemplate } from '../../lib/recurring';

interface RecurringTabProps {
  subscriptions: RecurringTemplate[];
  setShowAddSub: (val: boolean) => void;
}

export default function RecurringTab({
  subscriptions,
  setShowAddSub
}: RecurringTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg tracking-tight">Active Subscriptions</h3> 
        <button 
          onClick={()=>setShowAddSub(true)} 
          className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 hover:scale-110 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>
      {subscriptions.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="py-20 text-center bg-secondary/20 rounded-[32px] border border-dashed border-white/5 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Repeat className="w-16 h-16 mx-auto text-indigo-500/20 mb-6" />
          </motion.div>
          <p className="text-lg font-black text-white/90 tracking-tight">Abonelik Bulunmuyor</p>
          <p className="text-sm font-bold text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed">Grubunuzda henüz tekrarlayan bir ödeme planı yok.</p>
        </motion.div>
      )}
      <div className="space-y-3">
        {subscriptions.map((s: RecurringTemplate) => (
          <div key={s.id} className="bg-secondary/30 border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Repeat size={18} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight">{s.name}</div>
                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{s.interval}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-base">{s.amount} XLM</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
