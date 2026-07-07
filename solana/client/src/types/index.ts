import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

/** Raw decoded `Marketplace` account (camelCase, as Anchor decodes it). */
export interface MarketplaceAccountRaw {
  authority: PublicKey;
  treasury: PublicKey;
  feeBps: number;
  name: string;
  listingsCount: BN;
  bump: number;
  treasuryBump: number;
}

/** Normalized marketplace config for UI consumption. */
export interface Marketplace {
  address: string;
  authority: string;
  treasury: string;
  feeBps: number;
  name: string;
  listingsCount: number;
}

/** Raw decoded `Listing` account. */
export interface ListingAccountRaw {
  seller: PublicKey;
  nftMint: PublicKey;
  price: BN;
  createdAt: BN;
  vault: PublicKey;
  bump: number;
}

/** Normalized on-chain listing (no metadata yet — that is resolved separately). */
export interface Listing {
  /** Listing PDA address. */
  address: string;
  seller: string;
  nftMint: string;
  vault: string;
  /** Price in lamports. */
  priceLamports: number;
  /** Price in SOL (derived). */
  priceSol: number;
  /** Unix seconds. */
  createdAt: number;
}

/** A trait/attribute parsed from Metaplex JSON metadata. */
export interface NftAttribute {
  trait_type: string;
  value: string | number;
}

/** Resolved off-chain NFT metadata (from IPFS/Arweave via Metaplex). */
export interface NftMetadata {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  description: string | null;
  collection: string | null;
  attributes: NftAttribute[];
  /** Raw URI for debugging / fallback. */
  uri: string;
}

/** A listing joined with its resolved metadata — the unit the grid renders. */
export interface EnrichedListing extends Listing {
  metadata: NftMetadata | null;
  /** Rarity score derived from trait frequency across the loaded set. */
  rarityScore?: number;
  rarityRank?: number;
  rarityTier?: RarityTier;
}

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** An NFT held in the connected wallet (for listing). */
export interface OwnedNft {
  mint: string;
  tokenAccount: string;
  metadata: NftMetadata | null;
  amount: number;
}

export type TxStage = 'idle' | 'building' | 'sent' | 'confirmed' | 'finalized' | 'error';

export interface TxStatus {
  stage: TxStage;
  signature?: string;
  error?: string;
}

export type SortKey = 'recent' | 'price_asc' | 'price_desc' | 'rarity';

export interface ListingFilters {
  query: string;
  collection: string | null;
  minPriceSol: number | null;
  maxPriceSol: number | null;
  sort: SortKey;
}

export type ActivityKind = 'list' | 'sale' | 'delist' | 'fee_update';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  mint?: string;
  name?: string;
  priceSol?: number;
  actor?: string;
  timestamp: number;
}

export interface PricePoint {
  priceSol: number;
  timestamp: number;
}

/** A user-defined local collection of NFTs (drag-and-drop organizer). */
export interface LocalCollection {
  id: string;
  name: string;
  /** Ordered list of NFT mints. */
  mints: string[];
  createdAt: number;
}

export interface PriceAlert {
  mint: string;
  /** Notify when listing price drops at or below this SOL value. */
  thresholdSol: number;
  createdAt: number;
}
