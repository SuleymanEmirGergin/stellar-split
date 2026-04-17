import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* eslint-disable react-refresh/only-export-components -- useToast is a hook, not a component; shared with ToastProvider in same file */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const typeConfig: Record<ToastType, { bg: string; icon: string; dot: string }> = {
    success: {
      bg: 'bg-[#0d1a12]/95 border-emerald-500/25',
      icon: '✓',
      dot: 'bg-emerald-400',
    },
    error: {
      bg: 'bg-[#1a0d0d]/95 border-rose-500/25',
      icon: '✕',
      dot: 'bg-rose-400',
    },
    info: {
      bg: 'bg-[#0d1120]/95 border-indigo-500/25',
      icon: 'i',
      dot: 'bg-indigo-400',
    },
  };

  const dotColor: Record<ToastType, string> = {
    success: 'text-emerald-400',
    error: 'text-rose-400',
    info: 'text-indigo-400',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-white/90 pointer-events-auto cursor-pointer backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-[380px] border ${
              typeConfig[toast.type].bg
            } ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
            onClick={() => dismissToast(toast.id)}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black ${dotColor[toast.type]} bg-current/10`} style={{ color: 'inherit' }}>
              <span className={dotColor[toast.type]}>{typeConfig[toast.type].icon}</span>
            </div>
            <span className="flex-1 leading-snug text-white/85">{toast.message}</span>
            <button
              onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
              className="text-white/25 hover:text-white/60 transition-colors text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
