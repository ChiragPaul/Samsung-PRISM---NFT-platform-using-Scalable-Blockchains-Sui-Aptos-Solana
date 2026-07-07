import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { NftImage } from '../../components/NftImage';
import { FavoriteButton } from '../../components/FavoriteButton';
import { RarityBadge } from '../../components/RarityBadge';
import { useTilt } from '../../hooks/useTilt';
import { formatSol, shortenAddress } from '../../lib/utils';
import type { EnrichedListing } from '../../types';

interface ListingCardProps {
  listing: EnrichedListing;
  onBuy: (listing: EnrichedListing) => void;
}

export function ListingCard({ listing, onBuy }: ListingCardProps) {
  const { publicKey } = useWallet();
  const tilt = useTilt(9);
  const isOwn = publicKey?.toBase58() === listing.seller;
  const name = listing.metadata?.name ?? 'Loading…';
  const collection = listing.metadata?.collection;

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={{
        transform:
          'perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateZ(0)',
        transition: 'transform 0.25s ease-out, box-shadow 0.2s, border-color 0.2s',
        transformStyle: 'preserve-3d',
      }}
      className="card group relative flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/20 hover:ring-1 hover:ring-brand-400/50"
    >
      {/* Glossy highlight that follows the cursor. */}
      <div
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.18), transparent 60%)',
        }}
      />
      <Link
        to={`/nft/${listing.nftMint}`}
        className="relative block overflow-hidden"
        aria-label={`View ${name}`}
      >
        <NftImage
          src={listing.metadata?.image ?? null}
          alt={name}
          className="aspect-square w-full transition-transform duration-500 ease-out group-hover:scale-110"
        />
        {/* Subtle bottom gradient for legibility / depth on hover. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute right-2 top-2">
          <FavoriteButton mint={listing.nftMint} />
        </div>
        {listing.rarityTier && (
          <div className="absolute left-2 top-2">
            <RarityBadge tier={listing.rarityTier} rank={listing.rarityRank} />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/nft/${listing.nftMint}`} className="min-w-0">
          <h3 className="truncate font-semibold" title={name}>
            {name}
          </h3>
          {collection && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={collection}>
              {collection}
            </p>
          )}
        </Link>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Price</p>
            <p className="text-lg font-bold tabular-nums">{formatSol(listing.priceSol)} SOL</p>
          </div>
          <p className="text-right text-[10px] text-zinc-400">
            Seller
            <br />
            <span className="font-mono text-zinc-500">{shortenAddress(listing.seller)}</span>
          </p>
        </div>

        <button
          type="button"
          className="btn-primary mt-3 w-full"
          disabled={isOwn}
          onClick={() => onBuy(listing)}
          title={isOwn ? 'You cannot buy your own listing' : undefined}
        >
          {isOwn ? 'Your listing' : 'Buy now'}
        </button>
      </div>
    </div>
  );
}
