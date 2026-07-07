import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import { makeId } from '../lib/utils';
import type { LocalCollection } from '../types';

interface CollectionsState {
  collections: LocalCollection[];
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  /** Add a mint to a collection (no-op if already present). */
  addMint: (collectionId: string, mint: string) => void;
  removeMint: (collectionId: string, mint: string) => void;
  /** Replace the ordered mint list (used after drag reorder/move). */
  setMints: (collectionId: string, mints: string[]) => void;
  reorderCollections: (orderedIds: string[]) => void;
}

/**
 * User-defined local collections for the drag-and-drop organizer. Ordering of
 * both collections and the mints within them is preserved so dnd-kit reorders
 * persist across reloads.
 */
export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set) => ({
      collections: [],
      createCollection: (name) => {
        const id = makeId('col');
        set((s) => ({
          collections: [
            ...s.collections,
            { id, name: name.trim() || 'Untitled', mints: [], createdAt: Date.now() },
          ],
        }));
        return id;
      },
      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name: name.trim() || c.name } : c,
          ),
        })),
      deleteCollection: (id) =>
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
      addMint: (collectionId, mint) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId && !c.mints.includes(mint)
              ? { ...c, mints: [...c.mints, mint] }
              : c,
          ),
        })),
      removeMint: (collectionId, mint) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId ? { ...c, mints: c.mints.filter((m) => m !== mint) } : c,
          ),
        })),
      setMints: (collectionId, mints) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId ? { ...c, mints } : c,
          ),
        })),
      reorderCollections: (orderedIds) =>
        set((s) => ({
          collections: orderedIds
            .map((id) => s.collections.find((c) => c.id === id))
            .filter((c): c is LocalCollection => Boolean(c)),
        })),
    }),
    {
      name: 'nftm.collections',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
