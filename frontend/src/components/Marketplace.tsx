import { useEffect, useRef, useState } from "react"
import NFTCard from "./NFTCard"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core"
import {
  type MarketplaceNFT,
  aptos,
  fetchListing,
  fetchMarketplaceNFTs,
  invalidateAptosCaches,
  rememberMarketplaceAccount,
} from "../utils/aptosClient"
import {
  APTOS_NETWORK_NAME,
  MARKETPLACE_BUY_FUNCTION,
  MARKETPLACE_CANCEL_FUNCTION,
  MARKETPLACE_LIST_FUNCTION,
} from "../constants/aptos"
import { useActivity } from "../hooks/useActivity"
import { parseAptToOctas } from "../utils/aptosAmount"
import {
  buildAptosTransactionToast,
  formatAptosError,
  isUserRejectedError,
  logAptosTransactionError,
} from "../utils/errors"
import {
  ensureMarketplaceStore,
  ensureNftStore,
} from "../utils/storeInitialization"
import { submitEntryFunctionTransaction } from "../utils/walletTransaction"
import { useToast } from "../hooks/useToast"

type ListingDebugInfo = {
  priceInput: string
  normalized: string
  priceInOctas: string
  priceInOctasType: string
  functionArguments: [number, string]
  serializedPayload: string
  simulationPayload: string
}

const logListingDebugInfo = (info: ListingDebugInfo) => {
  console.log("LISTING DEBUG priceInput:", info.priceInput)
  console.log("LISTING DEBUG normalized:", info.normalized)
  console.log("LISTING DEBUG priceInOctas:", info.priceInOctas)
  console.log("LISTING DEBUG typeof priceInOctas:", info.priceInOctasType)
  console.log("LISTING DEBUG functionArguments:", info.functionArguments)
  console.log("LISTING DEBUG serialized payload:", info.serializedPayload)
  console.log("LISTING DEBUG simulation payload:", info.simulationPayload)
}

