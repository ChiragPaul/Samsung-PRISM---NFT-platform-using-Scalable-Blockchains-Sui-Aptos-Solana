import { Link } from 'react-router-dom';
import { CountUp } from '../../components/CountUp';

interface HeroProps {
  listingCount: number;
  collectionCount: number;
  floorSol: number | null;
}

/** Marketplace hero band with headline + at-a-glance live stats. */
export function Hero({ listingCount, collectionCount, floorSol }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-brand-500 via-brand-400 to-accent p-8 text-white shadow-lg dark:border-zinc-800 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-black/10 blur-2xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live on Solana · Real-time on-chain
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Own the moment.{' '}
          <span className="bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
            On-chain, in real time.
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
          Mint, list, buy and sell NFTs on Solana — every move settled on the chain, nothing hidden
          behind a server. Trustless escrow. Live ownership. Built for collectors who want the real
          thing.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/mint" className="btn bg-white px-5 text-brand-500 shadow-md hover:bg-white/90">
            Start minting →
          </Link>
          <Link
            to="/analytics"
            className="btn border border-white/40 px-5 text-white hover:bg-white/10"
          >
            Live stats
          </Link>
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
          <Stat label="Active listings">
            <CountUp value={listingCount} />
          </Stat>
          <Stat label="Collections">
            <CountUp value={collectionCount} />
          </Stat>
          <Stat label="Floor price">
            {floorSol != null ? <CountUp value={floorSol} decimals={2} suffix=" SOL" /> : '—'}
          </Stat>
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dd className="text-2xl font-extrabold tabular-nums">{children}</dd>
      <dt className="text-xs font-medium uppercase tracking-wide text-white/70">{label}</dt>
    </div>
  );
}
