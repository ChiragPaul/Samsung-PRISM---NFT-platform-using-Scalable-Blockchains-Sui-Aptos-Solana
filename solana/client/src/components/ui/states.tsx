import type { ReactNode } from 'react';
import { Spinner } from './Spinner';

/** Shared empty / error / loading presentational states used app-wide. */

export function EmptyState({
  title,
  description,
  action,
  icon = '🪙',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <div className="mb-3 text-4xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-300 bg-red-50 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/30"
    >
      <div className="mb-2 text-3xl" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="text-base font-semibold text-red-700 dark:text-red-300">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-red-600/80 dark:text-red-400/80">{description}</p>
      )}
      {onRetry && (
        <button type="button" className="btn-secondary mt-4" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-zinc-500">
      <Spinner />
      {label}
    </div>
  );
}
