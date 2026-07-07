import type { ActivityRecord } from "../context/ActivityContext"
import { ipfsToHttp } from "../utils/ipfs"

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "Just now"
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`
  return `${Math.floor(diff / day)} day ago`
}

function getActivityTone(type: ActivityRecord["type"]) {
  switch (type) {
    case "MINTED":
      return "text-cyan-300"
    case "BOUGHT":
      return "text-emerald-300"
    case "SOLD":
      return "text-fuchsia-300"
    case "LISTED":
      return "text-amber-300"
    case "CANCELLED":
      return "text-zinc-300"
    default:
      return "text-white"
  }
}

export default function ActivityItem({ activity }: { activity: ActivityRecord }) {
  return (
    <div className="grid gap-4 rounded-[28px] border border-white/8 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:grid-cols-[100px_1fr]">
      <div className="h-24 w-24 overflow-hidden rounded-[20px] bg-white/[0.04]">
        {activity.image ? (
          <img
            src={ipfsToHttp(activity.image)}
            alt={activity.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.24em] text-zinc-500">
            NFT
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.28em] ${getActivityTone(activity.type)}`}>
              {activity.type}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{activity.title}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {activity.tokenId ? `${activity.tokenId} • ` : ""}
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>

          {activity.price ? (
            <p className="text-lg font-semibold text-fuchsia-300">{activity.price} APT</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 text-sm text-zinc-400">
          {activity.counterparty ? (
            <p>Counterparty: {activity.counterparty}</p>
          ) : null}
          {activity.txHash ? (
            <p className="truncate">Tx: {activity.txHash}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
