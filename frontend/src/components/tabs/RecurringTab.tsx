import { memo } from 'react';
import { Plus, Repeat, Trash2, Cloud } from 'lucide-react';
import { type RecurringTemplate } from '../../lib/recurring';
import { TabSkeleton } from '../ui/TabSkeleton';
import EmptyState from '../EmptyState';
import type { TranslationKey } from '../../lib/i18n';

interface RecurringTabProps {
  subscriptions: RecurringTemplate[];
  setShowAddSub: (val: boolean) => void;
  isLoading?: boolean;
  isBackend?: boolean;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  t: (key: TranslationKey) => string;
}

export default memo(function RecurringTab({
  subscriptions,
  setShowAddSub,
  isLoading,
  isBackend,
  onDelete,
  t,
}: RecurringTabProps) {
  if (isLoading) {
    return <TabSkeleton rows={3} rowHeight={14} rounded="2xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
          {t('group.recurring_title')}
          {isBackend && (
            <span className="flex items-center gap-1 text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              <Cloud size={10} />
              {t('group.recurring_synced')}
            </span>
          )}
        </h3>
        <button
          data-testid="add-subscription-btn"
          onClick={() => setShowAddSub(true)}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)] hover:scale-110 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {subscriptions.length === 0 && (
        <EmptyState
          icon={Repeat}
          title={t('group.recurring_empty')}
          description={t('group.recurring_empty_hint')}
          action={{ label: `+ ${t('group.recurring')}`, onClick: () => setShowAddSub(true) }}
          tone="indigo"
          variant="spin"
        />
      )}

      <div className="space-y-3">
        {subscriptions.map((s: RecurringTemplate) => (
          <div
            key={s.id}
            className="bg-white/[0.025] border border-white/[0.07] p-5 rounded-2xl flex justify-between items-center group hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <Repeat size={18} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight">{s.name}</div>
                <div className="inline-flex items-center text-[10px] text-indigo-300 font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mt-0.5">
                  {s.interval}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-black text-base">{s.amount} XLM</div>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(s.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete recurring"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
