import { describe, it, expect } from 'vitest';
import { generateNftIdea, suggestPrice } from './aiAssist';
import type { EnrichedListing } from '../../types';

function listing(collection: string, priceSol: number, tier?: EnrichedListing['rarityTier']): EnrichedListing {
  return {
    address: `a-${collection}-${priceSol}`,
    seller: 's',
    nftMint: `m-${collection}-${priceSol}`,
    vault: 'v',
    priceLamports: priceSol * 1e9,
    priceSol,
    createdAt: 0,
    metadata: {
      mint: 'm', name: 'n', symbol: '', image: null, description: null,
      collection, attributes: [], uri: '',
    },
    rarityTier: tier,
  };
}

describe('aiAssist.suggestPrice', () => {
  const listings = [
    listing('Apes', 1),
    listing('Apes', 2),
    listing('Apes', 3),
    listing('Punks', 10),
  ];

  it('suggests around the collection median with a legendary premium', () => {
    const s = suggestPrice({ collection: 'Apes', rarityTier: 'legendary', listings });
    // median of [1,2,3] = 2, legendary x2.5 => ~5
    expect(s.suggestedSol).toBeGreaterThan(3);
    expect(s.lowSol).toBeLessThan(s.suggestedSol);
    expect(s.highSol).toBeGreaterThan(s.suggestedSol);
    expect(s.reasoning).toMatch(/floor|median|premium/i);
  });

  it('discounts common items below the median', () => {
    const common = suggestPrice({ collection: 'Apes', rarityTier: 'common', listings });
    const legendary = suggestPrice({ collection: 'Apes', rarityTier: 'legendary', listings });
    expect(common.suggestedSol).toBeLessThan(legendary.suggestedSol);
  });

  it('handles no comparables gracefully', () => {
    const s = suggestPrice({ collection: 'Nonexistent', rarityTier: undefined, listings: [] });
    expect(s.suggestedSol).toBeGreaterThan(0);
    expect(s.reasoning).toMatch(/baseline|no comparable/i);
  });
});

describe('aiAssist.generateNftIdea (local)', () => {
  it('produces a name and description from traits', async () => {
    const idea = await generateNftIdea({
      collection: 'Test',
      attributes: [{ trait_type: 'Background', value: 'Gold' }],
    });
    expect(idea.name.length).toBeGreaterThan(0);
    expect(idea.description.length).toBeGreaterThan(20);
    expect(idea.fromModel).toBe(false);
  });

  it('keeps a user-provided name', async () => {
    const idea = await generateNftIdea({ name: 'My NFT', attributes: [] });
    expect(idea.name).toBe('My NFT');
  });
});
