import { useActivityStore } from '../../stores/activityStore';
import { formatRelativeTime, shortenAddress } from '../../lib/utils';
import type { ActivityKind } from '../../types';

const KIND_META: Record<ActivityKind, { icon: string; label: string; color: string }> = {
  list: { icon: '🏷️', label: 'Listed', color: 'text-sky-500' },
  sale: { icon: '💸', label: 'Sold', color: 'text-emerald-500' },
  delist: { icon: '↩️', label: 'Delisted', color: 'text-amber-500' },
  fee_update: { icon: '⚙️', label: 'Fee updated', color: 'text-fuchsia-500' },
};

/**
 * Live activity feed derived purely client-side from the program-account /
 * logs subscription. Resets each session (honest scope for a backendless feed).
 */
export function ActivityFeed() {
  const events = useActivityStore((s) => s.events);

  return (
    <aside className="card p-4" aria-label="Live activity feed">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Live activity</h2>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          on-chain
        </span>
      </div>
      {events.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-400">
          Watching the chain… activity will appear here in real time.
        </p>
      ) : (
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {events.map((e) => {
            const meta = KIND_META[e.kind];
            return (
              <li key={e.id} className="flex items-center gap-2 text-xs">
                <span aria-hidden="true">{meta.icon}</span>
                <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                {e.mint && <span className="font-mono text-zinc-400">{shortenAddress(e.mint)}</span>}
                {e.priceSol != null && <span className="tabular-nums">{e.priceSol} SOL</span>}
                <span className="ml-auto text-zinc-400">{formatRelativeTime(Math.floor(e.timestamp / 1000))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