export default function Marketplace() {
  const { account, connected, network, signAndSubmitTransaction } = useWallet()
  const { recordActivities } = useActivity()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState("all")
  const [nfts, setNfts] = useState<MarketplaceNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successExplorerUrl, setSuccessExplorerUrl] = useState<string | null>(null)
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null)
  const [activeNftId, setActiveNftId] = useState<string | null>(null)
  const transactionLockRef = useRef(false)
  const walletAddress = account?.address?.toString().toLowerCase() ?? null

  const resetTransientState = () => {
    setActionError(null)
    setSuccessMessage(null)
    setSuccessExplorerUrl(null)
    setSuccessTxHash(null)
    setActiveNftId(null)
  }

  const getPriceInput = (nft: MarketplaceNFT) => {
    const promptValue = window.prompt(`Enter listing price in APT for ${nft.title}`, "1")
    return promptValue === null ? null : promptValue
  }

  const rebuildMarketplace = async (accountAddress = walletAddress ?? undefined) => {
    setLoading(true)
    setError(null)

    try {
      invalidateAptosCaches(accountAddress ? [accountAddress] : undefined)
      const data = await fetchMarketplaceNFTs(accountAddress)
      setNfts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch NFTs from Testnet")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        invalidateAptosCaches(walletAddress ? [walletAddress] : undefined)
        setLoading(true)
        setError(null)
        const data = await fetchMarketplaceNFTs(walletAddress ?? undefined)
        if (!cancelled) {
          setNfts(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch NFTs from Testnet")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [walletAddress])

  const walletNetwork = network?.name?.toLowerCase?.() ?? ""
  const isTestnet = !walletNetwork || walletNetwork === APTOS_NETWORK_NAME

  const handleListOrCancel = async (nft: MarketplaceNFT) => {
    if (transactionLockRef.current) {
      return
    }

    if (!connected || !account?.address) {
      showToast({
        variant: "error",
        title: "Connect wallet",
        description: "Please connect your wallet before listing or cancelling.",
      })
      return
    }

    if (!isTestnet) {
      showToast({
        variant: "error",
        title: "Wrong network",
        description: `Switch wallet network to ${APTOS_NETWORK_NAME}.`,
      })
      return
    }

    transactionLockRef.current = true
    setActiveNftId(nft.id)
    resetTransientState()

    try {
      rememberMarketplaceAccount(account.address.toString())
      await ensureNftStore({
        aptos,
        accountAddress: account.address.toString(),
        signAndSubmitTransaction,
      })
      await ensureMarketplaceStore({
        aptos,
        accountAddress: account.address.toString(),
        signAndSubmitTransaction,
      })

      const currentListing = nft.isListed
        ? await fetchListing(
            nft.listingId ?? nft.numericTokenId,
            nft.seller ?? account.address.toString()
          )
        : null

      if (currentListing) {
        const cancelPayload: InputTransactionData = {
          data: {
            function: MARKETPLACE_CANCEL_FUNCTION,
            typeArguments: [],
            functionArguments: [nft.numericTokenId],
          },
        }

        const tx = await submitEntryFunctionTransaction({
          sender: account.address.toString(),
          payload: cancelPayload,
          signAndSubmitTransaction,
        })

        await aptos.waitForTransaction({
          transactionHash: tx.hash,
          options: { checkSuccess: true },
        })

        invalidateAptosCaches([account.address.toString()])
        await rebuildMarketplace(account.address.toString())

        showToast({
          variant: "success",
          title: "Listing cancelled",
          description: `Transaction confirmed: ${tx.hash}`,
        })
        setSuccessMessage(`Cancelled listing for ${nft.title}.`)
        setSuccessExplorerUrl(
          `https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`
        )
        setSuccessTxHash(tx.hash)
        return
      }

      const priceInput = getPriceInput(nft)
      if (priceInput === null) {
        throw new Error("Listing cancelled before entering a price.")
      }

      const normalized = priceInput.trim()
      const priceInOctas = parseAptToOctas(normalized)
      const listFunctionArguments: [number, string] = [
        nft.numericTokenId,
        priceInOctas,
      ]
      const listPayload: InputTransactionData = {
        data: {
          function: MARKETPLACE_LIST_FUNCTION,
          typeArguments: [],
          functionArguments: listFunctionArguments,
        },
      }

      const serializedPayload = JSON.stringify(listPayload)
      const simulationPayload = JSON.stringify({
        function: MARKETPLACE_LIST_FUNCTION,
        typeArguments: [],
        functionArguments: listFunctionArguments,
      })

      logListingDebugInfo({
        priceInput,
        normalized,
        priceInOctas,
        priceInOctasType: typeof priceInOctas,
        functionArguments: listFunctionArguments,
        serializedPayload,
        simulationPayload,
      })

      const tx = await submitEntryFunctionTransaction({
        sender: account.address.toString(),
        payload: listPayload,
        signAndSubmitTransaction,
      })

      await aptos.waitForTransaction({
        transactionHash: tx.hash,
        options: { checkSuccess: true },
      })

      invalidateAptosCaches([account.address.toString()])
      await rebuildMarketplace(account.address.toString())

      showToast({
        variant: "success",
        title: "NFT listed",
        description: `Transaction confirmed: ${tx.hash}`,
      })
      setSuccessMessage(`Listed ${nft.title} for sale.`)
      setSuccessExplorerUrl(
        `https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`
      )
      setSuccessTxHash(tx.hash)
    } catch (error: unknown) {
      logAptosTransactionError("MARKETPLACE_ACTION", error)

      if (isUserRejectedError(error)) {
        showToast({
          variant: "info",
          title: "Transaction cancelled",
          description: "You rejected the request in your wallet.",
        })
      } else {
        const toast = buildAptosTransactionToast(error, "Marketplace action failed")
        showToast({
          variant: "error",
          title: toast.title,
          description: toast.description,
        })
        setActionError(formatAptosError(error))
      }
    } finally {
      transactionLockRef.current = false
      setActiveNftId(null)
    }
  }

  const handleBuy = async (nft: MarketplaceNFT) => {
    if (transactionLockRef.current) {
      return
    }

    if (!connected || !account?.address) {
      showToast({
        variant: "error",
        title: "Connect wallet",
        description: "Please connect your wallet before buying.",
      })
      return
    }

    if (!isTestnet) {
      showToast({
        variant: "error",
        title: "Wrong network",
        description: `Switch wallet network to ${APTOS_NETWORK_NAME}.`,
      })
      return
    }

    transactionLockRef.current = true
    setActiveNftId(nft.id)
    resetTransientState()

    try {
      rememberMarketplaceAccount(account.address.toString())
      await ensureMarketplaceStore({
        aptos,
        accountAddress: account.address.toString(),
        signAndSubmitTransaction,
      })

      const liveListing = await fetchListing(
        nft.listingId ?? nft.numericTokenId,
        nft.seller ?? account.address.toString()
      )

      if (!liveListing) {
        throw new Error("Listing no longer exists on-chain.")
      }

      const buyPayload: InputTransactionData = {
        data: {
          function: MARKETPLACE_BUY_FUNCTION,
          typeArguments: [],
          functionArguments: [nft.numericTokenId],
        },
      }

      const tx = await submitEntryFunctionTransaction({
        sender: account.address.toString(),
        payload: buyPayload,
        signAndSubmitTransaction,
      })

      await aptos.waitForTransaction({
        transactionHash: tx.hash,
        options: { checkSuccess: true },
      })

      invalidateAptosCaches([account.address.toString()])
      await rebuildMarketplace(account.address.toString())

      recordActivities([
        {
          walletAddress: account.address.toString(),
          type: "BOUGHT",
          title: nft.title,
          image: nft.image,
          tokenId: nft.tokenId,
          txHash: tx.hash,
        },
      ])

      showToast({
        variant: "success",
        title: "NFT purchased",
        description: `Transaction confirmed: ${tx.hash}`,
      })
      setSuccessMessage(`Purchased ${nft.title}.`)
      setSuccessExplorerUrl(
        `https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`
      )
      setSuccessTxHash(tx.hash)
    } catch (error: unknown) {
      logAptosTransactionError("MARKETPLACE_BUY", error)

      if (isUserRejectedError(error)) {
        showToast({
          variant: "info",
          title: "Transaction cancelled",
          description: "You rejected the purchase request in your wallet.",
        })
      } else {
        const toast = buildAptosTransactionToast(error, "Buy failed")
        showToast({
          variant: "error",
          title: toast.title,
          description: toast.description,
        })
        setActionError(formatAptosError(error))
      }
    } finally {
      transactionLockRef.current = false
      setActiveNftId(null)
    }
  }

  const visibleNfts = nfts.filter((nft) => {
    if (activeTab === "owned") return nft.isOwner && !nft.isListed
    if (activeTab === "listed") return nft.isListed
    return true
  })

  return (
    <div className="min-h-screen bg-[#09090d] px-6 pt-28 text-white lg:px-20">
      <section className="relative mx-auto max-w-7xl pb-20">
        <div className="max-w-5xl">
          <p className="text-sm uppercase tracking-[0.34em] text-cyan-300">
            Curated Marketplace
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl">
            The Curator&apos;s
            <span className="block bg-gradient-to-r from-fuchsia-200 to-violet-400 bg-clip-text text-transparent">
              Selection
            </span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
            Marketplace state is rebuilt directly from on-chain NFT and listing tables
            after every action, so the UI stays in sync with Aptos Testnet.
          </p>
        </div>

        {successMessage ? (
          <div className="mt-8 rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm text-emerald-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <span>{successMessage}</span>
              {successExplorerUrl ? (
                <a
                  href={successExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline underline-offset-4"
                >
                  View on Explorer
                </a>
              ) : null}
            </div>
            {successTxHash ? (
              <p className="mt-3 font-mono text-xs text-emerald-200/80">
                Transaction hash: {successTxHash}
              </p>
            ) : null}
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-8 rounded-[24px] border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-100">
            {actionError}
          </div>
        ) : null}

        <div className="mt-12 flex flex-wrap gap-3">
          {[
            { key: "all", label: "All Items" },
            { key: "owned", label: "My Collection" },
            { key: "listed", label: "Recently Listed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-fuchsia-300 to-violet-400 text-black"
                  : "border border-white/8 bg-white/[0.04] text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-zinc-300">
              Loading marketplace state...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/5 p-10 text-rose-100">
              {error}
            </div>
          ) : visibleNfts.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-zinc-300">
              No on-chain NFTs found for the tracked Testnet accounts.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleNfts.map((nft) => (
                <NFTCard
                  key={nft.id}
                  tokenId={nft.tokenId}
                  title={nft.title}
                  owner={nft.owner}
                  price={nft.price}
                  image={nft.image}
                  status={nft.status}
                  isOwner={nft.isOwner}
                  isListed={nft.isListed}
                  actionLabel={
                    nft.isOwner
                      ? nft.isListed
                        ? "Cancel Listing"
                        : "List for Sale"
                      : "Buy NFT"
                  }
                  actionDisabled={transactionLockRef.current && activeNftId === nft.id}
                  onAction={
                    nft.isOwner
                      ? () => void handleListOrCancel(nft)
                      : nft.isListed
                        ? () => void handleBuy(nft)
                        : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
