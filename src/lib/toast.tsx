import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from './utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  id?: string;
  duration?: number;
}

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
}

const DEFAULT_DURATION_MS = 5000;
const TOAST_EVENT_NAME = 'scmd:toast';
const TOAST_DISMISS_EVENT_NAME = 'scmd:toast:dismiss';

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitToast(message: string, variant: ToastVariant, options?: ToastOptions) {
  if (typeof window === 'undefined') {
    return options?.id ?? createToastId();
  }

  const id = options?.id ?? createToastId();
  window.dispatchEvent(new CustomEvent(TOAST_EVENT_NAME, {
    detail: {
      id,
      message,
      variant,
      duration: Math.max(1000, options?.duration ?? DEFAULT_DURATION_MS),
      createdAt: Date.now(),
    } satisfies ToastItem,
  }));
  return id;
}

function dismissToast(id?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(TOAST_DISMISS_EVENT_NAME, {
    detail: { id },
  }));
}

export const toast = Object.assign(
  (message: string, options?: ToastOptions) => emitToast(message, 'info', options),
  {
    success: (message: string, options?: ToastOptions) => emitToast(message, 'success', options),
    error: (message: string, options?: ToastOptions) => emitToast(message, 'error', options),
    dismiss: (id?: string) => dismissToast(id),
  },
);

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <TriangleAlert size={18} />,
  info: <Info size={18} />,
};

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  info: 'border-scmd-primary/30 bg-scmd-primary/10 text-scmd-silver',
};

export function GlobalToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>;
      const nextItem = customEvent.detail;

      if (!nextItem?.id || !nextItem?.message) {
        return;
      }

      setItems((current) => {
        const deduped = current.filter((item) => item.id !== nextItem.id);
        return [...deduped, nextItem].slice(-4);
      });
    };

    const handleDismiss = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const id = customEvent.detail?.id;
      setItems((current) => (id ? current.filter((item) => item.id !== id) : []));
    };

    window.addEventListener(TOAST_EVENT_NAME, handleToast as EventListener);
    window.addEventListener(TOAST_DISMISS_EVENT_NAME, handleDismiss as EventListener);

    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToast as EventListener);
      window.removeEventListener(TOAST_DISMISS_EVENT_NAME, handleDismiss as EventListener);
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const timers = items.map((item) => window.setTimeout(() => {
      setItems((current) => current.filter((existing) => existing.id !== item.id));
    }, item.duration));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items]);

  const orderedItems = useMemo(() => [...items].reverse(), [items]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 top-4 z-[1200] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
    >
      {orderedItems.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            'pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 animate-in slide-in-from-top-3 fade-in',
            variantStyles[item.variant],
          )}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 shrink-0">{variantIcon[item.variant]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                {item.variant === 'success' ? 'Thành công' : item.variant === 'error' ? 'Lỗi hệ thống' : 'Thông báo'}
              </p>
              <p className="mt-1 text-sm leading-6 text-white">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-scmd-silver/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
