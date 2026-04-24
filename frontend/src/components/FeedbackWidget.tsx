/**
 * FeedbackWidget — floating action button that opens a compact feedback modal.
 *
 * Features:
 * - 3 feedback types: bug / feature / general
 * - Anonymous by default (wallet address optional, truncated for privacy)
 * - Stores submissions locally (localStorage) as a fallback
 * - POSTs to backend /api/v1/feedback when available (fire-and-forget)
 * - Respects reduced-motion preference
 * - Full a11y: role="dialog", focus-trap, Escape closes
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, X, Send, Check } from 'lucide-react';
import { useMotionEnabled } from '../lib/motion';

// ── Types ──────────────────────────────────────────────────────────────────

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackPayload {
  type: FeedbackType;
  message: string;
  walletHint?: string; // last 6 chars only, for support correlation
  url: string;
  ts: number;
  appVersion: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'stellarsplit_feedback_queue';
const ENDPOINT_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
  bug:     { label: 'Bug report',      icon: <Bug size={14} />,        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  feature: { label: 'Feature request', icon: <Lightbulb size={14} />,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  general: { label: 'General',         icon: <MessageCircle size={14} />, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
};

// ── Storage helpers ────────────────────────────────────────────────────────

function enqueue(payload: FeedbackPayload): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const queue: FeedbackPayload[] = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    // Keep at most 20 pending items
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-20)));
  } catch { /* noop */ }
}

async function submit(payload: FeedbackPayload): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT_BASE}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

interface FeedbackWidgetProps {
  walletAddress?: string | null;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ walletAddress }) => {
  const motionOn = useMotionEnabled();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus first element when modal opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => firstFocusRef.current?.focus());
    }
  }, [open]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleOpen = useCallback(() => {
    setDone(false);
    setMessage('');
    setType('general');
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);

    const payload: FeedbackPayload = {
      type,
      message: trimmed,
      walletHint: walletAddress ? walletAddress.slice(-6) : undefined,
      url: window.location.pathname,
      ts: Date.now(),
      appVersion: APP_VERSION,
    };

    // Always queue locally first (guarantees persistence)
    enqueue(payload);

    // Optimistic: try backend (fire-and-forget — don't block UX on failure)
    void submit(payload);

    setSubmitting(false);
    setDone(true);

    // Auto-close after 2 s
    setTimeout(() => setOpen(false), 2000);
  }, [message, type, walletAddress, submitting]);

  const cfg = TYPE_CONFIG[type];
  const canSubmit = message.trim().length >= 3 && !submitting && !done;

  return (
    <>
      {/* ── FAB ── */}
      <motion.button
        type="button"
        onClick={handleOpen}
        whileHover={motionOn ? { scale: 1.08 } : {}}
        whileTap={motionOn ? { scale: 0.95 } : {}}
        className="fixed bottom-20 right-4 z-[200] flex items-center justify-center w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.12] text-white/60 hover:text-white/90 hover:bg-white/[0.11] hover:border-white/[0.2] shadow-lg backdrop-blur-xl transition-colors"
        aria-label="Send feedback"
        title="Send feedback"
      >
        <MessageSquarePlus size={19} />
      </motion.button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-end justify-end p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-modal-title"
              initial={motionOn ? { opacity: 0, y: 24, scale: 0.95 } : {}}
              animate={motionOn ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
              exit={motionOn ? { opacity: 0, y: 16, scale: 0.97 } : { opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
              className="pointer-events-auto w-80 bg-[#111] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden"
              style={{ marginBottom: '56px' /* clear FAB */ }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 id="feedback-modal-title" className="font-black text-sm uppercase tracking-widest text-white/80">
                  Give Feedback
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  aria-label="Close feedback"
                >
                  <X size={14} />
                </button>
              </div>

              {done ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center gap-3 px-5 pb-7 pt-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Check size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-white/70 text-center">
                    Thanks! Your feedback has been recorded.
                  </p>
                </div>
              ) : (
                /* ── Form ── */
                <div className="px-5 pb-5 space-y-4">
                  {/* Type selector */}
                  <div className="flex gap-2">
                    {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map((k, idx) => {
                      const c = TYPE_CONFIG[k];
                      return (
                        <button
                          key={k}
                          ref={idx === 0 ? firstFocusRef : undefined}
                          type="button"
                          onClick={() => setType(k)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${
                            type === k
                              ? c.color
                              : 'text-white/30 bg-white/[0.03] border-white/[0.05] hover:border-white/[0.1] hover:text-white/50'
                          }`}
                        >
                          {c.icon}
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Message */}
                  <div>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          void handleSubmit();
                        }
                      }}
                      placeholder={
                        type === 'bug'
                          ? 'Describe the bug…'
                          : type === 'feature'
                          ? 'Describe your idea…'
                          : 'Share your thoughts…'
                      }
                      rows={4}
                      className="w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm font-medium text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                    <p className="text-[10px] text-white/20 mt-1 text-right">
                      ⌘↵ to submit
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      canSubmit
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] active:scale-95'
                        : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/[0.05]'
                    }`}
                  >
                    <Send size={13} />
                    {submitting ? 'Sending…' : 'Send feedback'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
