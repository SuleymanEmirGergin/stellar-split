import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Award, Zap, Shield, Users, Rocket, Cpu, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { mintSBT, isBadgeMinted } from '../lib/sbt';

interface Badge {
  id: number;
  name: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  desc: string;
  badgeId: string; // Map to lib/badges.ts IDs
}

const ALL_BADGES: Badge[] = [
  { id: 1, badgeId: 'loyal_payer', name: 'Sadık Ödeyen', icon: Rocket, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'İlk grubunu oluştur' },
  { id: 2, badgeId: 'frugal', name: 'Tasarruf Ustası', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: '%20 tasarruf sağla' },
  { id: 3, badgeId: 'settle_master', name: 'Güvenilir Üye', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: 'Tüm borçlarını zamanında kapat' },
  { id: 4, badgeId: 'ai_explorer', name: 'Sosyal Kelebek', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: '5 farklı gruba katıl' },
  { id: 5, badgeId: 'flash', name: 'The Flash', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: '1 saat içinde ödeme yap' },
  { id: 6, badgeId: 'vault-master', name: 'Vault Master', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: '3 biriktirme hedefine katıl' },
  { id: 7, badgeId: 'builder', name: 'Geliştirici', icon: Cpu, color: 'text-indigo-400', bg: 'bg-indigo-500/10', desc: '5 arkadaşını davet et' },
];

export const Badges: React.FC<{ ownedIds: number[], onOpenVault: () => void }> = ({ ownedIds, onOpenVault }) => {
  const [mintingId, setMintingId] = useState<number | null>(null);

  const handleMint = async (e: React.MouseEvent, badge: Badge) => {
    e.stopPropagation();
    setMintingId(badge.id);
    try {
      // Mapping local badge info to the SBT structure
      await mintSBT({ 
        id: badge.badgeId, 
        name: badge.name, 
        description: badge.desc, 
        icon: '💎', 
        color: '' 
      }, 'dummy_address'); 
    } finally {
      setMintingId(null);
    }
  };

  return (
    <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
            <Award size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              Koleksiyonun
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] uppercase tracking-widest rounded-full border border-purple-500/30">Soulbound NFT</span>
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {ownedIds.length} / {ALL_BADGES.length} Rozet Açıldı
            </p>
          </div>
        </div>
        
        <button 
          onClick={onOpenVault}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
        >
          Soulbound Vault <Cpu size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ALL_BADGES.map((badge, i) => {
          const isOwned = ownedIds.includes(badge.id);
          const isMinted = isBadgeMinted(badge.badgeId);
          const isCurrentlyMinting = mintingId === badge.id;

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 group relative transition-all duration-500 overflow-hidden ${
                isOwned 
                  ? `${badge.bg} border-${badge.color.split('-')[1]}-500/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/5 opacity-100` 
                  : 'bg-white/5 border-transparent opacity-40 grayscale'
              }`}
            >
              {isOwned && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <div className={`p-2 rounded-lg ${isOwned ? badge.color : 'text-slate-500'} group-hover:scale-110 transition-transform`}>
                <badge.icon size={24} />
              </div>
              <div>
                <div className={`text-xs font-bold ${isOwned ? 'text-white' : 'text-slate-500'}`}>
                  {badge.name}
                </div>
                <div className="text-[8px] text-muted-foreground mt-0.5 leading-tight font-medium">
                  {badge.desc}
                </div>
              </div>

              {isOwned && (
                <div className="mt-2 w-full">
                  {isMinted ? (
                    <div className="text-[8px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 size={10} /> On-Chain
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => handleMint(e, badge)}
                      disabled={isCurrentlyMinting}
                      className="w-full py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-[8px] font-black uppercase tracking-widest text-indigo-300 transition-all flex items-center justify-center gap-1"
                    >
                      {isCurrentlyMinting ? 'Minting...' : 'Mint SBT'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
