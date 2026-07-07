import { useMemo } from 'react';
import { useListings } from './useListings';
import { useNftMetadataBatch } from './useNftMetadata';
import { computeRarity } from '../lib/rarity';
import type { EnrichedListing } from '../types';

/**
 * The marketplace's primary data hook: on-chain listings joined with resolved
 * Metaplex metadata, with client-side rarity scoring computed across the
 * loaded set.
 */
export function useEnrichedListings() {
  const listingsQuery = useListings();
  const mints = useMemo(
    () => (listingsQuery.data ?? []).map((l) => l.nftMint),
    [listingsQuery.data],
  );
  const { metadataByMint, isLoading: metadataLoading } = useNftMetadataBatch(mints);

  const enriched = useMemo<EnrichedListing[]>(() => {
    const base = (listingsQuery.data ?? []).map((listing) => ({
      ...listing,
      metadata: metadataByMint[listing.nftMint] ?? null,
    }));
    return computeRarity(base);
  }, [listingsQuery.data, metadataByMint]);

  return {
    listings: enriched,
    isLoading: listingsQuery.isLoading,
    isMetadataLoading: metadataLoading,
    isError: listingsQuery.isError,
    error: listingsQuery.error,
    refetch: listingsQuery.refetch,
  };
}
