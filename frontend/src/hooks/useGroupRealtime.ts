/**
 * useGroupRealtime — SSE event subscription + Soroban contract polling.
 *
 * Extracted from GroupDetail so the 600-line component is no longer
 * responsible for cache-invalidation logic. Two data paths:
 *
 *   1. JWT path  — useGroupEvents (NestJS SSE) handles real-time events
 *                  and calls queryClient.invalidateQueries on each one.
 *   2. No-JWT    — subscribeGroupEvents polls the Soroban RPC for
 *                  contract events and invalidates the group query on change.
 *
 * Both paths coexist safely: when JWT is present the Soroban poller is
 * skipped (condition inside useEffect), so we never double-invalidate.
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { server, CONTRACT_ID } from '../lib/stellar';
import { subscribeGroupEvents } from '../lib/events';
import { useGroupEvents } from './useGroupEvents';
import { groupKeys } from './useGroupQuery';
import { backendGroupKeys } from './useBackendGroups';
import type { TranslationKey } from '../lib/i18n';

interface UseGroupRealtimeProps {
  groupIdStr: string;
  numericGroupId: number;
  isDemo: boolean;
  hasJwt: boolean;
  addToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  t: (key: TranslationKey) => string;
}

export function useGroupRealtime({
  groupIdStr,
  numericGroupId,
  isDemo,
  hasJwt,
  addToast,
  t,
}: UseGroupRealtimeProps) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // ── Path 1: NestJS SSE (JWT path) ─────────────────────────────────────────
  useGroupEvents(isDemo ? null : groupIdStr, (event) => {
    setRealtimeConnected(true);

    const payload = (event.payload ?? {}) as {
      actorName?: string;
      actor?: string;
      label?: string;
      amount?: number;
      currency?: string;
    };

    // Build display strings for the toast actor and amounts
    const actor =
      payload.actorName ??
      (typeof payload.actor === 'string' && payload.actor.length > 10
        ? `${payload.actor.slice(0, 4)}…${payload.actor.slice(-4)}`
        : payload.actor);
    const amountStr =
      payload.amount != null ? ` (${payload.amount} ${payload.currency ?? 'XLM'})` : '';
    const labelStr = payload.label ? `: ${payload.label}` : '';

    switch (event.type) {
      case 'expense:added':
      case 'expense:cancelled':
      case 'recurring:triggered': {
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.expenses(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.balances(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.settlementPlan(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.audit(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.analytics(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
        if (event.type === 'recurring:triggered') {
          queryClient.invalidateQueries({ queryKey: backendGroupKeys.recurring(groupIdStr) });
          addToast(t('realtime.recurring_triggered') + labelStr + amountStr, 'info');
        } else if (event.type === 'expense:cancelled') {
          addToast(`${actor ?? t('realtime.a_member')} ${t('realtime.expense_cancelled')}${labelStr}`, 'info');
        } else {
          addToast(`${actor ?? t('realtime.a_member')} ${t('realtime.expense_added')}${labelStr}${amountStr}`, 'info');
        }
        break;
      }
      case 'settlement:confirmed':
      case 'settlement:failed': {
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.settlements(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.balances(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.settlementPlan(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.audit(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
        if (event.type === 'settlement:confirmed') {
          addToast(t('realtime.settlement_confirmed') + amountStr, 'success');
        } else {
          addToast(t('realtime.settlement_failed') + labelStr, 'error');
        }
        break;
      }
      case 'member:joined':
      case 'member:left': {
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.detail(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.balances(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: backendGroupKeys.audit(groupIdStr) });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
        addToast(
          event.type === 'member:joined'
            ? `${actor ?? t('realtime.new_member')} ${t('realtime.joined')}`
            : `${actor ?? t('realtime.a_member')} ${t('realtime.left')}`,
          event.type === 'member:joined' ? 'success' : 'info',
        );
        break;
      }
      case 'heartbeat':
        // no-op — keeps connection alive; no toast, no invalidation
        break;
    }
  });

  // ── Path 2: Soroban contract event poller (no-JWT fallback) ───────────────
  useEffect(() => {
    if (isDemo || hasJwt) return;
    const cleanup = subscribeGroupEvents(server, CONTRACT_ID, numericGroupId, () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(numericGroupId) });
    });
    return cleanup;
  }, [numericGroupId, isDemo, hasJwt, queryClient]);

  return { realtimeConnected };
}
