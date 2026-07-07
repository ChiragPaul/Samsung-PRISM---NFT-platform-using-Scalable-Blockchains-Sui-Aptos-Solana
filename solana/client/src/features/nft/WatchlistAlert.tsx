import { useState } from 'react';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { notify } from '../../lib/notifications';

/** Set/clear a client-side price-drop alert for a mint. */
export function WatchlistAlert({ mint }: { mint: string }) {
  const alert = useWatchlistStore((s) => s.alerts[mint]);
  const setAlert = useWatchlistStore((s) => s.setAlert);
  const removeAlert = useWatchlistStore((s) => s.removeAlert);
  const [value, setValue] = useState(alert ? String(alert.thresholdSol) : '');

  return (
    <div className="card p-4">
      <h3 className="mb-1 text-sm font-bold">Price alert</h3>
      <p className="mb-2 text-xs text-zinc-500">
        Notify me when this listing drops to or below a price (evaluated locally from live updates).
      </p>
      {alert ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">
            Active at <strong>≤ {alert.thresholdSol} SOL</strong>
          </span>
          <button
            type="button"
            className="btn-ghost text-xs text-red-500"
            onClick={() => {
              removeAlert(mint);
              setValue('');
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(value);
            if (Number.isFinite(n) && n > 0) {
              setAlert(mint, n);
              notify({ variant: 'info', title: 'Price alert set', description: `≤ ${n} SOL` });
            }
          }}
        >
          <input
            type="number"
            min={0}
            step="0.1"
            className="input max-w-[8rem]"
            placeholder="SOL"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Alert threshold in SOL"
          />
          <button type="submit" className="btn-secondary">
            Set alert
          </button>
        </form>
      )}
    </div>
  );
}
