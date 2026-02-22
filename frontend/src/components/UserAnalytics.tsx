import { useQueries, useQuery } from '@tanstack/react-query';
import { getBalances, getVault, getBadges } from '../lib/contract';
import { groupKeys } from '../hooks/useGroupQuery';
import { Trophy, Sprout, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  walletAddress: string;
  groups: { id: number; currency?: string }[];
}

export default function UserAnalytics({ walletAddress, groups }: Props) {
  // Rozetler
  const { data: badges } = useQuery({
    queryKey: groupKeys.badges(walletAddress),
    queryFn: () => getBadges(walletAddress, walletAddress),
    enabled: !!walletAddress
  });

  // Tüm Grupların Kasaları
  const vaultQueries = useQueries({
    queries: groups.map(g => ({
      queryKey: groupKeys.vault(g.id),
      queryFn: () => getVault(walletAddress, g.id),
      enabled: !!walletAddress && !!g.id
    }))
  });

  // Tüm Grupların Bakiyeleri
  const balanceQueries = useQueries({
    queries: groups.map(g => ({
      queryKey: groupKeys.balances(g.id),
      queryFn: () => getBalances(walletAddress, g.id),
      enabled: !!walletAddress && !!g.id
    }))
  });

  const totalBadges = badges?.length || 0;
  
  const totalStaked = vaultQueries.reduce((acc, query) => {
    return acc + (query.data?.total_staked || 0);
  }, 0);

  const netBalance = balanceQueries.reduce((acc, query) => {
    // contract.ts'deki getBalances Map<string, number> dönüyor
    return acc + (query.data?.get(walletAddress) || 0);
  }, 0);

  return (
    <div id="user-analytics-panel" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Net Balance */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-colors"
      >
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <ArrowRightLeft size={16} className="text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Net Durum</span>
          </div>
          <div className="text-2xl font-black font-mono flex items-baseline gap-1">
            <span className={netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {netBalance > 0 ? '+' : ''}{netBalance.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">Birim</span>
          </div>
        </div>
      </motion.div>

      {/* DeFi Staked */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
      >
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Sprout size={16} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest">DeFi Kasa Payı</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-100 flex items-baseline gap-1">
            {totalStaked.toFixed(2)} <span className="text-xs text-muted-foreground">XLM</span>
          </div>
        </div>
      </motion.div>

      {/* NFT Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors"
      >
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-colors" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Rozetler</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-100 flex items-baseline gap-1">
            {totalBadges} <span className="text-xs text-muted-foreground">Oyunlaştırma</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
