import { Link } from 'react-router-dom';
import { useNftMetadata } from '../hooks/useNftMetadata';
import { NftImage } from './NftImage';
import { shortenAddress } from '../lib/utils';

/** Compact, self-resolving NFT tile keyed by mint (used in favorites/organizer). */
export function NftTile({ mint, linked = true }: { mint: string; linked?: boolean }) {
  const { data } = useNftMetadata(mint);
  const inner = (
    <>
      <NftImage src={data?.image ?? null} alt={data?.name ?? mint} className="aspect-square w-full rounded-lg" />
      <p className="mt-1.5 truncate text-xs font-medium" title={data?.name ?? mint}>
        {data?.name ?? shortenAddress(mint)}
      </p>
    </>
  );
  if (!linked) return <div>{inner}</div>;
  return (
    <Link to={`/nft/${mint}`} className="block">
      {inner}
    </Link>
  );
}
