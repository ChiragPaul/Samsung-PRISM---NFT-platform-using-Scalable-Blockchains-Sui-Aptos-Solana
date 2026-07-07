import { explorerUrl } from '../lib/config';
import { cn } from '../lib/utils';
import { Spinner } from './ui/Spinner';
import type { TxStatus } from '../types';

const STEPS: { key: TxStatus['stage']; label: string }[] = [
  { key: 'sent', label: 'Sent' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'finalized', label: 'Finalized' },
];

const ORDER: Record<TxStatus['stage'], number> = {
  idle: 0,
  building: 1,
  sent: 2,
  confirmed: 3,
  finalized: 4,
  error: -1,
};

/** Visual tracker of a transaction's lifecycle: sent → confirmed → finalized. */
export function TxStatusTracker({ status }: { status: TxStatus }) {
  if (status.stage === 'idle') return null;

  if (status.stage === 'error') {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {status.error ?? 'Transaction failed.'}
      </p>
    );
  }

  const current = ORDER[status.stage];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const stepOrder = ORDER[step.key];
          const done = current >= stepOrder;
          const active = current === stepOrder;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  done
                    ? 'bg-accent text-zinc-900'
                    : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800',
                )}
              >
                {active && status.stage !== 'finalized' ? <Spinner className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn('text-xs', done ? 'font-semibold' : 'text-zinc-400')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {status.signature && (
        <a
          href={explorerUrl(status.signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:underline"
        >
          View on Solana Explorer ↗
        </a>
      )}
    </div>
  );
}
