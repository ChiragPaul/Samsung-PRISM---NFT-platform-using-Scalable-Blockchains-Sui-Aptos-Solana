import { useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { config } from '../lib/config';
import { queryKeys } from '../lib/queryClient';
import { subscribeListings, removeSubscription } from '../lib/solana/subscriptions';
import { tryDecodeListing } from '../lib/anchor/decoders';
import { notify } from '../lib/notifications';
import { makeId, shortenAddress } from '../lib/utils';
import { useActivityStore } from '../stores/activityStore';
import { usePriceHistoryStore } from '../stores/priceHistoryStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import type { ActivityKind, Listing } from '../types';

/**
 * The single real-time engine for the whole app. With no backend, on-chain
 * accounts ARE the source of truth, so we:
 *
 *   1. onProgramAccountChange (Listing accounts) -> upsert/remove in the React
 *      Query cache so the grid updates instantly without polling.
 *   2. onLogs (program) -> classify each instruction (list/sale/delist/fee) to
 *      build the activity feed and to disambiguate a removed listing as a SALE
 *      vs a DELIST (the account subscription alone can't tell them apart).
 *   3. Derive price history, evaluate client-side price alerts, and raise
 *      toasts/notifications for "your listing sold" and favorited-item changes.
 *
 * Mount this ONCE near the app root. All subscriptions are cleaned up on unmount.
 */
export function useRealtimeSync(): void {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  // Stable refs so the effect doesn't resubscribe on every render.
  const walletRef = useRef<string | null>(null);
  walletRef.current = publicKey?.toBase58() ?? null;

  // Ring buffer of the most recent program instruction kind, used to classify
  // a listing account closure as sale vs delist.
  const lastInstruction = useRef<{ kind: 'sale' | 'delist' | null; at: number }>({
    kind: null,
    at: 0,
  });

  useEffect(() => {
    const pushActivity = (kind: ActivityKind, data: Partial<Listing> & { name?: string }) => {
      useActivityStore.getState().push({
        id: makeId('act'),
        kind,
        mint: data.nftMint,
        priceSol: data.priceSol,
        actor: data.seller,
        timestamp: Date.now(),
      });
    };

    const getCachedListings = (): Listing[] =>
      queryClient.getQueryData<Listing[]>(queryKeys.listings) ?? [];

    const upsertListing = (next: Listing) => {
      const prev = getCachedListings();
      const existing = prev.find((l) => l.address === next.address);
      queryClient.setQueryData<Listing[]>(queryKeys.listings, () =>
        existing
          ? prev.map((l) => (l.address === next.address ? next : l))
          : [...prev, next],
      );

      // Price history (per mint).
      usePriceHistoryStore.getState().record(next.nftMint, next.priceSol);

      if (!existing) {
        pushActivity('list', next);
        return;
      }

      if (existing.priceLamports !== next.priceLamports) {
        // Favorited item changed price -> notify.
        if (useFavoritesStore.getState().isFavorite(next.nftMint)) {
          notify({
            variant: 'info',
            title: 'Price changed',
            description: `A favorited NFT is now ${next.priceSol} SOL.`,
            href: `/nft/${next.nftMint}`,
          });
        }
        // Price alert: notify on crossing the threshold downward.
        const alert = useWatchlistStore.getState().getAlert(next.nftMint);
        if (
          alert &&
          existing.priceSol > alert.thresholdSol &&
          next.priceSol <= alert.thresholdSol
        ) {
          notify({
            variant: 'success',
            title: 'Price alert',
            description: `Dropped to ${next.priceSol} SOL (≤ ${alert.thresholdSol}).`,
            href: `/nft/${next.nftMint}`,
          });
        }
      }
    };

    const removeListing = (address: string) => {
      const prev = getCachedListings();
      const removed = prev.find((l) => l.address === address);
      if (!removed) return;
      queryClient.setQueryData<Listing[]>(
        queryKeys.listings,
        prev.filter((l) => l.address !== address),
      );

      // Classify removal using the most recent instruction log (within 10s).
      const recent =
        Date.now() - lastInstruction.current.at < 10_000
          ? lastInstruction.current.kind
          : null;
      const kind: ActivityKind = recent === 'sale' ? 'sale' : 'delist';
      pushActivity(kind, removed);

      const isMine = walletRef.current && removed.seller === walletRef.current;
      if (isMine && kind === 'sale') {
        notify({
          variant: 'success',
          title: 'Your listing sold! 🎉',
          description: `${shortenAddress(removed.nftMint)} sold for ${removed.priceSol} SOL.`,
        });
      }
      if (useFavoritesStore.getState().isFavorite(removed.nftMint)) {
        notify({
          variant: 'info',
          title: kind === 'sale' ? 'Favorited item sold' : 'Favorited item delisted',
          description: shortenAddress(removed.nftMint),
        });
      }
    };

    // 1) Account-change subscription for the listing set.
    const accountSubId = subscribeListings(connection, ({ accountId, account }) => {
      const decoded =
        account && account.data.length >= 8
          ? tryDecodeListing(accountId, account)
          : null;
      if (decoded) upsertListing(decoded);
      else removeListing(accountId.toBase58());
    });

    // 2) Logs subscription for instruction classification + marketplace updates.
    let logsSubId: number | undefined;
    try {
      logsSubId = connection.onLogs(
        new PublicKey(config.programId),
        (logInfo) => {
          const text = logInfo.logs.join('\n');
          if (/Instruction: PurchaseNft/i.test(text)) {
            lastInstruction.current = { kind: 'sale', at: Date.now() };
          } else if (/Instruction: DelistNft/i.test(text)) {
            lastInstruction.current = { kind: 'delist', at: Date.now() };
          } else if (/Instruction: UpdateFee/i.test(text)) {
            useActivityStore.getState().push({
              id: makeId('act'),
              kind: 'fee_update',
              timestamp: Date.now(),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
          }
          // Keep the marketplace counter / listings fresh as a safety net for
          // any closure the account subscription doesn't deliver.
          queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
        },
        'confirmed',
      );
    } catch {
      // Some RPC providers rate-limit onLogs; the account subscription still
      // drives the core live updates without it.
    }

    return () => {
      removeSubscription(connection, accountSubId);
      if (logsSubId !== undefined) {
        void connection.removeOnLogsListener(logsSubId).catch(() => undefined);
      }
    };
  }, [connection, queryClient]);
}
