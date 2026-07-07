import { TIER_CLASSES, TIER_LABELS } from '../lib/rarity';
import { cn } from '../lib/utils';
import type { RarityTier } from '../types';

export function RarityBadge({
  tier,
  rank,
  className,
}: {
  tier?: RarityTier;
  rank?: number;
  className?: string;
}) {
  if (!tier) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TIER_CLASSES[tier],
        className,
      )}
      title={rank ? `Rarity rank #${rank} in the loaded set` : undefined}
    >
      {TIER_LABELS[tier]}
      {rank ? <span className="opacity-70">#{rank}</span> : null}
    </span>
  );
}
