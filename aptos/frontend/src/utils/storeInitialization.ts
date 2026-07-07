import type { InputTransactionData } from "@aptos-labs/wallet-adapter-core"
import type { Aptos } from "@aptos-labs/ts-sdk"
import type { SignAndSubmitTransactionFn } from "./walletTransactionTypes"
import {
  MARKETPLACE_INIT_FUNCTION,
  MARKETPLACE_STORE,
  REAL_NFT_INIT_FUNCTION,
  REAL_NFT_STORE,
} from "../constants/aptos"
import { submitEntryFunctionTransaction } from "./walletTransaction"

async function ensureStore(args: {
  aptos: Aptos
  accountAddress: string
  resourceType: `${string}::${string}::${string}`
  initFunction: `${string}::${string}::${string}`
  signAndSubmitTransaction: SignAndSubmitTransactionFn
}) {
  const {
    aptos,
    accountAddress,
    resourceType,
    initFunction,
    signAndSubmitTransaction,
  } = args

  try {
    await aptos.getAccountResource({
      accountAddress,
      resourceType,
    })
  } catch {
    const initPayload: InputTransactionData = {
      data: {
        function: initFunction,
        typeArguments: [],
        functionArguments: [],
      },
    }

    const tx = await submitEntryFunctionTransaction({
      sender: accountAddress,
      payload: initPayload,
      signAndSubmitTransaction,
    })

    await aptos.waitForTransaction({
      transactionHash: tx.hash,
      options: {
        checkSuccess: true,
      },
    })
  }
}

export async function ensureNftStore(args: {
  aptos: Aptos
  accountAddress: string
  signAndSubmitTransaction: SignAndSubmitTransactionFn
}) {
  return ensureStore({
    ...args,
    resourceType: REAL_NFT_STORE,
    initFunction: REAL_NFT_INIT_FUNCTION,
  })
}

export async function ensureMarketplaceStore(args: {
  aptos: Aptos
  accountAddress: string
  signAndSubmitTransaction: SignAndSubmitTransactionFn
}) {
  return ensureStore({
    ...args,
    resourceType: MARKETPLACE_STORE,
    initFunction: MARKETPLACE_INIT_FUNCTION,
  })
}
