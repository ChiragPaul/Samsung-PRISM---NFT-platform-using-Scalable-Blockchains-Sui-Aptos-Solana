import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useOwnedNfts } from '../../hooks/useOwnedNfts';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import { NftImage } from '../../components/NftImage';
import { FavoriteButton } from '../../components/FavoriteButton';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/states';
import { ConnectGate } from '../../components/wallet/ConnectGate';
import { ListNftModal } from './ListNftModal';
import { DelistButton } from './DelistButton';
import { toCsv, downloadCsv } from '../../lib/csv';
import { formatSol, shortenAddress } from '../../lib/utils';
import { Link } from 'react-router-dom';
import type { OwnedNft } from '../../types';

type Tab = 'owned' | 'listings';

export function PortfolioPage() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>('owned');
  const [listing, setListing] = useState<OwnedNft | null>(null);

  const owned = useOwnedNfts();
  const { listings } = useEnrichedListings();

  const me = publicKey?.toBase58();
  const myListings = useMemo(
    () => listings.filter((l) => l.seller === me),
    [listings, me],
  );

  const exportOwned = () => {
    const csv = toCsv(
      ['Name', 'Collection', 'Mint', 'Token Account'],
      owned.nfts.map((n) => [n.metadata?.name ?? '', n.metadata?.collection ?? '', n.mint, n.tokenAccount]),
    );
    downloadCsv('portfolio-owned.csv', csv);
  };

  const exportListings = () => {
    const csv = toCsv(
      ['Name', 'Collection', 'Mint', 'Price (SOL)', 'Listing PDA', 'Listed At'],
      myListings.map((l) => [
        l.metadata?.name ?? '',
        l.metadata?.collection ?? '',
        l.nftMint,
        l.priceSol,
        l.address,
        new Date(l.createdAt * 1000).toISOString(),
      ]),
    );
    downloadCsv('portfolio-listings.csv', csv);
  };

  return (
    <ConnectGate message="Connect your wallet to view your NFTs and listings.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Portfolio</h1>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportOwned}>
              ⬇ Export owned CSV
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={exportListings}>
              ⬇ Export listings CSV
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800" role="tablist">
          <TabButton active={tab === 'owned'} onClick={() => setTab('owned')}>
            Owned NFTs ({owned.nfts.length})
          </TabButton>
          <TabButton active={tab === 'listings'} onClick={() => setTab('listings')}>
            My Active Listings ({myListings.length})
          </TabButton>
        </div>

        {tab === 'owned' ? (
          owned.isLoading ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Grid>
          ) : owned.nfts.length === 0 ? (
            <EmptyState
              title="No NFTs in this wallet"
              description="Mint one to get started — it'll appear here, ready to list."
              icon="🎨"
              action={
                <Link to="/mint" className="btn-primary">
                  Mint an NFT
                </Link>
              }
            />
          ) : (
            <Grid>
              {owned.nfts.map((nft) => (
                <div key={nft.mint} className="card flex flex-col overflow-hidden">
                  <Link to={`/nft/${nft.mint}`} className="relative block">
                    <NftImage
                      src={nft.metadata?.image ?? null}
                      alt={nft.metadata?.name ?? 'NFT'}
                      className="aspect-square w-full"
                    />
                    <div className="absolute right-2 top-2">
                      <FavoriteButton mint={nft.mint} />
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="truncate text-sm font-semibold">
                      {nft.metadata?.name ?? shortenAddress(nft.mint)}
                    </p>
                    {nft.metadata?.collection && (
                      <p className="truncate text-xs text-zinc-500">{nft.metadata.collection}</p>
                    )}
                    <button
                      type="button"
                      className="btn-primary mt-3 w-full"
                      onClick={() => setListing(nft)}
                    >
                      List for sale
                    </button>
                  </div>
                </div>
              ))}
            </Grid>
          )
        ) : myListings.length === 0 ? (
          <EmptyState
            title="No active listings"
            description="List an NFT from the Owned tab to see it here."
            icon="🏷️"
          />
        ) : (
          <Grid>
            {myListings.map((l) => (
              <div key={l.address} className="card flex flex-col overflow-hidden">
                <Link to={`/nft/${l.nftMint}`} className="block">
                  <NftImage
                    src={l.metadata?.image ?? null}
                    alt={l.metadata?.name ?? 'NFT'}
                    className="aspect-square w-full"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <p className="truncate text-sm font-semibold">
                    {l.metadata?.name ?? shortenAddress(l.nftMint)}
                  </p>
                  <p className="text-sm font-bold">{formatSol(l.priceSol)} SOL</p>
                  <div className="mt-3">
                    <DelistButton listing={l} />
                  </div>
                </div>
              </div>
            ))}
          </Grid>
        )}

        <ListNftModal nft={listing} onClose={() => setListing(null)} />
      </div>
    </ConnectGate>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-brand-400 text-brand-400'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
