import { PublicKey } from '@solana/web3.js';
import type { Cluster } from '@solana/web3.js';

/** Centralized, validated runtime config sourced from Vite env vars. */

const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

/**
 * The live Devnet deployment (initialized as "devnet-marketplace"). Used when
 * VITE_PROGRAM_ID is unset so hosted builds (Vercel/Pages/Codespaces) work
 * without any env configuration.
 */
const DEPLOYED_PROGRAM_ID = 'Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7';

/**
 * Resolve the RPC endpoint, guarding against a common footgun: pasting a
 * provider URL that still contains a PLACEHOLDER api key (e.g. a Helius URL
 * with `YOUR_KEY` / `YOUR_REAL_HELIUS_KEY` left in). Such a URL 401s on every
 * request, which surfaces in the UI as an opaque "Transport error" when
 * sending a transaction. Rather than fail cryptically, fall back to the free
 * public Devnet RPC and warn loudly in the console.
 */
function resolveRpcUrl(raw: string | undefined): string {
  const url = (raw ?? '').trim();
  if (!url) return PUBLIC_DEVNET_RPC;
  const looksLikePlaceholder = /your[_-]?(real[_-]?)?[a-z]*[_-]?key/i.test(url);
  if (looksLikePlaceholder) {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] VITE_RPC_URL still contains a placeholder API key: "${url}". ` +
        `That returns 401 and shows up as a "Transport error". Falling back to ` +
        `${PUBLIC_DEVNET_RPC}. Set VITE_RPC_URL to a real RPC URL (or remove it).`,
    );
    return PUBLIC_DEVNET_RPC;
  }
  return url;
}

const RPC_URL = resolveRpcUrl(import.meta.env.VITE_RPC_URL);

/** Derive a ws:// endpoint from the http(s) RPC if none is provided. */
function deriveWsUrl(http: string): string {
  return http.replace(/^http/, 'ws');
}

export const config = {
  rpcUrl: RPC_URL,
  rpcWsUrl: import.meta.env.VITE_RPC_WS_URL || deriveWsUrl(RPC_URL),
  programId: new PublicKey(import.meta.env.VITE_PROGRAM_ID || DEPLOYED_PROGRAM_ID),
  network: (import.meta.env.VITE_NETWORK || 'devnet') as Cluster,
  marketplaceName: import.meta.env.VITE_MARKETPLACE_NAME || 'devnet-marketplace',
  ai: {
    /**
     * Optional URL of a serverless endpoint that proxies to Claude (keeps the
     * API key server-side). If unset, AI-assist uses a local heuristic.
     */
    proxyUrl: import.meta.env.VITE_AI_PROXY_URL || '',
  },
} as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MAX_FEE_BPS = 10_000;

/** Build a Solana Explorer URL for the configured cluster. */
export function explorerUrl(
  signatureOrAddress: string,
  kind: 'tx' | 'address' = 'tx',
): string {
  const base = `https://explorer.solana.com/${kind}/${signatureOrAddress}`;
  return `${base}?cluster=${config.network}`;
}
