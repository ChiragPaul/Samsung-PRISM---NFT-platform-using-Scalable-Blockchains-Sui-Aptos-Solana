import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk"
import {
  APTOS_FULLNODE_URL,
  APTOS_NETWORK,
  MARKETPLACE_STORE,
  REAL_NFT_MODULE_ADDRESS,
  REAL_NFT_MODULE_NAME,
  REAL_NFT_STORE,
} from "../constants/aptos"
import { formatOctasAsApt } from "./aptosAmount"
import { ipfsToHttp } from "./ipfs"

const config = new AptosConfig({
  network: APTOS_NETWORK,
})

export const aptos = new Aptos(config)

const INDEXER_PAGE_SIZE = 500
const MARKETPLACE_DISCOVERY_KEY = "aptos-marketplace-accounts"
const RATE_LIMIT_RETRY_DELAYS_MS = [250, 750, 1500]

type TableHandle = {
  handle: string
}

type NFTStoreResource = {
  next_id: string
  nfts: TableHandle
}

type MarketplaceStoreResource = {
  listings: TableHandle
}

type RawStoredNFT = {
  id: string
  name: string
  owner: string
  uri: string
}

type RawListing = {
  nft_id: string
  seller: string
  price: string
}

type TableRow<T> = {
  decoded_key: string | null
  decoded_value: T | null
  key: string
  table_handle: string
  transaction_version: number
  write_set_change_index: number
}

export type MarketplaceNFT = {
  id: string
  tokenId: string
  numericTokenId: number
  listingId?: number
  title: string
  owner: string
  image: string
  metadataUri: string
  price: string
  isOwner: boolean
  status?: string
  isListed: boolean
  seller?: string
}

const nftStoreCache = new Map<string, Promise<NFTStoreResource | null>>()
const marketplaceStoreCache = new Map<string, Promise<MarketplaceStoreResource | null>>()
const nftTableCache = new Map<string, Promise<RawStoredNFT[]>>()
const marketplaceTableCache = new Map<string, Promise<RawListing[]>>()
const listingCache = new Map<string, Promise<RawListing | null>>()

function normalizeAddress(value: string) {
  return value.toLowerCase()
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function readDiscoveredMarketplaceAccounts() {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(MARKETPLACE_DISCOVERY_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map(normalizeAddress)
  } catch {
    return []
  }
}

export function rememberMarketplaceAccount(address: string) {
  if (!address || !canUseLocalStorage()) {
    return
  }

  const normalized = normalizeAddress(address)
  const current = readDiscoveredMarketplaceAccounts()

  if (!current.includes(normalized)) {
    current.push(normalized)
  }

  window.localStorage.setItem(MARKETPLACE_DISCOVERY_KEY, JSON.stringify(current))
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(init?.headers ?? {}),
        },
      })

      const text = await response.text()
      let parsed: T | string | null = null

      if (text) {
        try {
          parsed = JSON.parse(text) as T
        } catch {
          parsed = text
        }
      }

      if (!response.ok) {
        const message =
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          "message" in parsed &&
          typeof (parsed as { message?: unknown }).message === "string"
            ? (parsed as { message: string }).message
            : typeof parsed === "string"
              ? parsed
              : `Request failed with status ${response.status}`

        const error = new Error(message)
        ;(error as { status?: number }).status = response.status
        throw error
      }

      return (parsed ?? null) as T
    } catch (error) {
      lastError = error
      const status = typeof error === "object" && error ? Reflect.get(error, "status") : undefined
      if (status !== 429 || attempt >= RATE_LIMIT_RETRY_DELAYS_MS.length) {
        break
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, RATE_LIMIT_RETRY_DELAYS_MS[attempt])
      )
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed")
}

async function getAccountResourceSafe<T extends object>(
  accountAddress: string,
  resourceType: `${string}::${string}::${string}`
) {
  try {
    return await aptos.getAccountResource<T>({
      accountAddress,
      resourceType,
    })
  } catch {
    return null
  }
}

async function getNftStoreResource(accountAddress: string) {
  const normalized = normalizeAddress(accountAddress)

  if (!nftStoreCache.has(normalized)) {
    nftStoreCache.set(
      normalized,
      getAccountResourceSafe<NFTStoreResource>(normalized, REAL_NFT_STORE)
    )
  }

  return nftStoreCache.get(normalized) ?? Promise.resolve(null)
}

