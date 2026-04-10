import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, AlertCircle, Plus, ChevronRight } from 'lucide-react';

export const RecurringSplits: React.FC = () => {
  const recurring = [
    { title: 'Office Rent', amount: 1200, period: 'Monthly', next: '2026-04-01' },
    { title: 'Internet Service', amount: 45, period: 'Monthly', next: '2026-03-15' },
    { title: 'SaaS Subscription', amount: 200, period: 'Annually', next: '2027-01-10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Clock className="text-indigo-400" /> Scheduled Splits
        </h3>
        <button className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {recurring.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group flex items-center justify-between p-4 bg-card border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar size={20} className="text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{item.title}</h4>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                  {item.period} · Next: {item.next}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono font-bold text-sm">{item.amount} XLM</div>
                <div className="text-[9px] text-emerald-400 font-bold">Auto-approved</div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}

        {recurring.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
            <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No recurring splits scheduled yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
