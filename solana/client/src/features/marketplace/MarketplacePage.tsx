import { useMemo, useState } from 'react';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import {
  applyFilters,
  collectionsFromListings,
  useListingFilters,
} from '../../hooks/useListingFilters';
import { useFloorTracker } from '../../hooks/useFloorTracker';
import { FilterBar } from './FilterBar';
import { ListingGrid } from './ListingGrid';
import { BuyModal } from './BuyModal';
import { ActivityFeed } from './ActivityFeed';
import { FloorTicker } from './FloorTicker';
import { Hero } from './Hero';
import { SweepBar } from './SweepBar';
import type { EnrichedListing } from '../../types';

/** The browse view: filterable, sortable grid + live activity + floor tracker. */
export function MarketplacePage() {
  const { listings, isLoading, isError, refetch } = useEnrichedListings();
  const { filters, setFilter, reset } = useListingFilters();
  const [buying, setBuying] = useState<EnrichedListing | null>(null);

  const collections = useMemo(() => collectionsFromListings(listings), [listings]);
  const filtered = useMemo(() => applyFilters(listings, filters), [listings, filters]);
  const floors = useFloorTracker(listings);

  const globalFloor = useMemo(
    () => (listings.length ? Math.min(...listings.map((l) => l.priceSol)) : null),
    [listings],
  );

  return (
    <div className="space-y-5">
      <Hero
        listingCount={listings.length}
        collectionCount={collections.length}
        floorSol={globalFloor}
      />

      <FloorTicker floors={floors} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <FilterBar
            filters={filters}
            collections={collections}
            resultCount={filtered.length}
            onChange={setFilter}
            onReset={reset}
          />
          <SweepBar listings={filtered} />
          <ListingGrid
            listings={filtered}
            isLoading={isLoading}
            isError={isError}
            onBuy={setBuying}
            onRetry={() => refetch()}
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ActivityFeed />
        </div>
      </div>

      <BuyModal listing={buying} onClose={() => setBuying(null)} />
    </div>
  );
}
