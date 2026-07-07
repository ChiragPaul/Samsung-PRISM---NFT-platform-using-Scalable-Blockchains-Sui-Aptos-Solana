import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface FavoritesState {
  /** Set of favorited NFT mints. */
  mints: string[];
  isFavorite: (mint: string) => boolean;
  toggle: (mint: string) => void;
  add: (mint: string) => void;
  remove: (mint: string) => void;
  clear: () => void;
}

/**
 * Local-first favorites. Persisted to IndexedDB so the heart toggle and the
 * Favorites view work entirely client-side. Exposed as an array (not a Set)
 * for trivial JSON serialization.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, getState) => ({
      mints: [],
      isFavorite: (mint) => getState().mints.includes(mint),
      toggle: (mint) =>
        set((s) => ({
          mints: s.mints.includes(mint)
            ? s.mints.filter((m) => m !== mint)
            : [...s.mints, mint],
        })),
      add: (mint) =>
        set((s) => (s.mints.includes(mint) ? s : { mints: [...s.mints, mint] })),
      remove: (mint) => set((s) => ({ mints: s.mints.filter((m) => m !== mint) })),
      clear: () => set({ mints: [] }),
    }),
    {
      name: 'nftm.favorites',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
