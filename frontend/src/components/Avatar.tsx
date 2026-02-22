import { useState, useEffect } from 'react';
import { addressBook } from '../lib/contacts';
import { useBadges } from '../hooks/useGroupQuery';
import { useAwardBadgeMutation } from '../hooks/useExpenseMutations';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Avatar — Generates a deterministic colored avatar from a Stellar address.
 * Each address gets a unique hue based on its hash, creating recognizable identicons.
 */

interface AvatarProps {
  address: string;
  size?: number;
  className?: string;
}

function hashToHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

function hashToInitials(address: string, name?: string | null): string {
  if (name) {
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(0, 2);
}

export default function Avatar({ address, size = 36, className = '' }: AvatarProps) {
  const [nickname, setNickname] = useState(() => addressBook.getName(address));

  useEffect(() => {
    const update = () => setNickname(addressBook.getName(address));
    window.addEventListener('stellarsplit:contacts-updated', update);
    return () => window.removeEventListener('stellarsplit:contacts-updated', update);
  }, [address]);

  const { data: badges } = useBadges(address);
  const awardBadgeMutation = useAwardBadgeMutation();
  
  const hue = hashToHue(address);
  const bg = `hsl(${hue}, 65%, 45%)`;
  const bgLight = `hsl(${hue}, 65%, 92%)`;
  const initials = hashToInitials(address, nickname);

  // Demo: Click avatar to award a random badge
  const handleAwardBadge = async () => {
    if (awardBadgeMutation.isPending) return;
    const randomBadge = [1, 2, 3][Math.floor(Math.random() * 3)];
    if (!badges?.includes(randomBadge)) {
      await awardBadgeMutation.mutateAsync({ userAddress: address, badgeId: randomBadge });
    }
  };

  const getBadgeEmoji = (id: number) => {
    switch(id) {
      case 1: return '🚀'; // Hızlı Ödeyici
      case 2: return '🧾'; // Makbuz Avcısı
      case 3: return '🐋'; // Balina Staker
      default: return '⭐';
    }
  };

  return (
    <div className="relative inline-flex">
      <div
        onClick={handleAwardBadge}
        className={`inline-flex items-center justify-center rounded-full font-mono font-bold text-xs uppercase shrink-0 transition-all cursor-pointer hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.32,
          background: `linear-gradient(135deg, ${bg}, hsl(${(hue + 40) % 360}, 70%, 50%))`,
          color: bgLight,
          boxShadow: `0 0 0 2px hsl(${hue}, 65%, 45%, 0.2), 0 4px 10px rgba(0,0,0,0.1)`,
        }}
        title={nickname ? `${nickname} (${address}) - Click to mint badge` : `${address} - Click to mint badge`}
      >
        {initials}
      </div>

      <AnimatePresence>
        {badges && badges.length > 0 && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-2 flex -space-x-1"
          >
            {badges.map((badgeId, i) => (
              <div 
                key={`${badgeId}-${i}`} 
                className="w-4 h-4 text-[10px] flex items-center justify-center bg-white border border-border shadow-sm rounded-full z-10"
                title="NFT Badge"
              >
                {getBadgeEmoji(badgeId)}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Row of multiple avatars stacked with overlap */
export function AvatarGroup({ addresses, max = 5 }: { addresses: string[]; max?: number }) {
  const visible = addresses.slice(0, max);
  const remaining = addresses.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((addr) => (
        <Avatar
          key={addr}
          address={addr}
          size={30}
          className="ring-2 ring-background"
        />
      ))}
      {remaining > 0 && (
        <div className="w-[30px] h-[30px] rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-semibold text-muted-foreground">
          +{remaining}
        </div>
      )}
    </div>
  );
}
