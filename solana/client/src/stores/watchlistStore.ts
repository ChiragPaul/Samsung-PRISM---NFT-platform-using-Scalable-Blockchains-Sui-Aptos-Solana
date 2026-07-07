import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PriceAlert } from '../types';

interface WatchlistState {
  alerts: Record<string, PriceAlert>;
  setAlert: (mint: string, thresholdSol: number) => void;
  removeAlert: (mint: string) => void;
  getAlert: (mint: string) => PriceAlert | undefined;
}

/**
 * Client-side price alerts. The marketplace has no backend, so "alerts" are
 * thresholds we evaluate locally against live listing price changes received
 * over the account-change subscription.
 */
export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, getState) => ({
      alerts: {},
      setAlert: (mint, thresholdSol) =>
        set((s) => ({
          alerts: {
            ...s.alerts,
            [mint]: { mint, thresholdSol, createdAt: Date.now() },
          },
        })),
      removeAlert: (mint) =>
        set((s) => {
          const next = { ...s.alerts };
          delete next[mint];
          return { alerts: next };
        }),
      getAlert: (mint) => getState().alerts[mint],
    }),
    { name: 'nftm.watchlist' },
  ),
);
