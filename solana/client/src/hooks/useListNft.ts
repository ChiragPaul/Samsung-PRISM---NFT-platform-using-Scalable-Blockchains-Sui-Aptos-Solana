import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useMarketplaceClient } from './useMarketplaceClient';
import { useTxRunner } from './useTxRunner';
import { ensureMarketplaceReady } from './ensureMarketplaceReady';
import { findListingPda, findVaultPda } from '../lib/anchor/pdas';
import { solToLamports } from '../lib/anchor/feeMath';
import { LAMPORTS_PER_SOL } from '../lib/config';
import { queryKeys } from '../lib/queryClient';
import type { Listing } from '../types';

/** Lists an owned NFT into escrow at a SOL price, with optimistic insertion. */
export function useListNft() {
  const client = useMarketplaceClient();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { status, run, reset } = useTxRunner();

  const list = useCallback(
    async (mint: string, priceSol: number) => {
      if (!publicKey) return null;
      if (!(await ensureMarketplaceReady(client))) return null;
      const nftMint = new PublicKey(mint);
      const priceLamports = solToLamports(priceSol);
      const ix = await client.listNftIx(publicKey, nftMint, priceLamports);

      const [listingPda] = findListingPda(client.marketplace, nftMint);
      const [vaultPda] = findVaultPda(client.marketplace, nftMint);

      return run([ix], {
        // Listing inits a PDA listing account + a token-account vault and runs a
        // token-transfer CPI — give it headroom over the 200k default.
        computeUnitLimit: 300_000,
        pendingTitle: 'Listing NFT…',
        successTitle: 'NFT listed',
        successDescription: `Listed for ${priceSol} SOL. It's now in escrow.`,
        optimisticUpdate: () => {
          const optimistic: Listing = {
            address: listingPda.toBase58(),
            seller: publicKey.toBase58(),
            nftMint: mint,
            vault: vaultPda.toBase58(),
            priceLamports,
            priceSol: priceLamports / LAMPORTS_PER_SOL,
            createdAt: Math.floor(Date.now() / 1000),
          };
          const prev = queryClient.getQueryData<Listing[]>(queryKeys.listings) ?? [];
          queryClient.setQueryData<Listing[]>(queryKeys.listings, [...prev, optimistic]);
          return () => queryClient.setQueryData<Listing[]>(queryKeys.listings, prev);
        },
        onConfirmed: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings });
          if (publicKey) {
            queryClient.invalidateQueries({ queryKey: queryKeys.ownedNfts(publicKey.toBase58()) });
          }
        },
      });
    },
    [client, publicKey, queryClient, run],
  );

  return { list, status, reset };
}
