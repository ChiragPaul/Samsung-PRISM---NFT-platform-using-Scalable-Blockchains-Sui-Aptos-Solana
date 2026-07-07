import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ListingFilters, SortKey } from '../../types';

interface FilterBarProps {
  filters: ListingFilters;
  collections: string[];
  resultCount: number;
  onChange: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently listed' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'rarity', label: 'Rarity' },
];

/**
 * Search + filter + sort bar. The text query is debounced before it hits the
 * URL/query state so typing doesn't thrash the (URL-synced) filter pipeline.
 */
export function FilterBar({
  filters,
  collections,
  resultCount,
  onChange,
  onReset,
}: FilterBarProps) {
  const [queryInput, setQueryInput] = useState(filters.query);
  const debouncedQuery = useDebouncedValue(queryInput, 300);

  useEffect(() => {
    if (debouncedQuery !== filters.query) onChange('query', debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Keep the input in sync if filters are reset/changed externally (e.g. deep link).
  useEffect(() => {
    setQueryInput(filters.query);
  }, [filters.query]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-zinc-500">
            Search
          </label>
          <input
            id="search"
            type="search"
            className="input"
            placeholder="Name, collection, or mint…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>

        <div className="min-w-[160px]">
          <label htmlFor="collection" className="mb-1 block text-xs font-medium text-zinc-500">
            Collection
          </label>
          <select
            id="collection"
            className="input"
            value={filters.collection ?? ''}
            onChange={(e) => onChange('collection', e.target.value || null)}
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="w-24">
          <label htmlFor="min" className="mb-1 block text-xs font-medium text-zinc-500">
            Min SOL
          </label>
          <input
            id="min"
            type="number"
            min={0}
            step="0.1"
            className="input"
            placeholder="0"
            value={filters.minPriceSol ?? ''}
            onChange={(e) => onChange('minPriceSol', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div className="w-24">
          <label htmlFor="max" className="mb-1 block text-xs font-medium text-zinc-500">
            Max SOL
          </label>
          <input
            id="max"
            type="number"
            min={0}
            step="0.1"
            className="input"
            placeholder="∞"
            value={filters.maxPriceSol ?? ''}
            onChange={(e) => onChange('maxPriceSol', e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        <div className="min-w-[170px]">
          <label htmlFor="sort" className="mb-1 block text-xs font-medium text-zinc-500">
            Sort by
          </label>
          <select
            id="sort"
            className="input"
            value={filters.sort}
            onChange={(e) => onChange('sort', e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-ghost" onClick={onReset}>
          Reset
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-400" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'listing' : 'listings'}
      </p>
    </div>
  );
}
