import { useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { NftImage } from '../../components/NftImage';
import { TxStatusTracker } from '../../components/TxStatusTracker';
import { Spinner } from '../../components/ui/Spinner';
import { usePurchaseNft } from '../../hooks/usePurchaseNft';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useBalance } from '../../hooks/useWalletInfo';
import { computeFeeBreakdown } from '../../lib/anchor/feeMath';
import { formatSol } from '../../lib/utils';
import type { EnrichedListing } from '../../types';

interface BuyModalProps {
  listing: EnrichedListing | null;
  onClose: () => void;
}

/** Confirmation modal with a pre-tx fee/total breakdown and a status tracker. */
export function BuyModal({ listing, onClose }: BuyModalProps) {
  const { purchase, status, reset } = usePurchaseNft();
  const { data: marketplace } = useMarketplace();
  const { data: balance } = useBalance();

  useEffect(() => {
    if (listing) reset();
  }, [listing, reset]);

  if (!listing) return null;

  const feeBps = marketplace?.feeBps ?? 0;
  const breakdown = computeFeeBreakdown(listing.priceLamports, feeBps);
  const isBusy = status.stage !== 'idle' && status.stage !== 'error';
  const insufficient = (balance?.sol ?? 0) < breakdown.totalSol;
  const done = status.stage === 'confirmed' || status.stage === 'finalized';

  return (
    <Modal open={Boolean(listing)} onClose={onClose} title="Confirm purchase">
      <div className="flex gap-4">
        <NftImage
          src={listing.metadata?.image ?? null}
          alt={listing.metadata?.name ?? 'NFT'}
          className="h-20 w-20 shrink-0 rounded-xl"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{listing.metadata?.name ?? 'NFT'}</p>
          {listing.metadata?.collection && (
            <p className="truncate text-xs text-zinc-500">{listing.metadata.collection}</p>
          )}
          <p className="mt-1 text-lg font-bold">{formatSol(listing.priceSol)} SOL</p>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-800/60">
        <Row label="Listing price" value={`${formatSol(breakdown.priceSol)} SOL`} />
        <Row
          label={`Marketplace fee (${(feeBps / 100).toFixed(2)}%)`}
          value={`${formatSol(breakdown.feeSol)} SOL`}
          muted
        />
        <Row label="Seller receives" value={`${formatSol(breakdown.sellerProceedsSol)} SOL`} muted />
        <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
        <Row label="You pay" value={`${formatSol(breakdown.totalSol)} SOL`} bold />
        <p className="pt-1 text-[11px] text-zinc-400">+ a small network fee (~0.00001 SOL)</p>
      </dl>

      {insufficient && !done && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Insufficient balance — you have {formatSol(balance?.sol ?? 0)} SOL.
        </p>
      )}

      <div className="mt-4">
        <TxStatusTracker status={status} />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>
          {done ? 'Close' : 'Cancel'}
        </button>
        {!done && (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={isBusy || insufficient}
            onClick={() => purchase(listing)}
          >
            {isBusy ? <Spinner /> : 'Confirm & buy'}
          </button>
        )}
      </div>
    </Modal>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? 'text-zinc-500' : ''}>{label}</dt>
      <dd className={`tabular-nums ${bold ? 'font-bold' : ''}`}>{value}</dd>
    </div>
  );
}
