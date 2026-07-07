import { describe, it, expect } from 'vitest';
import { computeRarity } from './rarity';
import type { EnrichedListing, NftAttribute } from '../types';

function item(address: string, attributes: NftAttribute[]): EnrichedListing {
  return {
    address,
    seller: 's',
    nftMint: `mint-${address}`,
    vault: 'v',
    priceLamports: 1e9,
    priceSol: 1,
    createdAt: 0,
    metadata: {
      mint: `mint-${address}`,
      name: address,
      symbol: '',
      image: null,
      description: null,
      collection: 'C',
      attributes,
      uri: '',
    },
  };
}

describe('computeRarity', () => {
  it('scores items with rarer traits higher and ranks them', () => {
    // "Gold" background appears once (rare); "Blue" appears 3x (common).
    const items = [
      item('a', [{ trait_type: 'bg', value: 'Gold' }]),
      item('b', [{ trait_type: 'bg', value: 'Blue' }]),
      item('c', [{ trait_type: 'bg', value: 'Blue' }]),
      item('d', [{ trait_type: 'bg', value: 'Blue' }]),
    ];
    const scored = computeRarity(items);
    const a = scored.find((i) => i.address === 'a')!;
    const b = scored.find((i) => i.address === 'b')!;
    expect(a.rarityScore!).toBeGreaterThan(b.rarityScore!);
    expect(a.rarityRank).toBe(1);
  });

  it('returns items unchanged when none have traits', () => {
    const items = [item('a', []), item('b', [])];
    const scored = computeRarity(items);
    expect(scored).toHaveLength(2);
    expect(scored[0].rarityScore).toBeUndefined();
  });
});
