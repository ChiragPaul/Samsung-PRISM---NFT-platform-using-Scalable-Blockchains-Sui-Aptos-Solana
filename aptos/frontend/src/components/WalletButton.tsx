import { useEffect, useRef, useState } from "react"
import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react"
import { extractErrorMessage } from "../utils/errors"

function truncateAddress(address?: string | null) {
  if (!address) {
    return "Connect Wallet"
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function WalletButton() {
  const {
    account,
    connected,
    connect,
    disconnect,
    isLoading,
    wallet,
    wallets,
  } = useWallet()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleConnect = async (walletName: string) => {
    try {
      setOpen(false)
      await connect(walletName)
    } catch (error) {
      alert(extractErrorMessage(error))
    }
  }

  const handleDisconnect = async () => {
    try {
      setOpen(false)
      await disconnect()
    } catch (error) {
      alert(extractErrorMessage(error))
    }
  }

  const installedWallets = wallets.filter(
    (candidate) => candidate.readyState === WalletReadyState.Installed
  )
  const address = account?.address?.toString() ?? null

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-gradient-to-r from-fuchsia-200 to-violet-500 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:brightness-105"
      >
        {isLoading ? "Loading..." : connected ? truncateAddress(address) : "Connect Wallet"}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[60] min-w-[260px] rounded-[24px] border border-white/10 bg-[#121116] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          {connected ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Connected Wallet
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {wallet?.name ?? "Unknown wallet"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{address}</p>
              </div>

              <button
                onClick={() => void handleDisconnect()}
                className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-fuchsia-300/30 hover:bg-fuchsia-400/10"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="px-2 pb-1 text-xs uppercase tracking-[0.24em] text-zinc-500">
                Available Wallets
              </p>

              {installedWallets.length === 0 ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4 text-sm text-zinc-300">
                  No installed Aptos wallet detected.
                </div>
              ) : (
                installedWallets.map((candidate) => (
                  <button
                    key={candidate.name}
                    onClick={() => void handleConnect(candidate.name)}
                    className="flex w-full items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-sm text-white transition hover:border-fuchsia-300/30 hover:bg-fuchsia-400/10"
                  >
                    <span>{candidate.name}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Connect
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
