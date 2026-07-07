import '@testing-library/jest-dom/vitest';
import { Buffer } from 'buffer';
import { vi } from 'vitest';

// Solana libs expect Buffer on the global object even under jsdom.
globalThis.Buffer = globalThis.Buffer ?? Buffer;

// jsdom has no IndexedDB; back idb-keyval with an in-memory map so the
// IndexedDB-persisted stores (favorites, collections) work under test.
vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// jsdom doesn't implement matchMedia; some UI may reference it.
// (Guarded for the node environment where `window` is undefined.)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
