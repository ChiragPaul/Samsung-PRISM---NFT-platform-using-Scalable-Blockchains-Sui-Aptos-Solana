import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { config } from '../lib/config';

/** Genesis hashes for the public clusters, used to detect a network mismatch. */
const GENESIS_HASHES: Record<string, string> = {
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
};

/**
 * Detects when the connected RPC is not the expected (Devnet) cluster. We force
 * Devnet for the dApp, so a mismatch surfaces a prominent warning banner.
 */
export function useNetworkCheck() {
  const { connection } = useConnection();

  const query = useQuery({
    queryKey: ['genesisHash', config.rpcUrl],
    staleTime: Infinity,
    queryFn: () => connection.getGenesisHash(),
  });

  const expected = GENESIS_HASHES[config.network] ?? GENESIS_HASHES.devnet;
  const actual = query.data;
  const isMismatch = Boolean(actual && actual !== expected);

  return {
    expectedNetwork: config.network,
    isMismatch,
    isLoading: query.isLoading,
  };
}
