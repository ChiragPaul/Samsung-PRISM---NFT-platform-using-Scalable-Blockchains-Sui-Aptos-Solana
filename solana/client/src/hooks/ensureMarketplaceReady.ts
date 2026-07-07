import { MarketplaceNotReadyError } from '../lib/anchor/program';
import type { MarketplaceClient } from '../lib/anchor/program';
import { notify } from '../lib/notifications';

/**
 * Runs the client's pre-flight check before a trade. On failure it raises a
 * clear, actionable toast (program not deployed / marketplace not initialized)
 * and returns `false` so the caller can bail out *before* prompting the wallet
 * — sparing the user the opaque "Simulation failed" dead-end. Returns `true`
 * when the marketplace is live and the trade can proceed.
 *
 * @param requireInitialized pass `false` for the admin initialize flow.
 */
export async function ensureMarketplaceReady(
  client: MarketplaceClient,
  requireInitialized = true,
): Promise<boolean> {
  try {
    await client.assertReady(requireInitialized);
    return true;
  } catch (err) {
    if (err instanceof MarketplaceNotReadyError) {
      notify({
        variant: 'error',
        title: 'Marketplace not ready',
        description: err.message,
        duration: 9000,
      });
      return false;
    }
    // An unexpected RPC error shouldn't silently block the trade; let the
    // normal tx path surface it.
    return true;
  }
}
