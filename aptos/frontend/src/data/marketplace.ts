export type MarketplaceItem = {
  id: number
  tokenId: string
  title: string
  owner: string
  price: string
  image: string
  status?: string
  isOwner?: boolean
}

export const marketplaceItems: MarketplaceItem[] = [
  {
    id: 1,
    tokenId: "#402",
    title: "Neon Splicer",
    owner: "0x8a2...4f21",
    price: "12.5",
    image: "ipfs://QmdhAieYRxnPqf8fXQcbkbaeUZNBJjG8Hptu1nFbh4uSDN",
    status: "Live",
  },
  {
    id: 2,
    tokenId: "#119",
    title: "Cyber Bloom",
    owner: "You",
    price: "42.0",
    image: "ipfs://QmdhAieYRxnPqf8fXQcbkbaeUZNBJjG8Hptu1nFbh4uSDN",
    isOwner: true,
  },
  {
    id: 3,
    tokenId: "#088",
    title: "Luminous Path",
    owner: "0x3e1...b902",
    price: "5.2",
    image: "ipfs://QmdhAieYRxnPqf8fXQcbkbaeUZNBJjG8Hptu1nFbh4uSDN",
  },
  {
    id: 4,
    tokenId: "#201",
    title: "Prism Logic",
    owner: "0xb61f...dfa8",
    price: "15.0",
    image: "ipfs://QmdhAieYRxnPqf8fXQcbkbaeUZNBJjG8Hptu1nFbh4uSDN",
    status: "Recent",
  },
]

export const comparisonHighlights = [
  {
    label: "Parallel Execution",
    value: "Block-STM",
    detail: "Aptos processes independent transactions concurrently instead of serializing all activity.",
  },
  {
    label: "Benchmark Focus",
    value: "TPS + Latency + Cost",
    detail: "The prototype is structured around the same metrics you need to compare against Polygon CDK work.",
  },
  {
    label: "Security Scope",
    value: "Move + Listing Flow",
    detail: "Contract safety, ownership checks, and marketplace listing behavior remain explicit design targets.",
  },
]

export const performanceStats = [
  { label: "Average Finality Time", value: "0.9s" },
  { label: "Peak Transactions Per Second", value: "160k+" },
  { label: "Active Wallets", value: "840k+" },
  { label: "NFTs Minted", value: "2.4M" },
]
