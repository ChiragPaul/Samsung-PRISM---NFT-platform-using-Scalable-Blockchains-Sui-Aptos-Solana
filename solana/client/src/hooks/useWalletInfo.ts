import { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeAccount, removeSubscription } from '../lib/solana/subscriptions';
import { queryKeys } from '../lib/queryClient';
import { LAMPORTS_PER_SOL } from '../lib/config';

/** SOL balance for the connected wallet, kept live via onAccountChange. */
export function useBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const owner = publicKey?.toBase58() ?? '';

  const query = useQuery({
    queryKey: queryKeys.balance(owner),
    enabled: Boolean(publicKey),
    queryFn: async () => {
      const lamports = await connection.getBalance(publicKey!, 'confirmed');
      return { lamports, sol: lamports / LAMPORTS_PER_SOL };
    },
  });

  useEffect(() => {
    if (!publicKey) return;
    const id = subscribeAccount(connection, publicKey, (info) => {
      const lamports = info?.lamports ?? 0;
      queryClient.setQueryData(queryKeys.balance(owner), {
        lamports,
        sol: lamports / LAMPORTS_PER_SOL,
      });
    });
    return () => removeSubscription(connection, id);
  }, [connection, publicKey, owner, queryClient]);

  return query;
}
