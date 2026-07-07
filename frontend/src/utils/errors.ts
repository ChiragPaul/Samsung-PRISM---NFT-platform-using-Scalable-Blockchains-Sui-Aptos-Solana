export function extractErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message
  }

  if (error && typeof error === "object") {
    const maybeMessage = Reflect.get(error, "message")
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage
    }

    const maybeError = Reflect.get(error, "error")
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError
    }

    const maybeData = Reflect.get(error, "data")
    if (maybeData && typeof maybeData === "object") {
      const dataMessage = Reflect.get(maybeData, "message")
      if (typeof dataMessage === "string" && dataMessage.trim()) {
        return dataMessage
      }
    }

    try {
      return JSON.stringify(error)
    } catch {
      return "Unknown wallet error"
    }
  }

  return "Unknown wallet error"
}

export type AptosTransactionErrorDetails = {
  rawMessage: string
  vmStatus?: string
  module?: string
  abortCode?: string
  errorCode?: string
  transactionHash?: string
  title: string
  userMessage: string
}

export type AptosTransactionToast = {
  title: string
  description: string
}

function pickString(
  value: unknown,
  keys: string[],
  visited = new WeakSet<object>()
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  if (visited.has(value as object)) {
    return undefined
  }

  visited.add(value as object)

  for (const key of keys) {
    const candidate = Reflect.get(value, key)
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  for (const key of ["response", "data", "error", "cause"]) {
    const nested = Reflect.get(value, key)
    const picked = pickString(nested, keys, visited)
    if (picked) {
      return picked
    }
  }

  return undefined
}

function pickFromMessage(message: string, pattern: RegExp) {
  const match = message.match(pattern)
  return match?.groups ?? null
}

export function decodeAptosTransactionError(
  error: unknown
): AptosTransactionErrorDetails {
  const rawMessage = extractErrorMessage(error)
  const vmStatus =
    pickString(error, ["vm_status", "vmStatus", "status"]) ??
    pickString(error, ["message"]) ??
    undefined
  const errorCode =
    pickString(error, ["error_code", "errorCode"]) ??
    pickString(error, ["code"]) ??
    undefined
  const transactionHash =
    pickString(error, ["transaction_hash", "transactionHash", "hash", "txHash"]) ??
    undefined

  const messageCandidates = [rawMessage, vmStatus].filter(Boolean) as string[]
  let moduleName: string | undefined
  let abortCode: string | undefined

  for (const message of messageCandidates) {
    const moveAbortMatch =
      pickFromMessage(
        message,
        /Move abort in (?<module>0x[a-fA-F0-9]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+)(?:.*?(?:code|abort code|with code)\s*(?<code>\d+))?/i
      ) ??
      pickFromMessage(
        message,
        /(?<module>0x[a-fA-F0-9]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+).*?(?:abort code|code)\s*(?<code>\d+)/i
      ) ??
      pickFromMessage(
        message,
        /module\s+(?<module>0x[a-fA-F0-9]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+).*?(?:abort code|code)\s*(?<code>\d+)/i
      )

    if (moveAbortMatch) {
      moduleName = moveAbortMatch.module ?? moduleName
      abortCode = moveAbortMatch.code ?? abortCode
    }
  }

  const friendlyMessage = (() => {
    if (vmStatus) {
      return `Aptos simulation returned: ${vmStatus}`
    }

    if (moduleName && abortCode) {
      return `Move abort in ${moduleName} with code ${abortCode}`
    }

    if (moduleName) {
      return `Move abort in ${moduleName}`
    }

    if (rawMessage && rawMessage !== "Generic error") {
      return rawMessage
    }

    return "The transaction failed during Aptos simulation. Please review the details and try again."
  })()

  const title = (() => {
    if (moduleName && abortCode) {
      return "Move abort"
    }

    if (vmStatus) {
      return "Simulation failed"
    }

    if (errorCode) {
      return "Aptos error"
    }

    return "Transaction failed"
  })()

  return {
    rawMessage,
    vmStatus,
    module: moduleName,
    abortCode,
    errorCode,
    transactionHash,
    title,
    userMessage: friendlyMessage,
  }
}

export function buildAptosTransactionToast(
  error: unknown,
  fallbackAction: string
): AptosTransactionToast {
  const details = decodeAptosTransactionError(error)
  const lines = [details.userMessage]

  if (details.vmStatus) {
    lines.push(`vm_status: ${details.vmStatus}`)
  }

  if (details.module) {
    lines.push(`module: ${details.module}`)
  }

  if (details.abortCode) {
    lines.push(`abort code: ${details.abortCode}`)
  }

  if (details.errorCode) {
    lines.push(`error code: ${details.errorCode}`)
  }

  if (details.transactionHash) {
    lines.push(`tx: ${details.transactionHash}`)
  }

  return {
    title: details.title || fallbackAction,
    description: lines.join(" • "),
  }
}

export function formatAptosError(error: unknown): string {
  const details = decodeAptosTransactionError(error)
  const message = details.rawMessage

  if (message.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE")) {
    return "Not enough APT to cover gas fees on Testnet. Fund the wallet and try again."
  }

  if (message.includes("BACKWARD_INCOMPATIBLE_MODULE_UPDATE")) {
    return "The deployed Testnet modules cannot be upgraded in-place because their on-chain layout is older and incompatible."
  }

  if (message.includes("module_not_found") || message.includes("Module not found by Address")) {
    return "The frontend is pointing at a module that is not published on Testnet at this address."
  }

  if (message.includes("TRANSACTION_EXPIRED") || message.includes("transaction expired")) {
    return "The wallet approval took too long and the transaction expired. Please approve again."
  }

  return details.userMessage
}

export function isUserRejectedError(error: unknown) {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    message.indexOf("user rejected") !== -1 ||
    message.indexOf("rejected the request") !== -1 ||
    message.indexOf("rejected") !== -1
  )
}

export function logAptosTransactionError(context: string, error: unknown) {
  const details = decodeAptosTransactionError(error)

  console.error(`[${context}] transaction error`, error)

  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }

  console.error(`[${context}] decoded Aptos error`, details)
}
