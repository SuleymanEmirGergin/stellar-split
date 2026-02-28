import { useEffect, useState } from 'react';
import { Users, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { getGroup } from '../lib/contract';
import { isDemoMode } from '../lib/contract';
import { useI18n } from '../lib/i18n';

interface Props {
  groupId: number;
  walletAddress: string | null;
  onConnect: () => void;
  connecting: boolean;
  freighterAvailable: boolean;
  onOpenGroup: () => void;
}

export default function JoinPage({
  groupId,
  walletAddress,
  onConnect,
  connecting,
  freighterAvailable,
  onOpenGroup,
}: Props) {
  const { t } = useI18n();
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setGroupName(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getGroup(walletAddress, groupId)
      .then((g) => {
        if (!cancelled) setGroupName(g.name);
      })
      .catch(() => {
        if (!cancelled) setGroupName(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress, groupId]);

  const displayName = groupName || (loading && walletAddress ? '…' : `Grup #${groupId}`);
  const isDemo = isDemoMode();

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center p-6">
      {/* Wallet-themed background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-purple-950/25" />
        <div className="absolute inset-0 bg-wallet-dots opacity-40" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/15 rounded-full blur-[90px]" />
      </div>
      <div className="relative z-10 w-full max-w-md mx-auto text-center">
        <div className="p-10 rounded-3xl bg-card/40 backdrop-blur-sm border border-white/10 ring-1 ring-indigo-500/20 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 text-indigo-400">
              <Users size={40} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">
              {t('join.title')}
            </h1>
            <p className="text-muted-foreground font-medium mb-8">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground mb-10 max-w-[320px] mx-auto leading-relaxed">
              {t('join.description')}
            </p>

            {walletAddress ? (
              <button
                onClick={onOpenGroup}
                className="w-full py-4 px-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
              >
                {t('join.open_group')}
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={onConnect}
                disabled={!freighterAvailable || connecting}
                className="w-full py-4 px-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <LinkIcon size={20} />
                {connecting ? t('join.connecting') : freighterAvailable ? t('join.connect_wallet') : t('join.install_freighter')}
              </button>
            )}

            {isDemo && (
              <p className="mt-6 text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest">
                {t('header.demo_mode')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
