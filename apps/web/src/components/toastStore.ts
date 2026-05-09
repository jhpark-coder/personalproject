import { create } from 'zustand';
import type { ToastItem, ToastType } from './toastContext';

interface ToastState {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  showToast: (message, type = 'info', durationMs = 2500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    window.setTimeout(() => get().removeToast(id), durationMs);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