async function getMarketplaceStoreResource(accountAddress: string) {
  const normalized = normalizeAddress(accountAddress)

  if (!marketplaceStoreCache.has(normalized)) {
    marketplaceStoreCache.set(
      normalized,
      getAccountResourceSafe<MarketplaceStoreResource>(normalized, MARKETPLACE_STORE)
    )
  }

  return marketplaceStoreCache.get(normalized) ?? Promise.resolve(null)
}



async function fetchTableItem<T>(handle: string, key: string, valueType: string) {
  return await fetchJson<T>(`${APTOS_FULLNODE_URL}/tables/${handle}/item`, {
    method: "POST",
    body: JSON.stringify({
      key_type: "u64",
      value_type: valueType,
      key,
    }),
  })
}
async function fetchExistingNFTs(
  handle: string,
  nextId: number
): Promise<RawStoredNFT[]> {
  const result: RawStoredNFT[] = []

  const batchSize = 10

  for (let start = 0; start < nextId; start += batchSize) {
    const jobs: Promise<RawStoredNFT | null>[] = []

    for (
      let id = start;
      id < Math.min(nextId, start + batchSize);
      id++
    ) {
      jobs.push(
        fetchTableItem<RawStoredNFT>(
          handle,
          String(id),
          `${REAL_NFT_MODULE_ADDRESS}::${REAL_NFT_MODULE_NAME}::NFT`
        ).catch(() => null)
      )
    }

    const batch = await Promise.all(jobs)

    result.push(
      ...batch.filter(
        (nft): nft is RawStoredNFT => nft !== null
      )
    )

    await new Promise(resolve => setTimeout(resolve, 75))
  }

  return result
}


function cacheKey(value?: string) {
  return normalizeAddress(value ?? "")
}

function mapStoredNft(
  nft: RawStoredNFT,
  connectedAddress?: string
): MarketplaceNFT | null {
  const safeOwner = typeof nft.owner === "string" ? nft.owner : ""
  const safeId = typeof nft.id === "string" ? nft.id : "0"
  const safeUri = typeof nft.uri === "string" ? nft.uri : ""
  const image =
    safeUri.startsWith("ipfs://") || safeUri.startsWith("https://") || safeUri.startsWith("http://")
      ? ipfsToHttp(safeUri)
      : ""

  const title =
    typeof nft.name === "string" && nft.name.trim() ? nft.name : "Untitled NFT"

  return {
    id: `${safeOwner || "unknown"}-${safeId}`,
    tokenId: `#${safeId}`,
    numericTokenId: Number(safeId),
    title,
    owner: safeOwner || "Unknown Owner",
    image,
    metadataUri: safeUri,
    price: "--",
    isOwner:
      typeof connectedAddress === "string" &&
      safeOwner !== "" &&
      normalizeAddress(connectedAddress) === normalizeAddress(safeOwner),
    status: "On-chain",
    isListed: false,
  }
}

export async function fetchNFTByID(accountAddress: string, nftId: number) {
  const store = await getNftStoreResource(accountAddress)
  if (!store?.nfts?.handle) {
    return null
  }

  try {
    return await fetchTableItem<RawStoredNFT>(
      store.nfts.handle,
      nftId.toString(),
      `${REAL_NFT_MODULE_ADDRESS}::${REAL_NFT_MODULE_NAME}::NFT`
    )
  } catch {
    return null
  }
}

export async function fetchListing(listingId: number, connectedAddress?: string) {
  const key = `${cacheKey(connectedAddress)}:${listingId}`

  if (!listingCache.has(key)) {
    listingCache.set(
      key,
      (async () => {
        const store = await getMarketplaceStoreResource(REAL_NFT_MODULE_ADDRESS)
        if (!store?.listings?.handle) {
          return null
        }

        try {
          return await fetchTableItem<RawListing>(
            store.listings.handle,
            String(listingId),
            `${REAL_NFT_MODULE_ADDRESS}::Marketplace::Listing`
          )
        } catch {
          return null
        }
      })()
    )
  }

  return listingCache.get(key) ?? Promise.resolve(null)
}

