import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMarketplaceClient } from './useMarketplaceClient';
import { useTxRunner } from './useTxRunner';
import { ensureMarketplaceReady } from './ensureMarketplaceReady';
import { useMarketplace } from './useMarketplace';
import { queryKeys } from '../lib/queryClient';
import { config } from '../lib/config';

/**
 * Admin-only actions (updateFee, initializeMarketplace). The connected wallet
 * must equal the marketplace authority — guarded both here and in the UI.
 */
export function useAdminActions() {
  const client = useMarketplaceClient();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { data: marketplace } = useMarketplace();
  const { status, run, reset } = useTxRunner();

  const isAuthority = Boolean(
    publicKey && marketplace && marketplace.authority === publicKey.toBase58(),
  );

  const updateFee = useCallback(
    async (feeBps: number) => {
      if (!publicKey) return null;
      if (!isAuthority) throw new Error('Only the marketplace authority can update the fee.');
      const ix = await client.updateFeeIx(publicKey, feeBps);
      return run([ix], {
        pendingTitle: 'Updating fee…',
        successTitle: 'Marketplace fee updated',
        successDescription: `New fee: ${(feeBps / 100).toFixed(2)}%`,
        onConfirmed: () => queryClient.invalidateQueries({ queryKey: queryKeys.marketplace }),
      });
    },
    [client, publicKey, isAuthority, run, queryClient],
  );

  const initializeMarketplace = useCallback(
    async (name: string, feeBps: number) => {
      if (!publicKey) return null;
      // Only require the program to be deployed; this call *creates* the
      // marketplace account, so don't require it to already exist.
      if (!(await ensureMarketplaceReady(client, false))) return null;
      const ix = await client.initializeMarketplaceIx(publicKey, name, feeBps);
      return run([ix], {
        pendingTitle: 'Initializing marketplace…',
        successTitle: 'Marketplace initialized',
        successDescription: `"${name}" created with a ${(feeBps / 100).toFixed(2)}% fee.`,
        onConfirmed: () => queryClient.invalidateQueries({ queryKey: queryKeys.marketplace }),
      });
    },
    [client, publicKey, run, queryClient],
  );

  return {
    isAuthority,
    marketplaceName: config.marketplaceName,
    updateFee,
    initializeMarketplace,
    status,
    reset,
  };
}
