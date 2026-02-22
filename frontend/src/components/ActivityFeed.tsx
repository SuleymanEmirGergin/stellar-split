import { useState, useEffect, useCallback } from 'react';
import { truncateAddress } from '../lib/stellar';
import Avatar from './Avatar';

interface Activity {
  id: string;
  type: string;
  created_at: string;
  source_account: string;
  transaction_hash: string;
}

interface ActivityFeedProps {
  members: string[];
}

const HORIZON = 'https://horizon-testnet.stellar.org';

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  invoke_host_function: { icon: '📜', label: 'StellarSplit İşlemi', color: 'text-accent' },
  payment: { icon: '💸', label: 'Ödeme', color: 'text-chart-4' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: '⚡', label: type.replace(/_/g, ' '), color: 'text-foreground' };
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}sn önce`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}sa önce`;
  return `${Math.floor(seconds / 86400)}gün önce`;
}

export default function ActivityFeed({ members }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const px = members.map(async (m) => {
        const resp = await fetch(
          `${HORIZON}/accounts/${m}/operations?order=desc&limit=15`
        );
        if (!resp.ok) return [];
        const data = await resp.json();
        return data._embedded?.records || [];
      });

      const allResults = await Promise.all(px);
      const flat = allResults.flat();
      
      // Sort by newest
      flat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filter to relevant types (contract calls and payments)
      // Deduplicate by transaction_hash to avoid showing the same tx multiple times if multiple members are involved
      const filtered: Activity[] = [];
      const seenTx = new Set<string>();

      for (const r of flat) {
        if (!['invoke_host_function', 'payment'].includes(r.type)) continue;
        if (seenTx.has(r.transaction_hash)) continue;
        
        seenTx.add(r.transaction_hash);
        filtered.push({
          id: r.id,
          type: r.type,
          created_at: r.created_at,
          source_account: r.source_account,
          transaction_hash: r.transaction_hash,
        });

        if (filtered.length >= 10) break;
      }

      setActivities(filtered);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [members]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="h-4 bg-muted rounded w-1/3 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">📋 Son Aktiviteler</h3>
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={fetchActivities}
        >
          ↻ Yenile
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite yok</p>
      ) : (
        <div className="space-y-1">
          {activities.map((a) => {
            const cfg = getConfig(a.type);
            return (
              <a
                key={a.id}
                href={`https://stellar.expert/explorer/testnet/tx/${a.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <Avatar address={a.source_account} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{cfg.icon}</span>
                    <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {truncateAddress(a.transaction_hash)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(a.created_at)}
                </div>
                <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity text-xs">↗</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