export async function fetchNFTTable(accountAddress: string) {
  const key = cacheKey(accountAddress)

  if (!nftTableCache.has(key)) {
    nftTableCache.set(
      key,
      (async () => {
        const store = await getNftStoreResource(accountAddress)

        if (!store?.nfts?.handle) {
          return []
        }

        const nextId = Number(store.next_id)

      return fetchExistingNFTs(
        store.nfts.handle,
        nextId
      )
      })()
    )
  }

  return nftTableCache.get(key) ?? Promise.resolve([])
}

export async function fetchMarketplaceTable(
  connectedAddress?: string
): Promise<RawListing[]> {
  const key = cacheKey(connectedAddress)

  if (!marketplaceTableCache.has(key)) {
    marketplaceTableCache.set(
      key,
      (async () => {
        const store = await getMarketplaceStoreResource(REAL_NFT_MODULE_ADDRESS)
        if (!store?.listings?.handle) {
          return []
        }

        const listings: RawListing[] = []

        const nextId = 500
        
        for (let id = 0; id < nextId; id++) {
          try {
            const listing = await fetchTableItem<RawListing>(
              store.listings.handle,
              String(id),
              `${REAL_NFT_MODULE_ADDRESS}::Marketplace::Listing`
            )
        
            listings.push(listing)
          } catch {
          }
        }
        
        return listings
      })()
    )
  }

  return marketplaceTableCache.get(key) ?? Promise.resolve([])
}

export async function fetchAccountNFTs(accountAddress: string) {
  return fetchNFTTable(accountAddress)
}

export async function fetchAccountListings() {
  return fetchMarketplaceTable()
}

export async function fetchMarketplaceNFTs(
  connectedAddress?: string
): Promise<MarketplaceNFT[]> {
  const normalizedConnected = connectedAddress
    ? normalizeAddress(connectedAddress)
    : undefined

  const [listings, connectedAccountNfts] = await Promise.all([
    fetchMarketplaceTable(normalizedConnected),
    normalizedConnected ? fetchNFTTable(normalizedConnected) : Promise.resolve([]),
  ])

  const listedNfts = await Promise.all(
    listings.map(async (listing) => {
      const sellerAddress =
        typeof listing.seller === "string"
          ? normalizeAddress(listing.seller)
          : ""
      const nftId = Number(listing.nft_id)

      if (!sellerAddress || Number.isNaN(nftId)) {
        return null
      }

      rememberMarketplaceAccount(sellerAddress)

      const nft = await fetchNFTByID(sellerAddress, nftId)
      if (!nft) {
        return null
      }

      const mapped = mapStoredNft(nft, normalizedConnected)
      if (!mapped) {
        return null
      }

      return {
        ...mapped,
        listingId: nftId,
        price:
          typeof listing.price === "string"
            ? formatOctasAsApt(listing.price)
            : "--",
        isListed: true,
        seller: sellerAddress,
        status: "Listed",
      } satisfies MarketplaceNFT
    })
  )

  const ownedNfts = connectedAccountNfts
    .map((nft) => mapStoredNft(nft, normalizedConnected))
    .filter((item): item is MarketplaceNFT => item !== null)

  const combined = new Map<string, MarketplaceNFT>()

  for (const nft of [...listedNfts, ...ownedNfts]) {
    if (!nft) continue

    const existing = combined.get(nft.id)
    if (!existing) {
      combined.set(nft.id, nft)
      continue
    }

    combined.set(nft.id, {
      ...existing,
      ...nft,
      isListed: existing.isListed || nft.isListed,
      seller: existing.seller ?? nft.seller,
      price: existing.isListed ? existing.price : nft.price,
      status: existing.isListed ? existing.status : nft.status,
      isOwner: existing.isOwner || nft.isOwner,
    })
  }

  return Array.from(combined.values()).sort((a, b) => b.numericTokenId - a.numericTokenId)
}

export function invalidateAptosCaches(addresses?: string[]) {
  if (!addresses || addresses.length === 0) {
    nftStoreCache.clear()
    marketplaceStoreCache.clear()
    nftTableCache.clear()
    marketplaceTableCache.clear()
    listingCache.clear()
    return
  }

  for (const address of addresses) {
    const normalized = normalizeAddress(address)
    nftStoreCache.delete(normalized)
    marketplaceStoreCache.delete(normalized)
    nftTableCache.delete(normalized)
    marketplaceTableCache.delete(normalized)
  }

  listingCache.clear()
}
