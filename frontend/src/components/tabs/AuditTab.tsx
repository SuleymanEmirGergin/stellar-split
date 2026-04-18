import { Clock, Lock } from 'lucide-react';
import { type AuditLogEntry } from '../../lib/api';
import { maskAddress } from '../../lib/format';
import { TabSkeleton } from '../ui/TabSkeleton';
import EmptyState from '../EmptyState';
import { useI18n } from '../../lib/i18n';
import type { TranslationKey } from '../../lib/i18n';

interface AuditTabProps {
  entries: AuditLogEntry[];
  isLoading: boolean;
  hasJwt: boolean;
}

function relativeTime(ts: string, t: (key: TranslationKey) => string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t('audit.time_just_now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('audit.time_minutes_ago').replace('{{n}}', String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t('audit.time_hours_ago').replace('{{n}}', String(h));
  return t('audit.time_days_ago').replace('{{n}}', String(Math.floor(h / 24)));
}

function entityBadgeClass(entityType: string): string {
  switch (entityType) {
    case 'EXPENSE':    return 'bg-amber-500/10 border border-amber-500/25 text-amber-300';
    case 'SETTLEMENT': return 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300';
    case 'MEMBER':     return 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300';
    case 'GROUP':      return 'bg-purple-500/10 border border-purple-500/25 text-purple-300';
    case 'RECURRING':  return 'bg-sky-500/10 border border-sky-500/25 text-sky-300';
    case 'USER':       return 'bg-rose-500/10 border border-rose-500/25 text-rose-300';
    default:           return 'bg-white/[0.05] border border-white/[0.08] text-foreground/60';
  }
}

export default function AuditTab({ entries, isLoading, hasJwt }: AuditTabProps) {
  const { t } = useI18n();

  const actionLabel = (action: string): string => ({
    CREATE: t('audit.action_create'),
    UPDATE: t('audit.action_update'),
    DELETE: t('audit.action_delete'),
    JOIN: t('audit.action_join'),
    LEAVE: t('audit.action_leave'),
    CANCEL: t('audit.action_cancel'),
    SETTLE: t('audit.action_settle'),
    ADD: t('audit.action_add'),
    REMOVE: t('audit.action_remove'),
    TRIGGER: t('audit.action_trigger'),
    EXPORT: t('audit.action_export'),
    LOGIN: t('audit.action_login'),
  })[action] ?? action;

  const entityLabel = (entityType: string): string => ({
    GROUP: t('audit.entity_group'),
    EXPENSE: t('audit.entity_expense'),
    SETTLEMENT: t('audit.entity_settlement'),
    MEMBER: t('audit.entity_member'),
    RECURRING: t('audit.entity_recurring'),
    USER: t('audit.entity_user'),
  })[entityType] ?? entityType.toLowerCase();

  const humanize = (entry: AuditLogEntry): string =>
    `${actionLabel(entry.action)} ${entityLabel(entry.entityType)}`;

  if (!hasJwt) {
    return (
      <EmptyState
        icon={Lock}
        title={t('audit.connect_wallet_hint')}
        tone="indigo"
        variant="none"
        size="sm"
      />
    );
  }

  if (isLoading) {
    return <TabSkeleton rows={5} rowHeight={12} rounded="xl" />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={t('audit.no_activity')}
        tone="indigo"
        variant="float"
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-1.5 relative">
      {/* Timeline left border */}
      <div className="absolute left-[17px] top-4 bottom-4 w-px bg-indigo-500/20" />

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-4 py-3 px-3 group bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
        >
          {/* Dot */}
          <div className="relative z-10 mt-1.5 w-4 h-4 rounded-full bg-indigo-500/30 border-2 border-indigo-500/50 shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-black text-foreground truncate">{humanize(entry)}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${entityBadgeClass(entry.entityType)}`}>
                  {entry.entityType}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{relativeTime(entry.createdAt, t)}</span>
            </div>
            {(entry.actorWallet || entry.actorId) && (
              <p className="text-[11px] font-mono text-indigo-300/70 mt-0.5">
                {entry.actorWallet ? maskAddress(entry.actorWallet) : `user:${entry.actorId?.slice(0, 8)}`}
              </p>
            )}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">
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
