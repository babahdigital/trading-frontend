'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_META: Record<ToastTone, { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'border-green-500/30 bg-green-500/10 text-green-200' },
  error: { icon: XCircle, cls: 'border-red-500/30 bg-red-500/10 text-red-200' },
  info: { icon: Info, cls: 'border-blue-500/30 bg-blue-500/10 text-blue-200' },
  warning: { icon: AlertCircle, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-200' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const item: Toast = { id, ...t };
      setToasts((prev) => [...prev, item]);
      const duration = t.durationMs ?? 5000;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm"
      >
        {toasts.map((t) => {
          const meta = TONE_META[t.tone];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto rounded-lg border backdrop-blur p-3 shadow-lg flex items-start gap-2.5',
                'animate-in slide-in-from-bottom-3 fade-in duration-200',
                meta.cls,
              )}
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{t.title}</p>
                {t.description && <p className="text-xs opacity-90 mt-1 leading-relaxed">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be called inside <ToastProvider>');
  }
  return ctx;
}
