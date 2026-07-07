import { useEffect } from 'react';
import { useToastStore, type Toast } from '../../stores/toastStore';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';

const VARIANT_STYLES: Record<Toast['variant'], string> = {
  success: 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40',
  error: 'border-red-500/40 bg-red-50 dark:bg-red-950/40',
  info: 'border-sky-500/40 bg-sky-50 dark:bg-sky-950/40',
  pending: 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/40',
};

const VARIANT_ICON: Record<Toast['variant'], string> = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️',
  pending: '⏳',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const id = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-80 animate-fade-in items-start gap-3 rounded-xl border p-3 shadow-lg',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <span className="mt-0.5 text-base" aria-hidden="true">
        {toast.variant === 'pending' ? <Spinner /> : VARIANT_ICON[toast.variant]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 break-words text-xs text-zinc-600 dark:text-zinc-300">
            {toast.description}
          </p>
        )}
        {toast.href && (
          <a
            href={toast.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-brand-400 hover:underline"
          >
            View ↗
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
      >
        ×
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
