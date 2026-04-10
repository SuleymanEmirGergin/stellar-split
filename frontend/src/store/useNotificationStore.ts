import { create } from 'zustand';

export type NotificationType = 'expense' | 'settlement' | 'member' | 'recurring' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: number;
  source: 'local' | 'backend';
  payload?: Record<string, unknown>;
}

// Backend notification shape (mapped from API)
export interface BackendNotification {
  id: string;
  type: 'EXPENSE_ADDED' | 'EXPENSE_CANCELLED' | 'SETTLEMENT_CONFIRMED' | 'SETTLEMENT_FAILED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'RECURRING_TRIGGERED' | 'SYSTEM';
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NotificationState {
  items: NotificationItem[];
  // Actions
  add: (n: Pick<NotificationItem, 'title' | 'body' | 'type'> & { payload?: Record<string, unknown> }) => void;
  setBackendItems: (items: BackendNotification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  // Derived
  unreadCount: () => number;
}

function mapBackendType(type: BackendNotification['type']): NotificationType {
  switch (type) {
    case 'EXPENSE_ADDED':
    case 'EXPENSE_CANCELLED':
      return 'expense';
    case 'SETTLEMENT_CONFIRMED':
    case 'SETTLEMENT_FAILED':
      return 'settlement';
    case 'MEMBER_JOINED':
    case 'MEMBER_LEFT':
      return 'member';
    case 'RECURRING_TRIGGERED':
      return 'recurring';
    default:
      return 'system';
  }
}

function mapBackendTitle(type: BackendNotification['type'], payload: Record<string, unknown>): string {
  switch (type) {
    case 'EXPENSE_ADDED': return `New expense: ${String(payload.description ?? 'Added')}`;
    case 'EXPENSE_CANCELLED': return `Expense cancelled`;
    case 'SETTLEMENT_CONFIRMED': return `Settlement confirmed`;
    case 'SETTLEMENT_FAILED': return `Settlement failed`;
    case 'MEMBER_JOINED': return `New member joined`;
    case 'MEMBER_LEFT': return `Member left group`;
    case 'RECURRING_TRIGGERED': return `Recurring expense created`;
    default: return 'Notification';
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],

  add: ({ title, body, type, payload }) => {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      title,
      body,
      type,
      readAt: null,
      createdAt: Date.now(),
      source: 'local',
      payload,
    };
    set((state) => ({
      items: [item, ...state.items].slice(0, 100), // cap at 100
    }));
  },

  setBackendItems: (backendItems) => {
    const mapped: NotificationItem[] = backendItems.map((bn) => ({
      id: bn.id,
      title: mapBackendTitle(bn.type, bn.payload),
      body: String(bn.payload.description ?? bn.payload.message ?? ''),
      type: mapBackendType(bn.type),
      readAt: bn.readAt,
      createdAt: new Date(bn.createdAt).getTime(),
      source: 'backend' as const,
      payload: bn.payload,
    }));

    set((state) => {
      // Keep local items, replace all backend items (dedup by id)
      const localItems = state.items.filter((i) => i.source === 'local');
      const merged = [...mapped, ...localItems];
      // Deduplicate by id (backend items take precedence)
      const seen = new Set<string>();
      const deduped = merged.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      return { items: deduped.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100) };
    });
  },

  markRead: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    }));
  },

  markAllRead: () => {
    const now = new Date().toISOString();
    set((state) => ({
      items: state.items.map((item) =>
        item.readAt === null ? { ...item, readAt: now } : item,
      ),
    }));
  },

  unreadCount: () => get().items.filter((i) => i.readAt === null).length,
}));
