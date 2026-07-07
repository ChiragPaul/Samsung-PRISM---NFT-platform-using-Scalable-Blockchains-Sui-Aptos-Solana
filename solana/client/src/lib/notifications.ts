import { useToastStore } from '../stores/toastStore';
import type { ToastVariant } from '../stores/toastStore';

/**
 * Unified notify(): always raises an in-app toast, and additionally raises a
 * browser Notification when the user opted in and granted permission. This is
 * the single entry point used by tx flows, the activity subscription, and
 * price-alert checks.
 */
export function notify(opts: {
  variant: ToastVariant;
  title: string;
  description?: string;
  href?: string;
  duration?: number;
}): void {
  const store = useToastStore.getState();
  store.push(opts);

  if (
    store.browserNotifications &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    try {
      const n = new Notification(opts.title, { body: opts.description, tag: opts.title });
      if (opts.href) {
        n.onclick = () => {
          window.focus();
          window.location.assign(opts.href!);
        };
      }
    } catch {
      /* notifications are best-effort */
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
