import { useToastStore } from '../../stores/toastStore';
import { requestNotificationPermission } from '../../lib/notifications';
import { config } from '../../lib/config';

/** App footer with the browser-notification opt-in and network indicator. */
export function Footer() {
  const enabled = useToastStore((s) => s.browserNotifications);
  const setEnabled = useToastStore((s) => s.setBrowserNotifications);

  const onToggle = async () => {
    if (!enabled) {
      const granted = await requestNotificationPermission();
      setEnabled(granted);
    } else {
      setEnabled(false);
    }
  };

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-medium capitalize">{config.network}</span>
          <span className="text-zinc-400">· frontend-only · live via account subscriptions</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="accent-brand-400"
          />
          Browser notifications
        </label>
      </div>
    </footer>
  );
}
