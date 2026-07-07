import { ipfsToHttp } from "../utils/ipfs"

type NFTCardProps = {
  tokenId?: string
  title: string
  owner: string
  price: string
  image?: string
  status?: string
  isOwner?: boolean
  isListed?: boolean
  actionLabel?: string
  actionDisabled?: boolean
  onAction?: () => void
}

export default function NFTCard({
  tokenId,
  title,
  owner,
  price,
  image,
  status,
  isOwner = false,
  isListed = false,
  actionLabel,
  actionDisabled = false,
  onAction,
}: NFTCardProps) {
  const imageUrl = image ? ipfsToHttp(image) : ""
  const primaryLabel = actionLabel ?? (isOwner ? (isListed ? "Cancel Listing" : "List for Sale") : "View Only")

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30">
      <div className="relative h-64 bg-gradient-to-br from-fuchsia-500/15 via-transparent to-cyan-400/10">
        {image ? (
          <img src={imageUrl} className="h-full w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No Image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-transparent to-transparent" />

        {status ? (
          <span className="absolute right-4 top-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            {status}
          </span>
        ) : null}
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-zinc-500">
              Owned by {owner}
            </p>
          </div>

          {tokenId ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
              {tokenId}
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              {isListed ? "Listed Price" : isOwner ? "Floor" : "Price"}
            </p>
            <p className="mt-1 text-2xl font-semibold text-fuchsia-300">
              {price === "--" ? "--" : `${price} APT`}
            </p>
          </div>

          <button
            onClick={onAction}
            disabled={actionDisabled || !onAction}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-fuchsia-400/40 hover:bg-fuchsia-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
