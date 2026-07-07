import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { NftImage } from '../../components/NftImage';
import { TxStatusTracker } from '../../components/TxStatusTracker';
import { Spinner } from '../../components/ui/Spinner';
import { useListNft } from '../../hooks/useListNft';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useEnrichedListings } from '../../hooks/useEnrichedListings';
import { computeFeeBreakdown, solToLamports } from '../../lib/anchor/feeMath';
import { suggestPrice, type PriceSuggestion } from '../../lib/ai/aiAssist';
import { formatSol } from '../../lib/utils';
import type { OwnedNft } from '../../types';

interface ListNftModalProps {
  nft: OwnedNft | null;
  onClose: () => void;
}

/** Set a price and list an owned NFT, with a clear escrow explanation. */
export function ListNftModal({ nft, onClose }: ListNftModalProps) {
  const { list, status, reset } = useListNft();
  const { data: marketplace } = useMarketplace();
  const { listings } = useEnrichedListings();
  const [price, setPrice] = useState('');
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);

  useEffect(() => {
    if (nft) {
      reset();
      setPrice('');
      setSuggestion(null);
    }
  }, [nft, reset]);

  const handleSuggest = () => {
    if (!nft) return;
    const rarity = listings.find((l) => l.nftMint === nft.mint)?.rarityTier;
    const s = suggestPrice({
      collection: nft.metadata?.collection ?? null,
      rarityTier: rarity,
      listings,
    });
    setSuggestion(s);
    setPrice(String(s.suggestedSol));
  };

  if (!nft) return null;

  const priceNum = Number(price);
  const valid = price !== '' && Number.isFinite(priceNum) && priceNum > 0;
  const isBusy = status.stage !== 'idle' && status.stage !== 'error';
  const done = status.stage === 'confirmed' || status.stage === 'finalized';
  const breakdown = valid
    ? computeFeeBreakdown(solToLamports(priceNum), marketplace?.feeBps ?? 0)
    : null;

  return (
    <Modal open={Boolean(nft)} onClose={onClose} title="List for sale">
      <div className="flex gap-4">
        <NftImage
          src={nft.metadata?.image ?? null}
          alt={nft.metadata?.name ?? 'NFT'}
          className="h-20 w-20 shrink-0 rounded-xl"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{nft.metadata?.name ?? 'NFT'}</p>
          {nft.metadata?.collection && (
            <p className="truncate text-xs text-zinc-500">{nft.metadata.collection}</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="price" className="block text-sm font-medium">
            Price (SOL)
          </label>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isBusy || done}
            className="text-xs font-semibold text-brand-400 hover:underline"
          >
            ✨ Suggest a price
          </button>
        </div>
        <input
          id="price"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          className="input"
          placeholder="e.g. 1.5"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isBusy || done}
          autoFocus
        />
        {suggestion && (
          <div className="mt-2 rounded-lg bg-brand-400/10 p-2 text-xs text-brand-600 dark:text-brand-300">
            <span className="font-semibold">
              AI suggests ~{formatSol(suggestion.suggestedSol)} SOL
            </span>{' '}
            (range {formatSol(suggestion.lowSol)}–{formatSol(suggestion.highSol)}). {suggestion.reasoning}
          </div>
        )}
      </div>

      {breakdown && (
        <dl className="mt-3 space-y-1 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-800/60">
          <div className="flex justify-between text-zinc-500">
            <dt>Marketplace fee ({((marketplace?.feeBps ?? 0) / 100).toFixed(2)}%)</dt>
            <dd>{formatSol(breakdown.feeSol)} SOL</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>You receive on sale</dt>
            <dd>{formatSol(breakdown.sellerProceedsSol)} SOL</dd>
          </div>
        </dl>
      )}

      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>How escrow works:</strong> listing transfers your NFT into a program-owned
        vault (PDA). It leaves your wallet immediately and is held safely on-chain until it
        sells or you delist it — at which point it returns to you. You keep custody via the
        program; no third party can move it.
      </div>

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
            disabled={!valid || isBusy}
            onClick={() => list(nft.mint, priceNum)}
          >
            {isBusy ? <Spinner /> : 'List NFT'}
          </button>
        )}
      </div>
    </Modal>
  );
}
