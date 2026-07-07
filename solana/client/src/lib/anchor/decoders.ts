import { BorshAccountsCoder } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import type { AccountInfo } from '@solana/web3.js';
import { IDL } from './idl';
import { LAMPORTS_PER_SOL } from '../config';
import type {
  Listing,
  ListingAccountRaw,
  Marketplace,
  MarketplaceAccountRaw,
} from '../../types';

/**
 * A single coder instance built from the IDL. It owns the discriminators and
 * Borsh layouts for every account, so we never hand-roll byte offsets.
 */
export const accountsCoder = new BorshAccountsCoder(IDL);

/**
 * First 8 bytes of an account = Anchor discriminator. We read it straight from
 * the IDL's account entries (authoritative) rather than recomputing it.
 */
function discriminatorFor(name: string): Buffer {
  const entry = (IDL.accounts ?? []).find((a) => a.name === name);
  if (!entry?.discriminator) {
    throw new Error(`No discriminator for account "${name}" in IDL`);
  }
  return Buffer.from(entry.discriminator);
}

export const MARKETPLACE_DISCRIMINATOR = discriminatorFor('Marketplace');
export const LISTING_DISCRIMINATOR = discriminatorFor('Listing');

function hasDiscriminator(data: Buffer, disc: Buffer): boolean {
  return data.length >= 8 && data.subarray(0, 8).equals(disc);
}

export function decodeMarketplace(
  address: PublicKey,
  account: AccountInfo<Buffer>,
): Marketplace {
  const raw = accountsCoder.decode<MarketplaceAccountRaw>('Marketplace', account.data);
  return normalizeMarketplace(address, raw);
}

/**
 * Read a decoded field by either camelCase or snake_case key. The bundled IDL
 * uses camelCase, but an IDL regenerated from the deployed program via
 * `anchor idl fetch` will use snake_case — this keeps the read path correct
 * either way without re-touching the decoder.
 */
function field<T>(raw: Record<string, unknown>, camel: string, snake: string): T {
  return (raw[camel] ?? raw[snake]) as T;
}

export function normalizeMarketplace(
  address: PublicKey,
  raw: MarketplaceAccountRaw,
): Marketplace {
  const r = raw as unknown as Record<string, unknown>;
  return {
    address: address.toBase58(),
    authority: field<PublicKey>(r, 'authority', 'authority').toBase58(),
    treasury: field<PublicKey>(r, 'treasury', 'treasury').toBase58(),
    feeBps: field<number>(r, 'feeBps', 'fee_bps'),
    name: field<string>(r, 'name', 'name'),
    listingsCount: field<{ toNumber(): number }>(r, 'listingsCount', 'listings_count').toNumber(),
  };
}

export function decodeListing(
  address: PublicKey,
  account: AccountInfo<Buffer>,
): Listing {
  const raw = accountsCoder.decode<ListingAccountRaw>('Listing', account.data);
  return normalizeListing(address, raw);
}

export function normalizeListing(address: PublicKey, raw: ListingAccountRaw): Listing {
  const r = raw as unknown as Record<string, unknown>;
  const priceLamports = field<{ toNumber(): number }>(r, 'price', 'price').toNumber();
  return {
    address: address.toBase58(),
    seller: field<PublicKey>(r, 'seller', 'seller').toBase58(),
    nftMint: field<PublicKey>(r, 'nftMint', 'nft_mint').toBase58(),
    vault: field<PublicKey>(r, 'vault', 'vault').toBase58(),
    priceLamports,
    priceSol: priceLamports / LAMPORTS_PER_SOL,
    createdAt: field<{ toNumber(): number }>(r, 'createdAt', 'created_at').toNumber(),
  };
}

/** Safe decode used by subscription handlers where data may be any account. */
export function tryDecodeListing(
  address: PublicKey,
  account: AccountInfo<Buffer>,
): Listing | null {
  if (!hasDiscriminator(account.data, LISTING_DISCRIMINATOR)) return null;
  try {
    return decodeListing(address, account);
  } catch {
    return null;
  }
}

export function tryDecodeMarketplace(
  address: PublicKey,
  account: AccountInfo<Buffer>,
): Marketplace | null {
  if (!hasDiscriminator(account.data, MARKETPLACE_DISCRIMINATOR)) return null;
  try {
    return decodeMarketplace(address, account);
  } catch {
    return null;
  }
}
