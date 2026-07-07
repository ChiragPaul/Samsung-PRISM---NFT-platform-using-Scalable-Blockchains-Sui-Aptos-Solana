import { describe, it, expect } from 'vitest';
import { applyFilters, collectionsFromListings } from './useListingFilters';
import type { EnrichedListing, ListingFilters, NftMetadata } from '../types';

function meta(partial: Partial<NftMetadata>): NftMetadata {
  return {
    mint: partial.mint ?? 'm',
    name: partial.name ?? 'NFT',
    symbol: '',
    image: null,
    description: null,
    collection: partial.collection ?? null,
    attributes: partial.attributes ?? [],
    uri: '',
  };
}

function listing(over: Partial<EnrichedListing>): EnrichedListing {
  return {
    address: over.address ?? 'addr',
    seller: 'seller',
    nftMint: over.nftMint ?? 'mint',
    vault: 'vault',
    priceLamports: (over.priceSol ?? 1) * 1e9,
    priceSol: over.priceSol ?? 1,
    createdAt: over.createdAt ?? 0,
    metadata: over.metadata ?? null,
    rarityScore: over.rarityScore,
  };
}

const base: ListingFilters = {
  query: '',
  collection: null,
  minPriceSol: null,
  maxPriceSol: null,
  sort: 'recent',
};

const data: EnrichedListing[] = [
  listing({ address: '1', nftMint: 'a', priceSol: 5, createdAt: 30, metadata: meta({ name: 'Ape #1', collection: 'Apes' }), rarityScore: 10 }),
  listing({ address: '2', nftMint: 'b', priceSol: 1, createdAt: 10, metadata: meta({ name: 'Punk #9', collection: 'Punks' }), rarityScore: 50 }),
  listing({ address: '3', nftMint: 'c', priceSol: 3, createdAt: 20, metadata: meta({ name: 'Ape #2', collection: 'Apes' }), rarityScore: 30 }),
];

describe('applyFilters', () => {
  it('filters by name query (case-insensitive)', () => {
    const res = applyFilters(data, { ...base, query: 'punk' });
    expect(res.map((l) => l.address)).toEqual(['2']);
  });

  it('filters by collection', () => {
    const res = applyFilters(data, { ...base, collection: 'Apes' });
    expect(res).toHaveLength(2);
  });

  it('filters by price range', () => {
    const res = applyFilters(data, { ...base, minPriceSol: 2, maxPriceSol: 4 });
    expect(res.map((l) => l.address)).toEqual(['3']);
  });

  it('sorts by price ascending and descending', () => {
    expect(applyFilters(data, { ...base, sort: 'price_asc' }).map((l) => l.priceSol)).toEqual([1, 3, 5]);
    expect(applyFilters(data, { ...base, sort: 'price_desc' }).map((l) => l.priceSol)).toEqual([5, 3, 1]);
  });

  it('sorts by recency and rarity', () => {
    expect(applyFilters(data, { ...base, sort: 'recent' }).map((l) => l.address)).toEqual(['1', '3', '2']);
    expect(applyFilters(data, { ...base, sort: 'rarity' }).map((l) => l.address)).toEqual(['2', '3', '1']);
  });

  it('lists distinct collections', () => {
    expect(collectionsFromListings(data)).toEqual(['Apes', 'Punks']);
  });
});
