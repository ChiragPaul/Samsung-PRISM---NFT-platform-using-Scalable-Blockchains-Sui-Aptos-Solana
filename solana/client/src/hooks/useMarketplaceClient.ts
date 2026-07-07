import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { MarketplaceClient } from '../lib/anchor/program';
import { config } from '../lib/config';

/**
 * Builds a MarketplaceClient bound to the current connection + (optional)
 * wallet. Recreated only when the wallet identity changes. Read paths work
 * without a wallet; write paths require one (enforced at send time).
 */
export function useMarketplaceClient(): MarketplaceClient {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(
    () => new MarketplaceClient(connection, wallet, config.marketplaceName),
    // connection is stable from the provider; key on the wallet pubkey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connection, wallet?.publicKey?.toBase58()],
  );
}
