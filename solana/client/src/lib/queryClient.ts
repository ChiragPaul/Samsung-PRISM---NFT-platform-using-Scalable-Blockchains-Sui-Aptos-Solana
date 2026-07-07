import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. RPC calls are flaky, so we retry with exponential
 * backoff but cap attempts; subscriptions (not polling) keep data fresh, so we
 * lean on long stale times and invalidate from the WebSocket layer instead.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const message = String((error as Error)?.message ?? '').toLowerCase();
        // Don't retry "not found" — the account genuinely doesn't exist.
        if (message.includes('could not find') || message.includes('account does not exist')) {
          return false;
        }
        return failureCount < 4;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 16_000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralized query keys so subscription handlers can invalidate precisely. */
export const queryKeys = {
  marketplace: ['marketplace'] as const,
  listings: ['listings'] as const,
  listing: (mint: string) => ['listing', mint] as const,
  metadata: (mint: string) => ['metadata', mint] as const,
  ownedNfts: (owner: string) => ['ownedNfts', owner] as const,
  balance: (owner: string) => ['balance', owner] as const,
};
