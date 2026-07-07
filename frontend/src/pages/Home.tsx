import { useNavigate } from "react-router-dom"
import heroImage from "../assets/hero.png"
import Marketplace from "../components/Marketplace"
import { comparisonHighlights, performanceStats } from "../data/marketplace"

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#09090d] text-white">
      <section className="relative overflow-hidden px-6 pb-24 pt-28 lg:px-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-fuchsia-500/12 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[#09090d]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Live on Aptos Testnet
            </div>

            <h1 className="mt-8 text-5xl font-semibold leading-[0.92] tracking-tight sm:text-6xl lg:text-8xl">
              Next-Gen NFT
              <span className="block bg-gradient-to-r from-fuchsia-200 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                Marketplace
              </span>
              on Aptos
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              A working Aptos NFT marketplace prototype built to evaluate minting, trading,
              security, and performance against prior Polygon CDK work. The product experience
              now mirrors the problem statement, not just the contract demo.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate("/marketplace")}
                className="rounded-full bg-gradient-to-r from-fuchsia-200 via-fuchsia-300 to-violet-500 px-7 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:scale-[1.02]"
              >
                Explore Marketplace
              </button>

              <button
                onClick={() => navigate("/create")}
                className="rounded-full border border-white/15 bg-white/[0.03] px-7 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-fuchsia-300/40"
              >
                Mint Artifact
              </button>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {comparisonHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{item.label}</p>
                  <p className="mt-4 text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -left-4 top-16 hidden h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl lg:block" />
            <div className="absolute -right-8 bottom-10 hidden h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl lg:block" />

            <div className="relative w-full max-w-xl overflow-hidden rounded-[40px] border border-white/10 bg-[#11111a] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
              <img
                src={heroImage}
                alt="Aptos NFT showcase"
                className="h-[520px] w-full rounded-[30px] object-cover"
              />

              <div className="absolute bottom-10 left-0 right-0 mx-auto flex w-[calc(100%-4rem)] items-center justify-between rounded-[24px] border border-white/10 bg-black/70 px-5 py-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-cyan-300 to-fuchsia-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Featured Artist</p>
                    <p className="font-medium text-white">Ether_Void</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Current Bid</p>
                  <p className="text-xl font-semibold text-cyan-300">42.5 APT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-20">
        <Marketplace />
      </section>

      <section className="border-t border-white/6 bg-[#121116] px-6 py-24 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.34em] text-cyan-300">
              Aptos vs Polygon CDK
            </p>
            <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              Evolved Performance
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              This prototype is now aligned with your evaluation goals: compare execution
              architecture, smart-contract safety, NFT lifecycle support, and cost/latency
              characteristics for a real marketplace use case.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Documentation Track</p>
                <p className="mt-3 text-lg text-white">
                  Comparative analysis: Aptos, Sui, Solana, and Polygon CDK for NFT marketplace throughput.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Audit Track</p>
                <p className="mt-3 text-lg text-white">
                  Review mint, listing, ownership checks, and future cross-chain interoperability assumptions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {performanceStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[30px] border border-white/8 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]"
              >
                <p className="text-4xl font-semibold text-white">{stat.value}</p>
                <p className="mt-3 text-sm uppercase tracking-[0.24em] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
