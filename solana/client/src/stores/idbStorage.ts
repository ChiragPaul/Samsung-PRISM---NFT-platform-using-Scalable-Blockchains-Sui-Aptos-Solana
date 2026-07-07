import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * IndexedDB-backed storage adapter for Zustand's `persist` middleware.
 * Used for favorites & local collections so they survive reloads without a
 * backend (and without bloating localStorage). API is async, which `persist`
 * supports natively.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
