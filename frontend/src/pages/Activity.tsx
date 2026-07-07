import { useMemo, useState } from "react"
import ActivityItem from "../components/ActivityItem"
import { useActivity } from "../hooks/useActivity"

type FilterKey = "all" | "minted" | "bought" | "sold"

export default function ActivityPage() {
  const { activities, currentWalletAddress } = useActivity()
  const [filter, setFilter] = useState<FilterKey>("all")

  const filteredActivities = useMemo(() => {
    if (filter === "minted") {
      return activities.filter((activity) => activity?.type === "MINTED")
    }

    if (filter === "bought") {
      return activities.filter((activity) => activity?.type === "BOUGHT")
    }

    if (filter === "sold") {
      return activities.filter((activity) => {
        const type = activity?.type
        return type === "SOLD" || type === "LISTED" || type === "CANCELLED"
      })
    }

    return activities
  }, [activities, filter])

  return (
    <div className="min-h-screen bg-[#09090d] px-6 pt-28 text-white lg:px-20">
      <section className="relative mx-auto max-w-7xl pb-20">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.34em] text-cyan-300">Activity</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl">
            Wallet
            <span className="block bg-gradient-to-r from-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
              Activity Feed
            </span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
            Review recent mint, buy, and seller-side marketplace actions for the
            currently connected wallet.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            {currentWalletAddress
              ? `Tracking ${currentWalletAddress}`
              : "Connect a wallet to view activity."}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {([
            ["all", "All"],
            ["minted", "Minted"],
            ["bought", "Bought"],
            ["sold", "Sold"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                filter === value
                  ? "bg-gradient-to-r from-fuchsia-300 to-violet-500 text-black"
                  : "bg-white/[0.05] text-zinc-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-12 space-y-5">
          <h2 className="text-2xl font-semibold text-white">Recent Transactions</h2>

          {!currentWalletAddress ? (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8 text-zinc-300">
              Connect a wallet to load activity.
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8 text-zinc-300">
              No activity found for this wallet and filter yet.
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
