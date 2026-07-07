import type { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { EmptyState } from '../ui/states';

/** Renders children only when a wallet is connected, else a connect prompt. */
export function ConnectGate({
  children,
  message = 'Connect your wallet to continue.',
}: {
  children: ReactNode;
  message?: string;
}) {
  const { connected } = useWallet();
  if (!connected) {
    return (
      <EmptyState
        title="Wallet not connected"
        description={message}
        icon="🔌"
        action={<WalletMultiButton />}
      />
    );
  }
  return <>{children}</>;
}
