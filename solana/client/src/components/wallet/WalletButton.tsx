import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBalance } from '../../hooks/useWalletInfo';
import { formatSol } from '../../lib/utils';

/**
 * Wallet connect/disconnect + multi-wallet modal (provided by
 * WalletMultiButton) plus the live SOL balance pill for the connected wallet.
 */
export function WalletButton() {
  const { connected } = useWallet();
  const { data, isLoading } = useBalance();

  return (
    <div className="flex items-center gap-2">
      {connected && (
        <span
          className="hidden rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-semibold tabular-nums dark:bg-zinc-800 sm:inline-flex"
          title="Wallet SOL balance"
        >
          {isLoading ? '…' : `${formatSol(data?.sol ?? 0)} SOL`}
        </span>
      )}
      <WalletMultiButton />
    </div>
  );
}
