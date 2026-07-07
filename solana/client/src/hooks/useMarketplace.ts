import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { findMarketplacePda } from '../lib/anchor/pdas';
import { decodeMarketplace } from '../lib/anchor/decoders';
import { subscribeAccount, removeSubscription } from '../lib/solana/subscriptions';
import { queryKeys } from '../lib/queryClient';
import { config } from '../lib/config';
import type { Marketplace } from '../types';

/**
 * Fetches the marketplace config account and keeps it live via an
 * onAccountChange subscription (fee updates, listing counter). Returns
 * `null` data (not an error) when the marketplace hasn't been initialized yet.
 */
export function useMarketplace() {
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const [marketplacePda] = findMarketplacePda(config.marketplaceName);

  const query = useQuery<Marketplace | null>({
    queryKey: queryKeys.marketplace,
    queryFn: async () => {
      const info = await connection.getAccountInfo(marketplacePda, 'confirmed');
      if (!info) return null;
      return decodeMarketplace(marketplacePda, info);
    },
  });

  useEffect(() => {
    const id = subscribeAccount(connection, marketplacePda, (info) => {
      if (!info) {
        queryClient.setQueryData(queryKeys.marketplace, null);
        return;
      }
      try {
        queryClient.setQueryData(
          queryKeys.marketplace,
          decodeMarketplace(marketplacePda, info),
        );
      } catch {
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
      }
    });
    return () => removeSubscription(connection, id);
  }, [connection, marketplacePda, queryClient]);

  return query;
}
