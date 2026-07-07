import { useEffect, useMemo } from 'react';
import { usePriceHistoryStore } from '../stores/priceHistoryStore';
import type { EnrichedListing } from '../types';

export interface FloorInfo {
  collection: string;
  floorSol: number;
  count: number;
}

/**
 * Computes the current floor (minimum active price) per collection from the
 * loaded listings and records it to the local price-history store so a floor
 * series accumulates over the session.
 */
export function useFloorTracker(listings: EnrichedListing[]): FloorInfo[] {
  const recordFloor = usePriceHistoryStore((s) => s.recordFloor);

  const floors = useMemo<FloorInfo[]>(() => {
    const byCollection = new Map<string, number[]>();
    for (const l of listings) {
      const key = l.metadata?.collection;
      if (!key) continue;
      const arr = byCollection.get(key) ?? [];
      arr.push(l.priceSol);
      byCollection.set(key, arr);
    }
    return [...byCollection.entries()]
      .map(([collection, prices]) => ({
        collection,
        floorSol: Math.min(...prices),
        count: prices.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [listings]);

  useEffect(() => {
    for (const f of floors) recordFloor(f.collection, f.floorSol);
  }, [floors, recordFloor]);

  return floors;
}
