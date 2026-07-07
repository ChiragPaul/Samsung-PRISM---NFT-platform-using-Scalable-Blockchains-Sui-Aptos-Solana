import { config } from '../config';
import type { EnrichedListing, NftAttribute, RarityTier } from '../../types';

/**
 * AI-assist engine.
 *
 * By default this runs a fully local, no-key heuristic generator so the
 * features work in the browser with zero backend. If you set
 * `VITE_AI_PROXY_URL` to a small serverless endpoint that calls Claude
 * server-side (keeping your API key off the client), these functions will use
 * it instead and fall back to the local generator on any error.
 */

interface NftIdeaInput {
  name?: string;
  collection?: string;
  attributes?: NftAttribute[];
}

interface NftIdea {
  name: string;
  description: string;
  /** True when produced by a real model via the proxy. */
  fromModel: boolean;
}

const ADJECTIVES = [
  'Luminous', 'Cosmic', 'Ethereal', 'Neon', 'Obsidian', 'Radiant', 'Phantom',
  'Stellar', 'Mystic', 'Electric', 'Golden', 'Crystalline', 'Solar', 'Lunar',
];
const NOUNS = [
  'Voyager', 'Sentinel', 'Drifter', 'Oracle', 'Nomad', 'Specter', 'Warden',
  'Pioneer', 'Wanderer', 'Guardian', 'Maverick', 'Relic',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h;
}

/** Local fallback: craft a name + description from the traits. */
function localIdea(input: NftIdeaInput): NftIdea {
  const seed = hash((input.name ?? '') + (input.collection ?? '') + JSON.stringify(input.attributes ?? []));
  const traits = (input.attributes ?? []).filter((a) => a.trait_type && a.value);
  const name = input.name?.trim() || `${pick(ADJECTIVES, seed)} ${pick(NOUNS, seed >> 3)}`;

  const traitPhrase =
    traits.length > 0
      ? `defined by its ${traits.slice(0, 3).map((t) => `${String(t.value).toLowerCase()} ${t.trait_type.toLowerCase()}`).join(', ')}`
      : 'one-of-a-kind on every axis';
  const collectionPhrase = input.collection ? ` from the ${input.collection} collection` : '';

  const openers = [
    `${name} is a singular digital artifact${collectionPhrase}, ${traitPhrase}.`,
    `Forged on Solana, ${name}${collectionPhrase} stands apart — ${traitPhrase}.`,
    `Meet ${name}: a collectible${collectionPhrase} ${traitPhrase}.`,
  ];
  const closers = [
    'Minted as a 1/1, it carries provenance and rarity in equal measure.',
    'A piece built for collectors who value scarcity and story.',
    'Owning it means holding a verifiable, on-chain original.',
  ];
  const description = `${pick(openers, seed)} ${pick(closers, seed >> 5)}`;
  return { name, description, fromModel: false };
}

async function viaProxy<T>(path: string, body: unknown): Promise<T | null> {
  if (!config.ai.proxyUrl) return null;
  try {
    const res = await fetch(`${config.ai.proxyUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Generate an NFT name + description from its traits (Claude proxy or local). */
export async function generateNftIdea(input: NftIdeaInput): Promise<NftIdea> {
  const remote = await viaProxy<{ name: string; description: string }>('/idea', input);
  if (remote?.description) return { ...remote, fromModel: true };
  return localIdea(input);
}

export interface PriceSuggestion {
  suggestedSol: number;
  lowSol: number;
  highSol: number;
  reasoning: string;
  fromModel: boolean;
}

/**
 * Suggest a fair listing price from comparable listings + rarity. Uses the
 * collection's active prices as comps and nudges by rarity tier.
 */
export function suggestPrice(args: {
  collection: string | null;
  rarityTier?: RarityTier;
  listings: EnrichedListing[];
}): PriceSuggestion {
  const comps = args.collection
    ? args.listings.filter((l) => l.metadata?.collection === args.collection)
    : args.listings;

  const prices = comps.map((l) => l.priceSol).filter((p) => p > 0).sort((a, b) => a - b);
  const floor = prices[0];
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : undefined;

  // Rarity multiplier — rarer pieces command a premium over the median.
  const tierMult: Record<RarityTier, number> = {
    legendary: 2.5,
    epic: 1.8,
    rare: 1.35,
    uncommon: 1.1,
    common: 0.9,
  };
  const mult = args.rarityTier ? tierMult[args.rarityTier] : 1;

  const base = median ?? floor ?? 1;
  const suggested = Math.max(0.01, Math.round(base * mult * 100) / 100);
  const low = Math.max(0.01, Math.round(suggested * 0.85 * 100) / 100);
  const high = Math.round(suggested * 1.2 * 100) / 100;

  const parts: string[] = [];
  if (floor != null) parts.push(`collection floor ${floor} SOL`);
  if (median != null) parts.push(`median ${median} SOL across ${comps.length} comps`);
  if (args.rarityTier) parts.push(`a ${args.rarityTier} rarity premium (×${mult})`);
  const reasoning = parts.length
    ? `Based on ${parts.join(', ')}.`
    : 'No comparable listings yet — this is a baseline estimate.';

  return { suggestedSol: suggested, lowSol: low, highSol: high, reasoning, fromModel: false };
}
