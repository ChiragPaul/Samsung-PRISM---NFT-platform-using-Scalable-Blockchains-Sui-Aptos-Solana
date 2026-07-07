import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNftMetadata } from '../../hooks/useNftMetadata';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import { useNftOwner } from '../../hooks/useNftOwner';
import { usePriceHistoryStore } from '../../stores/priceHistoryStore';
import { NftImage } from '../../components/NftImage';
import { FavoriteButton } from '../../components/FavoriteButton';
import { OwnerBadge } from '../../components/OwnerBadge';
import { RarityBadge } from '../../components/RarityBadge';
import { PriceSparkline } from '../../components/PriceSparkline';
import { LoadingState } from '../../components/ui/states';
import { BuyModal } from '../marketplace/BuyModal';
import { DelistButton } from '../portfolio/DelistButton';
import { WatchlistAlert } from './WatchlistAlert';
import { notify } from '../../lib/notifications';
import { explorerUrl } from '../../lib/config';
import { formatSol, isValidPublicKey, shortenAddress } from '../../lib/utils';

/** Shareable deep-link page for a single NFT/listing. */
export function NftDetailPage() {
  const { mint = '' } = useParams();
  const { publicKey } = useWallet();
  const { data: metadata, isLoading } = useNftMetadata(isValidPublicKey(mint) ? mint : null);
  const { listings } = useEnrichedListings();
  const history = usePriceHistoryStore((s) => s.history[mint] ?? []);
  const [buying, setBuying] = useState(false);

  const listing = useMemo(() => listings.find((l) => l.nftMint === mint) ?? null, [listings, mint]);
  const isOwnListing = listing?.seller === publicKey?.toBase58();
  const ownership = useNftOwner(isValidPublicKey(mint) ? mint : null);

  if (!isValidPublicKey(mint)) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">Invalid NFT address.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Back to marketplace
        </Link>
      </div>
    );
  }

  if (isLoading) return <LoadingState label="Loading NFT…" />;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify({ variant: 'success', title: 'Link copied', description: 'Share this NFT anywhere.' });
    } catch {
      notify({ variant: 'info', title: 'Copy this URL', description: window.location.href });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="relative">
        <NftImage
          src={metadata?.image ?? null}
          alt={metadata?.name ?? 'NFT'}
          className="aspect-square w-full rounded-2xl"
        />
        <div className="absolute right-3 top-3">
          <FavoriteButton mint={mint} />
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">{metadata?.name ?? shortenAddress(mint)}</h1>
            {listing?.rarityTier && <RarityBadge tier={listing.rarityTier} rank={listing.rarityRank} />}
          </div>
          {metadata?.collection && (
            <p className="text-sm text-zinc-500">{metadata.collection}</p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs">
            <a
              href={explorerUrl(mint, 'address')}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-brand-400 hover:underline"
            >
              {shortenAddress(mint, 6)} ↗
            </a>
            <button type="button" onClick={share} className="text-zinc-500 hover:underline">
              🔗 Share
            </button>
          </div>
        </div>

        {metadata?.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{metadata.description}</p>
        )}

        {/* Ownership — the core of an NFT: who holds it right now. */}
        <OwnerBadge ownership={ownership} listed={Boolean(listing)} />

        <div className="card p-5">
          {listing ? (
            <>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Listed for</p>
              <p className="text-3xl font-extrabold">{formatSol(listing.priceSol)} SOL</p>
              <p className="mt-1 text-xs text-zinc-400">
                Seller {shortenAddress(listing.seller)}
              </p>
              <div className="mt-4">
                {isOwnListing ? (
                  <DelistButton listing={listing} />
                ) : (
                  <button type="button" className="btn-primary w-full" onClick={() => setBuying(true)}>
                    Buy now
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Not currently listed on this marketplace.</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-2 text-sm font-bold">Price history (session)</h3>
          <PriceSparkline points={history} />
        </div>

        {listing && <WatchlistAlert mint={mint} />}

        {metadata && metadata.attributes.length > 0 && (
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-bold">Traits</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metadata.attributes.map((attr, i) => (
                <div
                  key={`${attr.trait_type}-${i}`}
                  className="rounded-lg bg-zinc-100 p-2 text-center dark:bg-zinc-800/60"
                >
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                    {attr.trait_type}
                  </p>
                  <p className="truncate text-sm font-semibold">{String(attr.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {listing && buying && (
        <BuyModal listing={listing} onClose={() => setBuying(false)} />
      )}
    </div>
  );
}
