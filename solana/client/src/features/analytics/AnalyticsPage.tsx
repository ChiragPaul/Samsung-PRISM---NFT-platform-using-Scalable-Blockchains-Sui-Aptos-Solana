import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import { useActivityStore } from '../../stores/activityStore';
import { NftImage } from '../../components/NftImage';
import { RarityBadge } from '../../components/RarityBadge';
import { CountUp } from '../../components/CountUp';
import { EmptyState } from '../../components/ui/states';
import { formatSol, shortenAddress } from '../../lib/utils';
import type { EnrichedListing } from '../../types';

interface CollectionStat {
  name: string;
  count: number;
  floorSol: number;
  avgSol: number;
  topSol: number;
}

export function AnalyticsPage() {
  const { listings } = useEnrichedListings();
  const events = useActivityStore((s) => s.events);

  const collections = useMemo<CollectionStat[]>(() => {
    const map = new Map<string, number[]>();
    for (const l of listings) {
      const key = l.metadata?.collection ?? 'Uncategorized';
      const arr = map.get(key) ?? [];
      arr.push(l.priceSol);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([name, prices]) => ({
        name,
        count: prices.length,
        floorSol: Math.min(...prices),
        topSol: Math.max(...prices),
        avgSol: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [listings]);

  const rarest = useMemo<EnrichedListing[]>(
    () => [...listings].filter((l) => l.rarityRank).sort((a, b) => (a.rarityRank ?? 1e9) - (b.rarityRank ?? 1e9)).slice(0, 6),
    [listings],
  );

  const sales = useMemo(() => events.filter((e) => e.kind === 'sale'), [events]);
  const sessionVolume = useMemo(
    () => sales.reduce((sum, e) => sum + (e.priceSol ?? 0), 0),
    [sales],
  );
  const globalFloor = listings.length ? Math.min(...listings.map((l) => l.priceSol)) : 0;

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="Analytics populate as listings appear and trades happen."
        icon="📊"
        action={
          <Link to="/" className="btn-primary">
            Go to marketplace
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Analytics</h1>
        <p className="text-sm text-zinc-500">Live marketplace stats, floors, and rarity rankings.</p>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Active listings" icon="🛒">
          <CountUp value={listings.length} />
        </Kpi>
        <Kpi label="Collections" icon="🗂️">
          <CountUp value={collections.length} />
        </Kpi>
        <Kpi label="Floor price" icon="📉">
          <CountUp value={globalFloor} decimals={2} suffix=" SOL" />
        </Kpi>
        <Kpi label="Volume (session)" icon="💸">
          <CountUp value={sessionVolume} decimals={2} suffix=" SOL" />
        </Kpi>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Collection leaderboard */}
        <div className="card overflow-hidden">
          <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-bold dark:border-white/10">
            Collections by listings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-5 py-2 font-medium">Collection</th>
                  <th className="px-3 py-2 text-right font-medium">Floor</th>
                  <th className="px-3 py-2 text-right font-medium">Avg</th>
                  <th className="px-3 py-2 text-right font-medium">Top</th>
                  <th className="px-5 py-2 text-right font-medium">Listed</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.name} className="border-t border-zinc-100 dark:border-white/5">
                    <td className="max-w-[12rem] truncate px-5 py-2.5 font-medium" title={c.name}>
                      {c.name}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand-400">{formatSol(c.floorSol)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatSol(c.avgSol)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatSol(c.topSol)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent sales feed */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold">Recent sales</h2>
          {sales.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">
              No sales yet this session — buy something to see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {sales.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-400">{e.mint ? shortenAddress(e.mint) : '—'}</span>
                  <span className="font-semibold text-emerald-500">{formatSol(e.priceSol ?? 0)} SOL</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Rarity leaderboard */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">Rarity leaderboard</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {rarest.map((l) => (
            <Link key={l.address} to={`/nft/${l.nftMint}`} className="card overflow-hidden">
              <NftImage src={l.metadata?.image ?? null} alt={l.metadata?.name ?? 'NFT'} className="aspect-square w-full" />
              <div className="p-2">
                <div className="mb-1">
                  <RarityBadge tier={l.rarityTier} rank={l.rarityRank} />
                </div>
                <p className="truncate text-xs font-medium">{l.metadata?.name ?? shortenAddress(l.nftMint)}</p>
                <p className="text-xs font-bold text-brand-400">{formatSol(l.priceSol)} SOL</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-1 text-lg" aria-hidden="true">
        {icon}
      </div>
      <p className="text-xl font-extrabold tabular-nums">{children}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}
