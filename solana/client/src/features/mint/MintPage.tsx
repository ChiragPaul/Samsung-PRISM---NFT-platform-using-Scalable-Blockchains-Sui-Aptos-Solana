import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMintNft, type MintStage } from '../../hooks/useMintNft';
import { ConnectGate } from '../../components/wallet/ConnectGate';
import { NftImage } from '../../components/NftImage';
import { Spinner } from '../../components/ui/Spinner';
import { generateNftIdea } from '../../lib/ai/aiAssist';
import { useWallet } from '@solana/wallet-adapter-react';
import { explorerUrl } from '../../lib/config';
import { shortenAddress } from '../../lib/utils';

interface Attr {
  trait_type: string;
  value: string;
}

const STAGE_LABEL: Record<MintStage, string> = {
  idle: '',
  uploading: 'Uploading metadata to Irys…',
  minting: 'Building mint transaction…',
  confirming: 'Confirming on-chain…',
  done: 'Done',
  error: 'Error',
};

export function MintPage() {
  return (
    <ConnectGate message="Connect your wallet to mint an NFT on Devnet.">
      <MintInner />
    </ConnectGate>
  );
}

function MintInner() {
  const { mint, status, reset } = useMintNft();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [royalty, setRoyalty] = useState('5');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [attributes, setAttributes] = useState<Attr[]>([{ trait_type: '', value: '' }]);
  const [advanced, setAdvanced] = useState(false);
  const [metadataUri, setMetadataUri] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const generateWithAi = async () => {
    setAiBusy(true);
    try {
      const idea = await generateNftIdea({
        name,
        collection: undefined,
        attributes: attributes.filter((a) => a.trait_type && a.value),
      });
      if (!name.trim()) setName(idea.name);
      setDescription(idea.description);
    } finally {
      setAiBusy(false);
    }
  };

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : imageUrl || null),
    [imageFile, imageUrl],
  );

  const busy = status.stage !== 'idle' && status.stage !== 'error' && status.stage !== 'done';
  const valid =
    name.trim().length > 0 &&
    (advanced ? metadataUri.trim().length > 0 : Boolean(imageFile) || imageUrl.trim().length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    void mint({
      name: name.trim(),
      symbol: symbol.trim(),
      description: description.trim(),
      royaltyPercent: Math.max(0, Math.min(100, Number(royalty) || 0)),
      attributes,
      imageFile: advanced ? null : imageFile,
      imageUrl: advanced ? undefined : imageUrl,
      metadataUri: advanced ? metadataUri : undefined,
    });
  };

  if (status.stage === 'done') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-extrabold">NFT minted!</h1>
        <div className="card p-5 text-left">
          {previewUrl && (
            <NftImage src={previewUrl} alt={name} className="mb-3 aspect-square w-full rounded-xl" />
          )}
          <p className="font-semibold">{name}</p>
          <a
            href={status.mintAddress ? explorerUrl(status.mintAddress, 'address') : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-brand-400 hover:underline"
          >
            {status.mintAddress ? shortenAddress(status.mintAddress, 6) : ''} ↗
          </a>
          {walletAddress && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ Recorded in your wallet{' '}
              <span className="font-mono">{shortenAddress(walletAddress, 5)}</span> on Solana Devnet
            </p>
          )}
        </div>
        <div className="flex justify-center gap-2">
          <Link to="/portfolio" className="btn-primary">
            List it now →
          </Link>
          <button type="button" className="btn-secondary" onClick={reset}>
            Mint another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Mint an NFT</h1>
        <p className="text-sm text-zinc-500">
          Creates a real 1/1 NFT in your wallet via Metaplex Token Metadata on Devnet. Once minted,
          list it from your Portfolio.
        </p>
      </div>

      {/* Make the on-chain destination explicit: the NFT records into THIS wallet. */}
      {walletAddress ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <span aria-hidden="true">🔗</span>
          <span>
            Minting to your connected wallet{' '}
            <span className="font-mono font-semibold">{shortenAddress(walletAddress, 5)}</span>{' '}
            — the NFT will be recorded here on-chain.
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          ⚠️ Connect a wallet first — your NFT records into the connected wallet.
        </div>
      )}

      <form className="grid gap-5 md:grid-cols-[200px_1fr]" onSubmit={submit}>
        {/* Image / preview */}
        <div className="space-y-2">
          <div className="card aspect-square overflow-hidden">
            {previewUrl ? (
              <NftImage src={previewUrl} alt="preview" className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl text-zinc-300">🖼️</div>
            )}
          </div>
          {!advanced && (
            <>
              <label className="btn-secondary w-full cursor-pointer text-center text-xs">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <input
                className="input text-xs"
                placeholder="…or paste image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={Boolean(imageFile)}
              />
            </>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={generateWithAi}
            disabled={aiBusy}
            className="btn-secondary w-full justify-center text-sm"
          >
            {aiBusy ? <Spinner /> : '✨'} Generate name & description with AI
          </button>

          <Field label="Name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Cool NFT" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Symbol">
              <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="COOL" />
            </Field>
            <Field label="Royalty (%)">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                className="input"
                value={royalty}
                onChange={(e) => setRoyalty(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="input min-h-[72px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell collectors about it…"
            />
          </Field>

          {!advanced && (
            <Field label="Traits">
              <div className="space-y-2">
                {attributes.map((attr, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      placeholder="Trait (e.g. Background)"
                      value={attr.trait_type}
                      onChange={(e) =>
                        setAttributes((prev) =>
                          prev.map((a, j) => (j === i ? { ...a, trait_type: e.target.value } : a)),
                        )
                      }
                    />
                    <input
                      className="input"
                      placeholder="Value (e.g. Blue)"
                      value={attr.value}
                      onChange={(e) =>
                        setAttributes((prev) =>
                          prev.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn-ghost px-2"
                      aria-label="Remove trait"
                      onClick={() => setAttributes((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-400 hover:underline"
                  onClick={() => setAttributes((prev) => [...prev, { trait_type: '', value: '' }])}
                >
                  + Add trait
                </button>
              </div>
            </Field>
          )}

          {/* Advanced: direct metadata URI */}
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} className="accent-brand-400" />
              Advanced: use an existing metadata JSON URI (skips upload)
            </label>
            {advanced && (
              <input
                className="input mt-2 text-xs"
                placeholder="https://…/metadata.json (Arweave/IPFS/any host)"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
              />
            )}
          </div>

          {status.stage === 'error' && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {status.error}
            </p>
          )}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Spinner /> {STAGE_LABEL[status.stage]}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={!valid || busy}>
            {busy ? 'Minting…' : 'Mint NFT'}
          </button>
          <p className="text-center text-[11px] text-zinc-400">
            Uploading via Irys requires a little Devnet SOL (you have a faucet balance). Or use the
            Advanced URI option to mint with zero uploads.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
