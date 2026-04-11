import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Zap, Users, RefreshCw, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type NotificationType } from '../store/useNotificationStore';
import { useNotifications, useMarkNotificationRead } from '../hooks/useBackendGroups';
import { getAccessToken, notificationsApi } from '../lib/api';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = 'shrink-0';
  switch (type) {
    case 'expense':   return <Zap size={14} className={`${cls} text-amber-400`} />;
    case 'settlement':return <CheckCheck size={14} className={`${cls} text-emerald-400`} />;
    case 'member':    return <Users size={14} className={`${cls} text-indigo-400`} />;
    case 'recurring': return <RefreshCw size={14} className={`${cls} text-purple-400`} />;
    default:          return <Info size={14} className={`${cls} text-muted-foreground`} />;
  }
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount)();
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const { mutate: markRead } = useMarkNotificationRead();

  const hasJwt = !!getAccessToken();

  // Fetch backend notifications when authenticated
  useNotifications();

  // Update document title with unread count
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [unreadCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
    if (!hasJwt) return;
    const unreadIds = items.filter((i) => i.readAt === null && i.source === 'backend').map((i) => i.id);
    if (unreadIds.length > 0) {
      void notificationsApi.markAllRead(unreadIds);
    }
  }, [items, markAllRead, hasJwt]);

  // Always render the bell when the component is mounted (parent controls visibility via walletAddress check).

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.33, 1, 0.68, 1] }}
            className="absolute right-0 top-12 z-[300] w-80 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground flex items-center gap-2">
                <Bell size={12} />
                Notifications
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black">
                    {unreadCount} new
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Settings size={28} className="opacity-20" />
                  <p className="text-xs font-bold">You're all caught up</p>
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.readAt === null) markRead(item.id);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/3 transition-colors group ${
                      item.readAt === null ? 'border-l-2 border-indigo-400/70' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="mt-0.5">
                      <TypeIcon type={item.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${item.readAt === null ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.body}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/60 shrink-0 mt-0.5">
                      {relativeTime(item.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
