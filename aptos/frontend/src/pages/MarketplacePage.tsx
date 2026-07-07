import Marketplace from "../components/Marketplace"
import { performanceStats } from "../data/marketplace"

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#09090d] pt-28 text-white">
      <section className="relative overflow-hidden px-6 pb-20 lg:px-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-8 top-16 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.34em] text-cyan-300">
              Real-Time Marketplace
            </p>
            <h1 className="mt-4 text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl">
              Discover, trade, and benchmark
              <span className="block bg-gradient-to-r from-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
                NFTs on Aptos
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              This marketplace view is the functional prototype layer of your project:
              minting, listing, and trading visuals now sit beside the performance story
              that differentiates Aptos from Polygon CDK.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {performanceStats.slice(0, 3).map((stat) => (
              <div
                key={stat.label}
                className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
              >
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.28em] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <Marketplace />
        </div>
      </section>
    </div>
  )
}
