import { useMemo } from 'react';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import { useActivityStore } from '../../stores/activityStore';
import { formatSol, shortenAddress } from '../../lib/utils';

interface TickerItem {
  key: string;
  icon: string;
  label: string;
  value: string;
  tone: string;
}

/**
 * A continuously scrolling marquee of live market data — collection floors and
 * recent on-chain activity — to give the app a "trading floor" pulse. Pauses on
 * hover; hidden for motion-reduced users.
 */
export function Ticker() {
  const { listings } = useEnrichedListings();
  const events = useActivityStore((s) => s.events);

  const items = useMemo<TickerItem[]>(() => {
    const floors = new Map<string, number>();
    for (const l of listings) {
      const c = l.metadata?.collection;
      if (!c) continue;
      floors.set(c, Math.min(floors.get(c) ?? Infinity, l.priceSol));
    }
    const floorItems: TickerItem[] = [...floors.entries()].slice(0, 8).map(([c, f]) => ({
      key: `floor-${c}`,
      icon: '📊',
      label: c,
      value: `${formatSol(f)} SOL`,
      tone: 'text-brand-400',
    }));

    const activityItems: TickerItem[] = events.slice(0, 8).map((e) => ({
      key: `act-${e.id}`,
      icon: e.kind === 'sale' ? '💸' : e.kind === 'list' ? '🏷️' : '↩️',
      label: e.kind === 'sale' ? 'Sold' : e.kind === 'list' ? 'Listed' : 'Delisted',
      value: e.mint ? `${shortenAddress(e.mint)}${e.priceSol != null ? ` · ${formatSol(e.priceSol)} SOL` : ''}` : '',
      tone: e.kind === 'sale' ? 'text-emerald-500' : 'text-zinc-400',
    }));

    // Interleave floors + activity.
    const merged: TickerItem[] = [];
    const max = Math.max(floorItems.length, activityItems.length);
    for (let i = 0; i < max; i++) {
      if (floorItems[i]) merged.push(floorItems[i]);
      if (activityItems[i]) merged.push(activityItems[i]);
    }
    return merged;
  }, [listings, events]);

  if (items.length === 0) return null;

  // Duplicate the row so the marquee loops seamlessly.
  const row = [...items, ...items];

  return (
    <div className="group/ticker overflow-hidden border-b border-zinc-200/70 bg-white/60 backdrop-blur dark:border-white/5 dark:bg-zinc-950/50">
      <div className="flex w-max animate-marquee gap-8 py-2 group-hover/ticker:[animation-play-state:paused] motion-reduce:animate-none">
        {row.map((item, i) => (
          <span key={`${item.key}-${i}`} className="flex shrink-0 items-center gap-1.5 text-xs">
            <span aria-hidden="true">{item.icon}</span>
            <span className="font-semibold">{item.label}</span>
            <span className={`tabular-nums ${item.tone}`}>{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
