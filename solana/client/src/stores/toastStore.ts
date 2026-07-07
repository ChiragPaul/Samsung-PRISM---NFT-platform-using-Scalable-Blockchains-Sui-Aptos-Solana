import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeId } from '../lib/utils';

export type ToastVariant = 'success' | 'error' | 'info' | 'pending';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Optional explorer / deep link. */
  href?: string;
  /** Auto-dismiss after ms; 0 = sticky. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  /** User preference: also raise a browser notification when permitted. */
  browserNotifications: boolean;
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  setBrowserNotifications: (enabled: boolean) => void;
}

export const useToastStore = create<ToastState>()(
  persist(
    (set) => ({
      toasts: [],
      browserNotifications: false,
      push: (toast) => {
        const id = makeId('toast');
        const duration = toast.duration ?? (toast.variant === 'error' ? 8000 : 5000);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id, duration }] }));
        return id;
      },
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setBrowserNotifications: (enabled) => set({ browserNotifications: enabled }),
    }),
    {
      name: 'nftm.toastPrefs',
      // Only persist the preference, never the transient toast list.
      partialize: (s) => ({ browserNotifications: s.browserNotifications }) as ToastState,
    },
  ),
);
