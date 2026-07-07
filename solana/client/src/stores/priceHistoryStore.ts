import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PricePoint } from '../types';

interface PriceHistoryState {
  /** mint -> observed price points (oldest first). */
  history: Record<string, PricePoint[]>;
  /** collection key -> running floor (min observed active price) over time. */
  floors: Record<string, PricePoint[]>;
  record: (mint: string, priceSol: number) => void;
  recordFloor: (collection: string, floorSol: number) => void;
  getHistory: (mint: string) => PricePoint[];
}

const MAX_POINTS = 50;

function appendCapped(arr: PricePoint[] | undefined, point: PricePoint): PricePoint[] {
  const list = arr ? [...arr] : [];
  const last = list[list.length - 1];
  // Skip duplicate consecutive prices to keep the series meaningful.
  if (last && last.priceSol === point.priceSol) return list;
  list.push(point);
  return list.slice(-MAX_POINTS);
}

/**
 * Per-listing price history + per-collection floor tracker, built purely from
 * account changes observed during the session and cached locally so charts
 * survive reloads.
 */
export const usePriceHistoryStore = create<PriceHistoryState>()(
  persist(
    (set, getState) => ({
      history: {},
      floors: {},
      record: (mint, priceSol) =>
        set((s) => ({
          history: {
            ...s.history,
            [mint]: appendCapped(s.history[mint], { priceSol, timestamp: Date.now() }),
          },
        })),
      recordFloor: (collection, floorSol) =>
        set((s) => ({
          floors: {
            ...s.floors,
            [collection]: appendCapped(s.floors[collection], {
              priceSol: floorSol,
              timestamp: Date.now(),
            }),
          },
        })),
      getHistory: (mint) => getState().history[mint] ?? [],
    }),
    { name: 'nftm.priceHistory' },
  ),
);
