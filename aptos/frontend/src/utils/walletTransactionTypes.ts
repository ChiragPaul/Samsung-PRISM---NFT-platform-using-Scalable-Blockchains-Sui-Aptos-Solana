import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core"
import type {
  AccountAuthenticator,
  AnyRawTransaction,
} from "@aptos-labs/ts-sdk"

export type SignTransactionFn = (args: {
  transactionOrPayload: AnyRawTransaction | InputTransactionData
  asFeePayer?: boolean
}) => Promise<{
  authenticator: AccountAuthenticator
  rawTransaction: Uint8Array
}>

export type SubmitTransactionFn = (transaction: {
  transaction: AnyRawTransaction
  senderAuthenticator: AccountAuthenticator
}) => Promise<{
  hash: string
}>

export type SignAndSubmitTransactionFn = (
  transaction: InputTransactionData
) => Promise<{
  hash: string
}>
