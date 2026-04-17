import React from 'react';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardUser {
  address: string;
  name: string;
  score: number;
  rank: number;
}

const MOCK_LEADERBOARD: LeaderboardUser[] = [
  { address: 'GDJJ...PXVK', name: 'Süleyman', score: 1250, rank: 1 },
  { address: 'GBRP...OX2H', name: 'Emir', score: 1100, rank: 2 },
  { address: 'GAV2...DEMO', name: 'Zeynep', score: 950, rank: 3 },
  { address: 'GBR3...DEMO', name: 'Can', score: 800, rank: 4 },
];

export const Leaderboard: React.FC = () => {
  return (
    <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-400" size={20} />
            Liderler Tablosu
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
            Haftalık Tasarruf Puanı
          </p>
        </div>
        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
          <TrendingUp size={18} />
        </div>
      </div>

      <div className="space-y-3">
        {MOCK_LEADERBOARD.map((user, i) => (
          <motion.div
            key={user.address}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
              i === 0 
                ? 'bg-amber-500/10 border-amber-500/20' 
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                i === 0 ? 'bg-amber-500 text-black' :
                i === 1 ? 'bg-slate-400 text-black' :
                i === 2 ? 'bg-amber-700 text-white' : 'bg-secondary text-muted-foreground'
              }`}>
                {i < 3 ? <Medal size={14} /> : user.rank}
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-none">{user.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">{user.address}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-indigo-400 flex items-center gap-1">
                {user.score}
                <Star size={12} fill="currentColor" />
              </div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase">Puan</div>
            </div>
          </motion.div>
        ))}
      </div>

      <button className="w-full mt-6 py-3 bg-secondary/50 hover:bg-secondary transition-colors rounded-xl text-xs font-bold text-muted-foreground border border-white/5">
        Tümünü Gör
      </button>
    </div>
  );
};
