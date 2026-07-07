import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"

export type ActivityType = "MINTED" | "BOUGHT" | "SOLD" | "LISTED" | "CANCELLED"

export type ActivityRecord = {
  id: string
  walletAddress: string
  type: ActivityType
  title: string
  image?: string
  price?: string
  tokenId?: string
  txHash?: string
  timestamp: number
  counterparty?: string
}

export type ActivityRecordInput = Omit<ActivityRecord, "id" | "timestamp"> & {
  id?: string
  timestamp?: number
}

export type ActivityContextValue = {
  activities: ActivityRecord[]
  currentWalletAddress: string | null
  recordActivity: (entry: ActivityRecordInput) => void
  recordActivities: (entries: ActivityRecordInput[]) => void
}

const STORAGE_KEY = "luminescent-curator-activity-v1"

// eslint-disable-next-line react-refresh/only-export-components
export const ActivityContext = createContext<ActivityContextValue | null>(null)

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : ""
}

function isActivityType(value: unknown): value is ActivityType {
  return (
    value === "MINTED" ||
    value === "BOUGHT" ||
    value === "SOLD" ||
    value === "LISTED" ||
    value === "CANCELLED"
  )
}

function sanitizeActivityRecord(value: unknown): ActivityRecord | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Partial<ActivityRecord>

  if (
    typeof record.id !== "string" ||
    typeof record.walletAddress !== "string" ||
    !isActivityType(record.type) ||
    typeof record.title !== "string" ||
    typeof record.timestamp !== "number"
  ) {
    return null
  }

  return {
    id: record.id,
    walletAddress: normalizeAddress(record.walletAddress),
    type: record.type,
    title: record.title,
    image: typeof record.image === "string" ? record.image : undefined,
    price: typeof record.price === "string" ? record.price : undefined,
    tokenId: typeof record.tokenId === "string" ? record.tokenId : undefined,
    txHash: typeof record.txHash === "string" ? record.txHash : undefined,
    timestamp: record.timestamp,
    counterparty:
      typeof record.counterparty === "string"
        ? normalizeAddress(record.counterparty)
        : undefined,
  }
}

function loadStoredActivities() {
  if (typeof window === "undefined") {
    return [] as ActivityRecord[]
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return [] as ActivityRecord[]
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .map((entry) => sanitizeActivityRecord(entry))
          .filter((entry): entry is ActivityRecord => entry !== null)
      : []
  } catch {
    return []
  }
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { account } = useWallet()
  const currentWalletAddress = account?.address?.toString().toLowerCase() ?? null
  const [allActivities, setAllActivities] = useState<ActivityRecord[]>(() =>
    loadStoredActivities()
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allActivities))
  }, [allActivities])

  const recordActivities = (entries: ActivityRecordInput[]) => {
    setAllActivities((prev) => {
      const normalizedEntries = entries.reduce<ActivityRecord[]>((acc, entry) => {
        const walletAddress = normalizeAddress(entry.walletAddress)
        if (!walletAddress) {
          return acc
        }

        acc.push({
          ...entry,
          id:
            entry.id ??
            `${walletAddress}-${entry.type}-${entry.tokenId ?? "activity"}-${entry.txHash ?? crypto.randomUUID()}`,
          timestamp: entry.timestamp ?? Date.now(),
          walletAddress,
          counterparty: normalizeAddress(entry.counterparty) || undefined,
        })

        return acc
      }, [])

      const next = [
        ...normalizedEntries,
        ...prev,
      ]

      return next.sort((a, b) => b.timestamp - a.timestamp)
    })
  }

  const value = useMemo<ActivityContextValue>(
    () => ({
      activities: currentWalletAddress
        ? allActivities.filter(
            (activity) => activity.walletAddress === currentWalletAddress
          )
        : [],
      currentWalletAddress,
      recordActivity: (entry) => recordActivities([entry]),
      recordActivities,
    }),
    [allActivities, currentWalletAddress]
  )

  return (
    <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
  )
}
