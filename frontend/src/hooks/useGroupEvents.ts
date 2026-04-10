/**
 * useGroupEvents — subscribes to the backend SSE stream for a group.
 *
 * Automatically reconnects (EventSource native behavior).
 * Calls the provided callback on each incoming event.
 *
 * Usage:
 *   useGroupEvents(groupId, (event) => {
 *     if (event.type === 'expense:added') queryClient.invalidateQueries(...)
 *   })
 */
import { useEffect, useRef } from 'react';
import { getAccessToken } from '../lib/api';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export interface GroupEvent {
  type:
    | 'expense:added'
    | 'expense:cancelled'
    | 'settlement:confirmed'
    | 'settlement:failed'
    | 'member:joined'
    | 'member:left'
    | 'recurring:triggered'
    | 'heartbeat';
  groupId: string;
  payload?: Record<string, unknown>;
  ts: number;
}

type GroupEventHandler = (event: GroupEvent) => void;

export function useGroupEvents(groupId: string | null, onEvent: GroupEventHandler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!groupId) return;

    const token = getAccessToken();
    if (!token) return;

    // EventSource doesn't support custom headers — pass token as query param
    // Backend should accept ?token= as fallback for SSE connections
    const url = `${BASE_URL}/groups/${groupId}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as GroupEvent;
        if (event.type !== 'heartbeat') {
          handlerRef.current(event);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource will automatically reconnect after error
    };

    return () => {
      es.close();
    };
  }, [groupId]);
}
