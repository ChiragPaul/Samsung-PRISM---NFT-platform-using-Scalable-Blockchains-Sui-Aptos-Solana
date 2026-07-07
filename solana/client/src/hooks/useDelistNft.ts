import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useMarketplaceClient } from './useMarketplaceClient';
import { useTxRunner } from './useTxRunner';
import { ensureMarketplaceReady } from './ensureMarketplaceReady';
import { queryKeys } from '../lib/queryClient';
import type { Listing } from '../types';

/** Cancels the caller's own listing, returning the NFT from escrow. */
export function useDelistNft() {
  const client = useMarketplaceClient();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { status, run, reset } = useTxRunner();

  const delist = useCallback(
    async (listing: Listing) => {
      if (!publicKey) return null;
      if (!(await ensureMarketplaceReady(client))) return null;
      const ix = await client.delistNftIx(publicKey, new PublicKey(listing.nftMint));

      return run([ix], {
        pendingTitle: 'Delisting NFT…',
        successTitle: 'NFT delisted',
        successDescription: 'It has been returned to your wallet.',
        optimisticUpdate: () => {
          const prev = queryClient.getQueryData<Listing[]>(queryKeys.listings) ?? [];
          queryClient.setQueryData<Listing[]>(
            queryKeys.listings,
            prev.filter((l) => l.address !== listing.address),
          );
          return () => queryClient.setQueryData<Listing[]>(queryKeys.listings, prev);
        },
        onConfirmed: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings });
          queryClient.invalidateQueries({
            queryKey: queryKeys.ownedNfts(publicKey.toBase58()),
          });
        },
      });
    },
    [client, publicKey, queryClient, run],
  );

  return { delist, status, reset };
}
