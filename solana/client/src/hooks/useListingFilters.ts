import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EnrichedListing, ListingFilters, SortKey } from '../types';

const SORT_VALUES: SortKey[] = ['recent', 'price_asc', 'price_desc', 'rarity'];

function parseSort(value: string | null): SortKey {
  return SORT_VALUES.includes(value as SortKey) ? (value as SortKey) : 'recent';
}

function parseNumber(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * URL-synced marketplace filters. The query string is the source of truth, so
 * filtered views are shareable deep links and survive reloads / back-forward.
 */
export function useListingFilters() {
  const [params, setParams] = useSearchParams();

  const filters: ListingFilters = useMemo(
    () => ({
      query: params.get('q') ?? '',
      collection: params.get('collection'),
      minPriceSol: parseNumber(params.get('min')),
      maxPriceSol: parseNumber(params.get('max')),
      sort: parseSort(params.get('sort')),
    }),
    [params],
  );

  const setFilter = useCallback(
    <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const paramKey = { query: 'q', collection: 'collection', minPriceSol: 'min', maxPriceSol: 'max', sort: 'sort' }[key];
          if (value == null || value === '' || (key === 'sort' && value === 'recent')) {
            next.delete(paramKey);
          } else {
            next.set(paramKey, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { filters, setFilter, reset };
}

/** Pure filter+sort applied to enriched listings. Exported for unit tests. */
export function applyFilters(
  listings: EnrichedListing[],
  filters: ListingFilters,
): EnrichedListing[] {
  const q = filters.query.trim().toLowerCase();
  let result = listings.filter((l) => {
    if (q) {
      const name = l.metadata?.name?.toLowerCase() ?? '';
      const collection = l.metadata?.collection?.toLowerCase() ?? '';
      const mint = l.nftMint.toLowerCase();
      if (!name.includes(q) && !collection.includes(q) && !mint.includes(q)) return false;
    }
    if (filters.collection && l.metadata?.collection !== filters.collection) return false;
    if (filters.minPriceSol != null && l.priceSol < filters.minPriceSol) return false;
    if (filters.maxPriceSol != null && l.priceSol > filters.maxPriceSol) return false;
    return true;
  });

  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'price_asc':
        return a.priceSol - b.priceSol;
      case 'price_desc':
        return b.priceSol - a.priceSol;
      case 'rarity':
        return (b.rarityScore ?? 0) - (a.rarityScore ?? 0);
      case 'recent':
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return result;
}

/** Distinct collection names present in the loaded set (for the filter dropdown). */
export function collectionsFromListings(listings: EnrichedListing[]): string[] {
  const set = new Set<string>();
  for (const l of listings) {
    if (l.metadata?.collection) set.add(l.metadata.collection);
  }
  return [...set].sort();
}
