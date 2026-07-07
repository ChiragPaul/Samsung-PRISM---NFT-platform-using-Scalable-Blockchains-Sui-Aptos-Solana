import { useMemo, useState } from 'react';
import { usePurchaseNft } from '../../hooks/usePurchaseNft';
import { Spinner } from '../../components/ui/Spinner';
import { formatSol } from '../../lib/utils';
import { notify } from '../../lib/notifications';
import type { EnrichedListing } from '../../types';

/**
 * "Sweep the floor" — buy the N cheapest listings in one action (Blur/Tensor
 * style). Operates on the currently-filtered set so you can sweep a single
 * collection by filtering first.
 */
export function SweepBar({ listings }: { listings: EnrichedListing[] }) {
  const { purchase } = usePurchaseNft();
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);

  const cheapest = useMemo(
    () => [...listings].sort((a, b) => a.priceSol - b.priceSol).slice(0, count),
    [listings, count],
  );
  const total = cheapest.reduce((sum, l) => sum + l.priceSol, 0);
  const max = Math.min(listings.length, 20);

  const sweep = async () => {
    if (cheapest.length === 0) return;
    setBusy(true);
    try {
      let bought = 0;
      for (const listing of cheapest) {
        // eslint-disable-next-line no-await-in-loop
        const sig = await purchase(listing);
        if (sig) bought += 1;
      }
      notify({
        variant: 'success',
        title: `Swept ${bought} NFT${bought === 1 ? '' : 's'} 🧹`,
        description: `Spent ~${formatSol(total)} SOL on the floor.`,
      });
    } finally {
      setBusy(false);
    }
  };

  if (listings.length === 0) return null;

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <span className="text-sm font-bold">🧹 Sweep the floor</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={1}
          max={Math.max(1, max)}
          value={Math.min(count, max)}
          onChange={(e) => setCount(Number(e.target.value))}
          className="accent-brand-400"
          aria-label="Number of NFTs to sweep"
        />
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{Math.min(count, max)}</span>
      </div>
      <span className="text-sm text-zinc-500">
        cheapest {cheapest.length} · ~<span className="font-semibold text-brand-400">{formatSol(total)} SOL</span>
      </span>
      <button type="button" className="btn-primary ml-auto" onClick={sweep} disabled={busy}>
        {busy ? <Spinner /> : `Sweep ${cheapest.length}`}
      </button>
    </div>
  );
}
