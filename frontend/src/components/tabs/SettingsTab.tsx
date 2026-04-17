import { useState } from 'react';
import { Bell, BellOff, LogOut, Link, Loader2, AlertTriangle, FileBarChart } from 'lucide-react';
import { exportToTaxReport } from '../../lib/export';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useLeaveGroupMutation } from '../../hooks/useBackendGroups';
import type { TranslationKey } from '../../lib/i18n';

interface SettingsTabProps {
  groupIdStr: string;
  groupName: string;
  hasJwt: boolean;
  inviteCode?: string | null;
  t: (key: TranslationKey) => string;
  addToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onLeaveGroup?: () => void;
  // For tax report
  expenses?: import('../../lib/contract').Expense[];
  group?: import('../../lib/contract').Group;
}

export default function SettingsTab({
  groupIdStr,
  groupName,
  hasJwt,
  inviteCode,
  t,
  addToast,
  onLeaveGroup,
  expenses,
  group,
}: SettingsTabProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Push notifications
  const { status: pushStatus, subscribe, unsubscribe } = usePushNotifications(hasJwt);

  // Leave group mutation
  const leaveMutation = useLeaveGroupMutation(groupIdStr);

  const handlePushToggle = async () => {
    try {
      if (pushStatus === 'subscribed') {
        await unsubscribe();
        addToast?.(t('settings.push_disabled'), 'info');
      } else {
        await subscribe();
        addToast?.(t('settings.push_enabled'), 'success');
      }
    } catch {
      addToast?.(t('settings.push_denied'), 'error');
    }
  };

  const handleLeaveGroup = async () => {
    leaveMutation.mutate(undefined, {
      onSuccess: () => {
        addToast?.(t('settings.leave_success'), 'info');
        onLeaveGroup?.();
      },
      onError: () => {
        addToast?.(t('settings.leave_error'), 'error');
      },
    });
    setShowLeaveConfirm(false);
  };

  const copyInviteLink = async () => {
    const url = inviteCode
      ? `${window.location.origin}/join/${inviteCode}`
      : `${window.location.origin}?group=${groupIdStr}`;
    await navigator.clipboard.writeText(url);
    addToast?.(t('group.invite_link_copied'), 'success');
  };

  return (
    <div className="space-y-6">
      {/* Tax / Accounting Report */}
      {group && expenses && expenses.length > 0 && (
        <section className="p-5 bg-secondary/30 border border-white/5 rounded-3xl space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {t('settings.tax_report_section')}
          </h3>
          <button
            type="button"
            onClick={() => exportToTaxReport(group, expenses)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-black hover:bg-emerald-500/20 transition-all"
          >
            <FileBarChart size={16} />
            {t('settings.tax_report_btn')}
          </button>
          <p className="text-[10px] text-muted-foreground">{t('settings.tax_report_desc')}</p>
        </section>
      )}

      {/* Invite Link */}
      <section className="p-5 bg-secondary/30 border border-white/5 rounded-3xl space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {t('settings.invite_link_section')}
        </h3>
        <button
          type="button"
          onClick={copyInviteLink}
          className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-sm font-black hover:bg-indigo-500/20 transition-all"
        >
          <Link size={16} />
          {t('group.copy_invite_link')}
        </button>
      </section>

      {/* Push Notifications (only if JWT-authenticated) */}
      {hasJwt && (
        <section className="p-5 bg-secondary/30 border border-white/5 rounded-3xl space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {t('settings.notifications')}
          </h3>

          {pushStatus === 'unsupported' ? (
            <p className="text-xs text-muted-foreground">
              {t('settings.push_not_supported')}
            </p>
          ) : pushStatus === 'denied' ? (
            <p className="text-xs text-rose-400 flex items-center gap-2">
              <BellOff size={14} /> {t('settings.push_denied')}
            </p>
          ) : (
            <button
              type="button"
              onClick={handlePushToggle}
              disabled={pushStatus === 'loading'}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-black transition-all disabled:opacity-60 ${
                pushStatus === 'subscribed'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {pushStatus === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : pushStatus === 'subscribed' ? (
                <Bell size={16} />
              ) : (
                <BellOff size={16} />
              )}
              {pushStatus === 'subscribed'
                ? t('settings.push_subscribed')
                : t('settings.push_subscribe')}
            </button>
          )}
        </section>
      )}

      {/* Danger zone — Leave Group (only for JWT mode) */}
      {hasJwt && (
        <section className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-3xl space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400/70">
            {t('settings.danger_zone')}
          </h3>
          {!showLeaveConfirm ? (
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm font-black hover:bg-rose-500/20 transition-all"
            >
              <LogOut size={16} />
              {t('settings.leave_group')}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <p className="text-xs text-rose-300">{t('settings.leave_confirm')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black hover:bg-white/10 transition-all"
                >
                  {t('settings.leave_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={leaveMutation.isPending}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {leaveMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                  {t('settings.leave_btn')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
