import { create } from 'zustand';
import type { ActivityEvent } from '../types';

interface ActivityState {
  events: ActivityEvent[];
  push: (event: ActivityEvent) => void;
  clear: () => void;
}

const MAX_EVENTS = 60;

/**
 * Session-only activity feed, populated by the program-account subscription.
 * Intentionally NOT persisted: it reflects what happened while you watched,
 * which is the honest scope of a backend-less, log-derived feed.
 */
export const useActivityStore = create<ActivityState>((set) => ({
  events: [],
  push: (event) =>
    set((s) => {
      if (s.events.some((e) => e.id === event.id)) return s;
      return { events: [event, ...s.events].slice(0, MAX_EVENTS) };
    }),
  clear: () => set({ events: [] }),
}));
