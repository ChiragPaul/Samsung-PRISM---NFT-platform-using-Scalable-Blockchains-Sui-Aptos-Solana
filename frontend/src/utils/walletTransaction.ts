import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core"
import { aptos } from "./aptosClient"
import type {
  SignAndSubmitTransactionFn,
} from "./walletTransactionTypes"

const DEFAULT_TX_EXPIRY_SECONDS = 10 * 60
const DEFAULT_MAX_GAS_AMOUNT = 20_000

export async function submitEntryFunctionTransaction(args: {
  sender: string
  payload: InputTransactionData
  signAndSubmitTransaction: SignAndSubmitTransactionFn
}) {
  const { sender, payload, signAndSubmitTransaction } = args
  const expireTimestamp =
    payload.options?.expireTimestamp ??
    Math.floor(Date.now() / 1000) + DEFAULT_TX_EXPIRY_SECONDS
  const maxGasAmount = payload.options?.maxGasAmount ?? DEFAULT_MAX_GAS_AMOUNT

  const finalPayload: InputTransactionData = {
    ...payload,
    options: {
      ...payload.options,
      expireTimestamp,
      maxGasAmount,
    },
  }

  const diagnosticTransaction = await aptos.transaction.build.simple({
    sender,
    data: finalPayload.data,
    options: finalPayload.options,
  })

  console.debug("Wallet transaction diagnostic", {
    method: "signAndSubmitTransaction",
    sender,
    payload: finalPayload,
    transaction: diagnosticTransaction,
  })

  return signAndSubmitTransaction(finalPayload)
}
