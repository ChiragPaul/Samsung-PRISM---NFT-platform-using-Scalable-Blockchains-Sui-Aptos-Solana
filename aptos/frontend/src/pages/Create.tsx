import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/ipfs"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core"
import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import {
  APTOS_NETWORK_NAME,
  REAL_NFT_MINT_FUNCTION,
  REAL_NFT_MODULE_ADDRESS,
} from "../constants/aptos"
import { aptos, fetchAccountNFTs, invalidateAptosCaches } from "../utils/aptosClient"
import { useActivity } from "../hooks/useActivity"
import {
  buildAptosTransactionToast,
  isUserRejectedError,
  logAptosTransactionError,
} from "../utils/errors"
import { ensureNftStore } from "../utils/storeInitialization"
import { submitEntryFunctionTransaction } from "../utils/walletTransaction"
import { useToast } from "../hooks/useToast"

export default function Create() {
  const {
    account,
    signAndSubmitTransaction,
    connected,
    network,
  } = useWallet()
  const { recordActivity } = useActivity()
  const { showToast } = useToast()

  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successExplorerUrl, setSuccessExplorerUrl] = useState<string | null>(null)
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const mintInFlightRef = useRef(false)
  const walletAddress = account?.address?.toString().toLowerCase() ?? null

  const resetState = () => {
    setName("")
    setFile(null)
    setPreview(null)
    setLoading(false)
    setSuccessMessage(null)
    setSuccessExplorerUrl(null)
    setSuccessTxHash(null)
    mintInFlightRef.current = false
  }

  useEffect(() => {
    resetState()
  }, [walletAddress])

  // 📁 FILE HANDLER
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
  }

  // 🚀 FINAL MINT
  const handleMint = async () => {
    try {
      if (mintInFlightRef.current) {
        return
      }

      // 🔐 WALLET CHECK
      if (!connected || !account?.address) {
        alert("Connect wallet first ❌")
        return
      }

      const walletNetwork = network?.name?.toLowerCase?.() ?? ""
      if (walletNetwork && walletNetwork !== APTOS_NETWORK_NAME) {
        throw new Error(
          `Wallet is connected to ${network?.name}. Switch to ${APTOS_NETWORK_NAME} and try again.`
        )
      }

      // 📦 INPUT CHECK
      if (!name || !file) {
        alert("Enter name + upload image ❌")
        return
      }

      mintInFlightRef.current = true
      setLoading(true)
      setSuccessMessage(null)
      setSuccessExplorerUrl(null)
      setSuccessTxHash(null)

      await ensureNftStore({
        aptos,
        accountAddress: account.address.toString(),
        signAndSubmitTransaction,
      })

      // ✅ STEP 1: Upload IMAGE
      const imageURI = await uploadFileToIPFS(file)
      if (!imageURI) throw new Error("Image upload failed")

      // ✅ STEP 2: Create METADATA
      const metadata = {
        name,
        description: "NFT created on Aptos",
        image: imageURI, // ✅ MUST BE IMAGE CID
      }

      // ✅ STEP 3: Upload METADATA
      const metadataURI = await uploadJSONToIPFS(metadata)
      if (!metadataURI) throw new Error("Metadata upload failed")

      const payload: InputTransactionData = {
        data: {
          function: REAL_NFT_MINT_FUNCTION,
          typeArguments: [],
          functionArguments: [name, metadataURI],
        },
      }

      const tx = await submitEntryFunctionTransaction({
        sender: account.address.toString(),
        payload,
        signAndSubmitTransaction,
      })
      await aptos.waitForTransaction({
        transactionHash: tx.hash,
        options: {
          checkSuccess: true,
        },
      })

      invalidateAptosCaches([account.address.toString()])
      const ownedNfts = await fetchAccountNFTs(account.address.toString())
      const newestTokenId = ownedNfts
        .map((nft) => Number(nft.id))
        .filter((id) => !Number.isNaN(id))
        .sort((left, right) => right - left)[0]

      recordActivity({
        walletAddress: account.address.toString(),
        type: "MINTED",
        title: name,
        image: imageURI,
        tokenId:
          typeof newestTokenId === "number" ? `#${newestTokenId}` : "New Mint",
        txHash: tx.hash,
      })

      setSuccessMessage(`Minted ${name} successfully.`)
      setSuccessExplorerUrl(
        `https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`
      )
      setSuccessTxHash(tx.hash)
      showToast({
        variant: "success",
        title: "Mint successful",
        description: `Transaction submitted. Hash: ${tx.hash}`,
      })
      setName("")
      setFile(null)
      setPreview(null)

    } catch (error: unknown) {
      logAptosTransactionError("MINT", error)

      if (isUserRejectedError(error)) {
        showToast({
          variant: "info",
          title: "Transaction cancelled",
          description: "You rejected the mint request in your wallet.",
        })
      } else {
        const toast = buildAptosTransactionToast(error, "Mint failed")
        showToast({
          variant: "error",
          title: toast.title,
          description: toast.description,
        })
      }
    } finally {
      mintInFlightRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090d] px-6 pt-28 text-white lg:px-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-7xl pb-20">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.34em] text-fuchsia-300">Create</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl">
            Forge New
            <span className="block bg-gradient-to-r from-fuchsia-200 to-violet-400 bg-clip-text text-transparent">
              Artifacts
            </span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
            Transform your concept into a permanent on-chain asset. The mint flow uploads
            preview media and metadata to IPFS, then submits the URI to your Aptos Move module.
          </p>
        </div>

        <div className="mt-14 grid gap-10 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[36px] border border-white/8 bg-[#121116]/90 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            {successMessage ? (
              <div className="mb-6 rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm text-emerald-100">
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

            <div className="space-y-8">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                  Artifact Identity
                </p>
                <input
                  placeholder="Enter NFT Name"
                  className="w-full rounded-full border border-white/6 bg-black/30 px-6 py-5 text-lg text-white outline-none transition placeholder:text-zinc-600 focus:border-fuchsia-300/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                  Metadata Anchor (IPFS)
                </p>
                <div className="flex items-center rounded-full border border-white/6 bg-black/30 px-6 py-5">
                  <span className="mr-4 text-zinc-500">ipfs://...</span>
                  <span className="text-sm text-zinc-600">
                    Generated automatically after image + metadata upload
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                  Lore &amp; Context
                </p>
                <div className="rounded-[28px] border border-white/6 bg-black/30 p-6 text-sm leading-7 text-zinc-400">
                  Your current mint implementation uploads the preview file first, then wraps it
                  inside JSON metadata before calling `{REAL_NFT_MODULE_ADDRESS}::RealNFT::mint`.
                </div>
              </div>
            </div>

            <div className="mt-8 inline-flex rounded-full border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200">
              Estimated gas: <span className="ml-2 text-cyan-300">~0.001 APT</span>
            </div>

            <button
              onClick={handleMint}
              disabled={loading}
              className={`mt-8 w-full rounded-full px-7 py-5 text-lg font-semibold uppercase tracking-[0.24em] transition ${
                loading
                  ? "cursor-not-allowed bg-zinc-700 text-zinc-300"
                  : "bg-gradient-to-r from-fuchsia-200 via-fuchsia-300 to-violet-500 text-black hover:scale-[1.01]"
              }`}
            >
              {loading ? "Minting Artifact..." : "Mint NFT"}
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-[36px] border border-dashed border-fuchsia-300/20 bg-white/[0.03] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
              <p className="mb-5 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                Visual Manifestation
              </p>

              <label className="flex min-h-[430px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-white/10 bg-black/25 text-center transition hover:border-fuchsia-300/30">
                {preview ? (
                  <img src={preview} className="h-[430px] w-full object-cover" />
                ) : (
                  <div className="max-w-xs px-8">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-fuchsia-300/12 text-3xl text-fuchsia-200">
                      ↑
                    </div>
                    <p className="mt-6 text-3xl font-semibold text-white">Upload Preview Art</p>
                    <p className="mt-3 text-base leading-7 text-zinc-400">
                      Drag and drop or click to browse. Supports the NFT image you will pin to IPFS.
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6 text-sm leading-7 text-zinc-300">
              Your artifact will be permanently referenced on-chain once the wallet signs the
              transaction. Double-check the uploaded media before finalizing mint.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
