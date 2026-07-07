import { useConnection } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { config } from '../lib/config';
import { LISTING_DISCRIMINATOR, decodeListing } from '../lib/anchor/decoders';
import { bs58Encode } from '../lib/solana/encoding';
import { queryKeys } from '../lib/queryClient';
import type { Listing } from '../types';

/**
 * Fetches all active on-chain `Listing` accounts via getProgramAccounts,
 * filtered server-side by the account discriminator. Kept fresh by
 * useRealtimeSync (WebSocket) — no polling.
 */
export function useListings() {
  const { connection } = useConnection();

  return useQuery<Listing[]>({
    queryKey: queryKeys.listings,
    queryFn: async () => {
      const accounts = await connection.getProgramAccounts(config.programId, {
        commitment: 'confirmed',
        filters: [{ memcmp: { offset: 0, bytes: bs58Encode(LISTING_DISCRIMINATOR) } }],
      });
      const listings: Listing[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          listings.push(decodeListing(pubkey, account));
        } catch {
          // Skip accounts that don't decode (e.g. layout drift); never crash the grid.
        }
      }
      return listings;
    },
  });
}

/** Find a single listing in the cached set by mint (cheap, no extra RPC). */
export function findListingByMint(listings: Listing[] | undefined, mint: string) {
  return listings?.find((l) => l.nftMint === mint) ?? null;
}

export function safePublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
