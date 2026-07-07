import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useAdminActions } from '../../hooks/useAdminActions';
import { TxStatusTracker } from '../../components/TxStatusTracker';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState, LoadingState } from '../../components/ui/states';
import { ConnectGate } from '../../components/wallet/ConnectGate';
import { clampFeeBps, feeBpsToPercent } from '../../lib/anchor/feeMath';
import { config, explorerUrl, LAMPORTS_PER_SOL, MAX_FEE_BPS } from '../../lib/config';
import { formatSol, shortenAddress } from '../../lib/utils';

export function AdminPage() {
  return (
    <ConnectGate message="Connect the marketplace authority wallet to access admin controls.">
      <AdminInner />
    </ConnectGate>
  );
}

function AdminInner() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { data: marketplace, isLoading } = useMarketplace();
  const { isAuthority, updateFee, initializeMarketplace, status, reset } = useAdminActions();

  const treasuryQuery = useQuery({
    queryKey: ['treasuryBalance', marketplace?.treasury],
    enabled: Boolean(marketplace?.treasury),
    queryFn: async () => {
      const lamports = await connection.getBalance(new PublicKey(marketplace!.treasury), 'confirmed');
      return lamports / LAMPORTS_PER_SOL;
    },
  });

  if (isLoading) return <LoadingState label="Loading marketplace config…" />;

  // Not initialized yet → offer the one-time initialize flow.
  if (!marketplace) {
    return <InitializeForm onInit={initializeMarketplace} status={status} reset={reset} />;
  }

  // Hard guard: even if the route is reached, non-authorities see nothing actionable.
  if (!isAuthority) {
    return (
      <EmptyState
        title="Not authorized"
        description={`This wallet (${shortenAddress(
          publicKey?.toBase58() ?? '',
        )}) is not the marketplace authority.`}
        icon="🔒"
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">Admin</h1>

      <div className="card grid grid-cols-2 gap-4 p-5">
        <Stat label="Marketplace" value={marketplace.name} />
        <Stat label="Current fee" value={`${feeBpsToPercent(marketplace.feeBps).toFixed(2)}%`} />
        <Stat label="Active listings" value={String(marketplace.listingsCount)} />
        <Stat
          label="Treasury balance"
          value={treasuryQuery.data != null ? `${formatSol(treasuryQuery.data)} SOL` : '…'}
        />
        <div className="col-span-2">
          <p className="text-xs text-zinc-400">Treasury</p>
          <a
            href={explorerUrl(marketplace.treasury, 'address')}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-xs text-brand-400 hover:underline"
          >
            {marketplace.treasury}
          </a>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-zinc-400">Authority</p>
          <span className="break-all font-mono text-xs">{marketplace.authority}</span>
        </div>
      </div>

      <UpdateFeeForm current={marketplace.feeBps} onUpdate={updateFee} status={status} reset={reset} />
    </div>
  );
}

function UpdateFeeForm({
  current,
  onUpdate,
  status,
  reset,
}: {
  current: number;
  onUpdate: (bps: number) => Promise<unknown>;
  status: import('../../types').TxStatus;
  reset: () => void;
}) {
  const [percent, setPercent] = useState((current / 100).toString());
  const bps = clampFeeBps(Math.round(Number(percent) * 100));
  const valid = Number.isFinite(Number(percent)) && bps >= 0 && bps <= MAX_FEE_BPS;
  const isBusy = status.stage !== 'idle' && status.stage !== 'error';

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        reset();
        if (valid) void onUpdate(bps);
      }}
    >
      <h2 className="text-base font-bold">Update marketplace fee</h2>
      <div>
        <label htmlFor="fee" className="mb-1 block text-sm font-medium">
          Fee (%)
        </label>
        <input
          id="fee"
          type="number"
          min={0}
          max={100}
          step="0.01"
          className="input max-w-[10rem]"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-400">
          = {bps} bps. Max {MAX_FEE_BPS} bps (100%). Applies to all future sales.
        </p>
      </div>
      <TxStatusTracker status={status} />
      <button type="submit" className="btn-primary" disabled={!valid || isBusy}>
        {isBusy ? <Spinner /> : 'Update fee'}
      </button>
    </form>
  );
}

function InitializeForm({
  onInit,
  status,
  reset,
}: {
  onInit: (name: string, bps: number) => Promise<unknown>;
  status: import('../../types').TxStatus;
  reset: () => void;
}) {
  const [name, setName] = useState(config.marketplaceName);
  const [percent, setPercent] = useState('2');
  const bps = clampFeeBps(Math.round(Number(percent) * 100));
  const isBusy = status.stage !== 'idle' && status.stage !== 'error';

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Initialize marketplace</h1>
      <p className="text-sm text-zinc-500">
        No marketplace config exists for "{config.marketplaceName}" yet. The connected wallet
        becomes the authority. The name must match <code>VITE_MARKETPLACE_NAME</code> so the rest
        of the app resolves the same PDA.
      </p>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          reset();
          void onInit(name.trim(), bps);
        }}
      >
        <div>
          <label htmlFor="mname" className="mb-1 block text-sm font-medium">
            Marketplace name (PDA seed)
          </label>
          <input id="mname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ifee" className="mb-1 block text-sm font-medium">
            Initial fee (%)
          </label>
          <input
            id="ifee"
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="input max-w-[10rem]"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
        <TxStatusTracker status={status} />
        <button type="submit" className="btn-primary" disabled={isBusy || !name.trim()}>
          {isBusy ? <Spinner /> : 'Initialize'}
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
