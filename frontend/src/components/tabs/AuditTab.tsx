import { Clock, Lock } from 'lucide-react';
import { type AuditLogEntry } from '../../lib/api';
import { maskAddress } from '../../lib/format';
import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface AuditTabProps {
  entries: AuditLogEntry[];
  isLoading: boolean;
  hasJwt: boolean;
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  JOIN: 'Joined',
  LEAVE: 'Left',
  CANCEL: 'Cancelled',
  SETTLE: 'Settled',
  ADD: 'Added',
  REMOVE: 'Removed',
  TRIGGER: 'Triggered',
  EXPORT: 'Exported data',
  LOGIN: 'Signed in',
};

const ENTITY_LABELS: Record<string, string> = {
  GROUP: 'group',
  EXPENSE: 'expense',
  SETTLEMENT: 'settlement',
  MEMBER: 'member',
  RECURRING: 'recurring template',
  USER: 'account',
};

function humanize(entry: AuditLogEntry): string {
  const action = ACTION_LABELS[entry.action] ?? entry.action;
  const entity = ENTITY_LABELS[entry.entityType] ?? entry.entityType.toLowerCase();
  return `${action} ${entity}`;
}

export default function AuditTab({ entries, isLoading, hasJwt }: AuditTabProps) {
  if (!hasJwt) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Lock size={32} className="opacity-20" />
        <p className="text-sm font-bold">Connect wallet to view activity</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-12" rounded="xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Clock size={32} className="opacity-20" />
        <p className="text-sm font-bold">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative">
      {/* Timeline left border */}
      <div className="absolute left-[17px] top-4 bottom-4 w-px bg-indigo-500/20" />

      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-4 py-2 px-1 group hover:bg-white/3 rounded-xl transition-colors">
          {/* Dot */}
          <div className="relative z-10 mt-1.5 w-4 h-4 rounded-full bg-indigo-500/30 border-2 border-indigo-500/50 shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground truncate">{humanize(entry)}</p>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{relativeTime(entry.createdAt)}</span>
            </div>
            {(entry.actorWallet || entry.actorId) && (
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {entry.actorWallet ? maskAddress(entry.actorWallet) : `user:${entry.actorId?.slice(0, 8)}`}
              </p>
            )}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                {Object.entries(entry.metadata)
                  .filter(([k]) => !['groupId', 'userId'].includes(k))
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
