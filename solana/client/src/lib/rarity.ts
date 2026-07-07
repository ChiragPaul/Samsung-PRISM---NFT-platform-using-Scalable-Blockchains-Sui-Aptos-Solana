import type { EnrichedListing, RarityTier } from '../types';

/**
 * Derive a simple, transparent rarity score from trait frequency across the
 * currently-loaded set of NFTs (statistical rarity). This is purely
 * client-side and recomputed whenever the loaded set changes.
 *
 * Score for an NFT = sum over its traits of (1 / frequency_of_that_trait).
 * Rarer traits (lower frequency) contribute more. We then rank and bucket.
 */
export function computeRarity<T extends EnrichedListing>(items: T[]): T[] {
  const withTraits = items.filter((i) => (i.metadata?.attributes?.length ?? 0) > 0);
  if (withTraits.length === 0) return items;

  // Count occurrences of each trait_type:value pair.
  const counts = new Map<string, number>();
  for (const item of withTraits) {
    for (const attr of item.metadata!.attributes) {
      const key = `${attr.trait_type}::${attr.value}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const total = withTraits.length;
  const scored = items.map((item) => {
    const attrs = item.metadata?.attributes ?? [];
    if (attrs.length === 0) return { ...item, rarityScore: 0 };
    let score = 0;
    for (const attr of attrs) {
      const key = `${attr.trait_type}::${attr.value}`;
      const freq = (counts.get(key) ?? 1) / total;
      score += 1 / freq;
    }
    return { ...item, rarityScore: Math.round(score * 100) / 100 };
  });

  // Rank by score descending; assign tiers by percentile.
  const ranked = [...scored].sort((a, b) => (b.rarityScore ?? 0) - (a.rarityScore ?? 0));
  const rankByAddress = new Map<string, number>();
  ranked.forEach((item, idx) => rankByAddress.set(item.address, idx + 1));

  return scored.map((item) => {
    const rank = rankByAddress.get(item.address) ?? scored.length;
    const percentile = rank / scored.length;
    return { ...item, rarityRank: rank, rarityTier: tierFromPercentile(percentile) };
  });
}

function tierFromPercentile(p: number): RarityTier {
  if (p <= 0.05) return 'legendary';
  if (p <= 0.15) return 'epic';
  if (p <= 0.35) return 'rare';
  if (p <= 0.6) return 'uncommon';
  return 'common';
}

export const TIER_LABELS: Record<RarityTier, string> = {
  legendary: 'Legendary',
  epic: 'Epic',
  rare: 'Rare',
  uncommon: 'Uncommon',
  common: 'Common',
};

export const TIER_CLASSES: Record<RarityTier, string> = {
  legendary: 'bg-amber-500/15 text-amber-500 ring-amber-500/30',
  epic: 'bg-fuchsia-500/15 text-fuchsia-400 ring-fuchsia-500/30',
  rare: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
  uncommon: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  common: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/30',
};
