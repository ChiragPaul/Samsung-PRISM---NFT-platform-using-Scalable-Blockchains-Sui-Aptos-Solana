import { useNetworkCheck } from '../../hooks/useNetworkCheck';

/**
 * Prominent warning when the connected RPC isn't the expected (Devnet) cluster.
 * The app forces Devnet, so this prevents users from accidentally transacting
 * against the wrong network.
 */
export function NetworkBanner() {
  const { isMismatch, expectedNetwork } = useNetworkCheck();
  if (!isMismatch) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950"
    >
      ⚠️ Network mismatch — this dApp requires <strong>{expectedNetwork}</strong>. Switch your RPC /
      wallet network to {expectedNetwork} to transact.
    </div>
  );
}
