import { ListingCard } from './ListingCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/states';
import type { EnrichedListing } from '../../types';

interface ListingGridProps {
  listings: EnrichedListing[];
  isLoading: boolean;
  isError: boolean;
  onBuy: (listing: EnrichedListing) => void;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ListingGrid({
  listings,
  isLoading,
  isError,
  onBuy,
  onRetry,
  emptyTitle = 'No listings found',
  emptyDescription = 'Try adjusting your filters, or check back soon — listings update live.',
}: ListingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load listings"
        description="The RPC may be rate-limited. We'll retry automatically, or try again now."
        onRetry={onRetry}
      />
    );
  }

  if (listings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon="🛒" />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.address} listing={listing} onBuy={onBuy} />
      ))}
    </div>
  );
}
