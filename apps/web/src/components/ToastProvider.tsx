import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { ToastContext } from './toastContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useToastStore } from './toastStore';

const toastTone = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toasts = useToastStore((state) => state.toasts);
  const showToast = useToastStore((state) => state.showToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[120] grid w-[min(360px,calc(100vw-2rem))] gap-2" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-soft backdrop-blur', toastTone[toast.type])}
            role="status"
          >
            <span className="min-w-0 flex-1 leading-6">{toast.message}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 hover:bg-white/50"
              onClick={() => removeToast(toast.id)}
              aria-label="닫기"
            >
              <X size={15} />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
