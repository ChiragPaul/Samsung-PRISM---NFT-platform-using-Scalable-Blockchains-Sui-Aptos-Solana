import type { FloorInfo } from '../../hooks/useFloorTracker';
import { formatSol } from '../../lib/utils';

/** Compact per-collection floor display, built from observed listing prices. */
export function FloorTicker({ floors }: { floors: FloorInfo[] }) {
  if (floors.length === 0) return null;
  return (
    <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Floors</span>
      {floors.slice(0, 6).map((f) => (
        <div key={f.collection} className="flex items-baseline gap-1.5">
          <span className="max-w-[10rem] truncate text-sm font-medium" title={f.collection}>
            {f.collection}
          </span>
          <span className="text-sm font-bold tabular-nums text-brand-400">
            {formatSol(f.floorSol)} SOL
          </span>
          <span className="text-xs text-zinc-400">({f.count})</span>
        </div>
      ))}
    </div>
  );
}
