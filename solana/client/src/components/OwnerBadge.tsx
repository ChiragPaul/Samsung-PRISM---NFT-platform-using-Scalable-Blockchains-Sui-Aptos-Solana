import { explorerUrl } from '../lib/config';
import { shortenAddress } from '../lib/utils';
import type { NftOwnership } from '../hooks/useNftOwner';

/**
 * Prominent ownership display — the defining fact of an NFT. Shows the current
 * holder, highlights when it's you, and notes when an item is in marketplace
 * escrow (held by the program until it sells or is delisted).
 */
export function OwnerBadge({
  ownership,
  listed,
}: {
  ownership: NftOwnership;
  listed: boolean;
}) {
  const { owner, isYou, isLoading } = ownership;

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
            isYou ? 'bg-accent/20 text-accent' : 'bg-brand-400/15 text-brand-400'
          }`}
          aria-hidden="true"
        >
          {isYou ? '👑' : '👤'}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Owned by</p>
          {isLoading ? (
            <span className="text-sm text-zinc-400">Resolving owner…</span>
          ) : owner ? (
            <a
              href={explorerUrl(owner, 'address')}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-semibold hover:text-brand-400 hover:underline"
            >
              {isYou ? 'You' : shortenAddress(owner, 5)}
            </a>
          ) : (
            <span className="text-sm text-zinc-400">Unknown</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isYou && (
          <span className="pill bg-accent/15 text-accent ring-1 ring-inset ring-accent/30">
            You own this
          </span>
        )}
        {listed && (
          <span
            className="pill bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400"
            title="Held in the marketplace escrow vault until it sells or is delisted"
          >
            In escrow
          </span>
        )}
      </div>
    </div>
  );
}
