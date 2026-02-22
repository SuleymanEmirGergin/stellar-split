import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Repeat } from 'lucide-react';
import { type RecurringTemplate, type Interval } from '../lib/recurring';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sub: Omit<RecurringTemplate, 'id' | 'createdAt'>) => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<Interval>('monthly');
  const [category, setCategory] = useState('entertainment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    onSave({
      name,
      amount: parseFloat(amount),
      interval,
      category,
      members: [], // Template for the whole group
    });
    setName('');
    setAmount('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Repeat className="text-indigo-500" /> Yeni Abonelik
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Hizmet Adı</label>
                <div className="group relative">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Netflix, Spotify, Kira..."
                    className="w-full bg-secondary/50 border border-border group-focus-within:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-bold transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Miktar (XLM)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-mono font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Periyot</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as Interval)}
                    className="w-full bg-secondary/50 border border-border focus:border-indigo-500/50 rounded-2xl py-4 px-5 outline-none font-bold transition-all appearance-none"
                  >
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {['entertainment', 'home', 'services', 'other'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        category === cat ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-secondary/50 border-border text-muted-foreground hover:border-indigo-500/30'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Check size={20} /> Aboneliği Başlat
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
