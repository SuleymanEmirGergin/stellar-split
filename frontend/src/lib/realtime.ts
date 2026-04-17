import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from './api';

export type GroupEventType =
  | 'expense:added'
  | 'settlement:confirmed'
  | 'member:joined'
  | 'recurring:triggered';

export interface GroupEvent {
  type: GroupEventType;
  payload: Record<string, unknown>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Opens an SSE connection to /groups/:groupId/events and calls onEvent
 * for each received event. Reconnects with exponential backoff on failure.
 */
export function useGroupEvents(
  groupId: string | null | undefined,
  onEvent: (event: GroupEvent) => void,
): { connected: boolean } {
  const connectedRef = useRef(false);
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!groupId) return;
    const token = getAccessToken();
    if (!token) return;

    const url = `${API_BASE}/groups/${groupId}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      connectedRef.current = true;
      retriesRef.current = 0;
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as GroupEvent;
        onEventRef.current(data);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      connectedRef.current = false;
      es.close();
      esRef.current = null;
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000);
      retriesRef.current++;
      setTimeout(connect, delay);
    };
  }, [groupId]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      connectedRef.current = false;
    };
  }, [connect]);

  return { connected: connectedRef.current };
}
