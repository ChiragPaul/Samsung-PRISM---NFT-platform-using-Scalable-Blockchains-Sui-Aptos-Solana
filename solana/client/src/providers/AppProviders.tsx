import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/config';
import { queryClient } from '../lib/queryClient';

// wallet-adapter ships base styles for its modal; we layer Tailwind on top.
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Composes every cross-cutting provider:
 *  - ConnectionProvider: the Devnet RPC + WebSocket endpoint
 *  - WalletProvider: Phantom / Solflare / Coinbase / Trust (+ Backpack and any
 *    other Standard Wallets are auto-detected, so no explicit adapter needed)
 *  - WalletModalProvider: the multi-wallet selection modal
 *  - QueryClientProvider: on-chain data fetching + caching
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider
      endpoint={config.rpcUrl}
      config={{ commitment: 'confirmed', wsEndpoint: config.rpcWsUrl }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
