import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  fetchDigitalAsset,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import type { Umi } from '@metaplex-foundation/umi';
import { config } from '../config';
import type { NftAttribute, NftMetadata } from '../../types';

/** Shared Umi instance configured for the marketplace cluster. */
let umi: Umi | null = null;
function getUmi(): Umi {
  if (!umi) {
    umi = createUmi(config.rpcUrl).use(mplTokenMetadata());
  }
  return umi;
}

/** Normalize IPFS / Arweave URIs to fetchable HTTPS gateways. */
export function normalizeUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`;
  }
  if (uri.startsWith('ar://')) {
    return `https://arweave.net/${uri.slice('ar://'.length)}`;
  }
  return uri;
}

interface OffChainJson {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  attributes?: NftAttribute[];
  collection?: { name?: string };
}

async function fetchJson(uri: string, signal?: AbortSignal): Promise<OffChainJson | null> {
  try {
    const res = await fetch(normalizeUri(uri), { signal });
    if (!res.ok) return null;
    return (await res.json()) as OffChainJson;
  } catch {
    return null;
  }
}

/**
 * Resolve full NFT metadata for a mint: the on-chain Token Metadata account
 * (name/symbol/uri/collection) plus the off-chain JSON (image/attributes).
 * Returns a best-effort object; missing pieces degrade gracefully.
 */
export async function fetchNftMetadata(
  mint: string,
  signal?: AbortSignal,
): Promise<NftMetadata | null> {
  try {
    const asset = await fetchDigitalAsset(getUmi(), umiPublicKey(mint));
    const onChainName = asset.metadata.name.replace(/\0/g, '').trim();
    const onChainSymbol = asset.metadata.symbol.replace(/\0/g, '').trim();
    const uri = asset.metadata.uri.replace(/\0/g, '').trim();

    const json = uri ? await fetchJson(uri, signal) : null;

    const collection =
      json?.collection?.name ??
      (asset.metadata.collection.__option === 'Some'
        ? asset.metadata.collection.value.key.toString()
        : null);

    return {
      mint,
      name: json?.name || onChainName || 'Unnamed NFT',
      symbol: json?.symbol || onChainSymbol || '',
      image: json?.image ? normalizeUri(json.image) : null,
      description: json?.description ?? null,
      collection,
      attributes: Array.isArray(json?.attributes) ? json!.attributes : [],
      uri,
    };
  } catch {
    return null;
  }
}
