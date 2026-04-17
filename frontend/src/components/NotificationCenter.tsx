import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, BellPlus, CheckCheck, Zap, Users, RefreshCw, Settings, Info, HandCoins, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type NotificationType } from '../store/useNotificationStore';
import { useNotifications, useMarkNotificationRead } from '../hooks/useBackendGroups';
import { getAccessToken, notificationsApi, paymentRequestsApi, type BackendPaymentRequest } from '../lib/api';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const qc = useQueryClient();

  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount)();
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const { mutate: markRead } = useMarkNotificationRead();

  const hasJwt = !!getAccessToken();
  const { isSubscribed, isSupported, subscribe } = usePushSubscription();

  // Fetch backend notifications when authenticated
  useNotifications();

  // Fetch pending payment requests
  const { data: paymentRequests = [] } = useQuery<BackendPaymentRequest[]>({
    queryKey: ['payment-requests', 'received'],
    queryFn: () => paymentRequestsApi.listReceived(),
    enabled: hasJwt,
    refetchInterval: 60_000,
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => paymentRequestsApi.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-requests', 'received'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => paymentRequestsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-requests', 'received'] }),
  });

  const totalUnread = unreadCount + paymentRequests.length;

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
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-[9px] font-black text-white leading-none">
            {totalUnread > 9 ? '9+' : totalUnread}
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
            className="absolute right-0 top-12 z-[300] w-80 bg-[#0e1118]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <span className="text-xs font-black uppercase tracking-[0.15em] flex items-center gap-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                <Bell size={12} />
                Notifications
                {totalUnread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black">
                    {totalUnread} new
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

            {/* Enable push notifications banner */}
            {isSupported && !isSubscribed && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-indigo-500/10">
                <span className="text-[10px] text-indigo-300 font-semibold">Get real-time alerts</span>
                <button
                  onClick={subscribe}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  aria-label="Enable push notifications"
                >
                  <BellPlus size={12} />
                  Enable Notifications
                </button>
              </div>
            )}

            {/* Pending payment requests */}
            {paymentRequests.length > 0 && (
              <div className="border-b border-white/10">
                <div className="px-4 py-2 flex items-center gap-2">
                  <HandCoins size={11} className="text-indigo-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                    Payment Requests ({paymentRequests.length})
                  </span>
                </div>
                {paymentRequests.map((req) => {
                  const isOverdue = req.dueDate && new Date(req.dueDate) < new Date();
                  return (
                    <div key={req.id} className="px-4 py-3 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <HandCoins size={13} className="text-indigo-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">
                            {parseFloat(req.amount).toFixed(4)} {req.currency}
                          </p>
                          {req.note && (
                            <p className="text-[10px] text-muted-foreground truncate">{req.note}</p>
                          )}
                          {req.dueDate && (
                            <p className={`text-[9px] flex items-center gap-1 mt-0.5 font-bold ${isOverdue ? 'text-rose-400' : 'text-muted-foreground'}`}>
                              <Clock size={9} />
                              Due {new Date(req.dueDate).toLocaleDateString()}
                              {isOverdue && ' — overdue'}
                            </p>
                          )}
                          {req.groupName && (
                            <p className="text-[9px] text-muted-foreground/60 truncate mt-0.5">{req.groupName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markPaidMutation.mutate(req.id)}
                          disabled={markPaidMutation.isPending}
                          className="flex-1 text-[10px] font-black py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => cancelMutation.mutate(req.id)}
                          disabled={cancelMutation.isPending}
                          className="flex-1 text-[10px] font-black py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.04] transition-colors group ${
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
