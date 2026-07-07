import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { performance } from "node:perf_hooks"
import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "../frontend/node_modules/@aptos-labs/ts-sdk"
import {
  APTOS_FULLNODE_URL,
  APTOS_NETWORK_NAME,
  MARKETPLACE_BUY_FUNCTION,
  MARKETPLACE_CANCEL_FUNCTION,
  MARKETPLACE_INIT_FUNCTION,
  MARKETPLACE_LIST_FUNCTION,
  REAL_NFT_INIT_FUNCTION,
  REAL_NFT_MINT_FUNCTION,
  REAL_NFT_STORE,
  MARKETPLACE_STORE,
} from "../frontend/src/constants/aptos"
import { parseAptToOctas } from "../frontend/src/utils/aptosAmount"

type Mode = "mint" | "list" | "buy" | "delist" | "all"

type TxResult = {
  operation: Exclude<Mode, "all">
  iteration: number
  startTime: number
  endTime: number
  latencyMs: number
  gasUsed: number | null
  transactionHash: string | null
  success: boolean
  error?: string
}

type OperationSummary = {
  minLatencyMs: number | null
  avgLatencyMs: number | null
  maxLatencyMs: number | null
  avgGasUsed: number | null
  minGasUsed: number | null
  maxGasUsed: number | null
  successfulTransactions: number
  failedTransactions: number
}

type BenchmarkSummary = {
  iterations: number
  mode: Mode
  concurrent: boolean
  totalTransactions: number
  totalExecutionTimeMs: number
  tps: number
  successfulTransactions: number
  failedTransactions: number
  successPercentage: number
  operations: Record<Exclude<Mode, "all">, OperationSummary>
}

type BenchmarkContext = {
  seller: ReturnType<typeof createAccountFromEnv>
  buyer: ReturnType<typeof createAccountFromEnv>
}

const DEFAULT_ITERATIONS = 10
const DEFAULT_PRICE = "1"
const RESULTS_JSON_PATH = resolve(process.cwd(), "benchmark-results.json")
const RESULTS_CSV_PATH = resolve(process.cwd(), "benchmark-results.csv")
const accountLocks = new Map<string, Promise<void>>()

function parseArgs(argv: string[]) {
  const iterationsArg = argv.find((value) => value.startsWith("--iterations="))
  const modes = argv
    .filter((value) => value.startsWith("--mode="))
    .map((value) => value.split("=", 2)[1] as Mode)

  return {
    iterations: Math.max(
      1,
      Number.parseInt(iterationsArg?.split("=", 2)[1] ?? `${DEFAULT_ITERATIONS}`, 10) || DEFAULT_ITERATIONS
    ),
    modes: modes.length > 0 ? modes : ["all" as Mode],
    concurrent: argv.includes("--concurrent"),
  }
}

function normalizeAddress(value: string) {
  return value.trim()
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value.trim()
}

function createAccountFromEnv(prefix: "SELLER" | "BUYER") {
  const privateKeyValue = requireEnv(`BENCHMARK_${prefix}_PRIVATE_KEY`)
  const addressValue = requireEnv(`BENCHMARK_${prefix}_ADDRESS`)

  const privateKey = new Ed25519PrivateKey(privateKeyValue)
  const address = AccountAddress.fromString(normalizeAddress(addressValue))

  return Account.fromPrivateKey({
    privateKey,
    address,
  })
}
function createAptosClient() {
  const network = (process.env.APTOS_NETWORK ?? APTOS_NETWORK_NAME).toLowerCase();

  const aptosNetwork =
    network === "testnet" ? Network.TESTNET : Network.TESTNET;

  const config = new AptosConfig({
    network: aptosNetwork,
    fullnode: process.env.APTOS_FULLNODE_URL ?? APTOS_FULLNODE_URL,

    clientConfig: {
      API_KEY: process.env.APTOS_API_KEY,
    },
  });

  return new Aptos(config);
}


async function withAccountLock<T>(address: string, task: () => Promise<T>) {
  const key = address.toLowerCase()
  const current = accountLocks.get(key) ?? Promise.resolve()

  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })

  accountLocks.set(key, current.then(() => next))

  await current

  try {
    return await task()
  } finally {
    release()
    if (accountLocks.get(key) === current.then(() => next)) {
      accountLocks.delete(key)
    }
  }
}

async function ensureStore(aptos: Aptos, account: Account, resourceType: string, initFunction: string) {
  try {
    await aptos.getAccountResource({
      accountAddress: account.accountAddress,
      resourceType: resourceType as any,
    })
  } catch {
    const built = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: initFunction,
        typeArguments: [],
        functionArguments: [],
      } as any,
    })

    const signed = aptos.transaction.sign({
      signer: account,
      transaction: built,
    })

    const pending = await aptos.transaction.submit.simple({
      transaction: built,
      senderAuthenticator: signed,
    })

    await aptos.waitForTransaction({
      transactionHash: pending.hash,
      options: { checkSuccess: true },
    })
  }
}

async function submitAndMeasure(
  aptos: Aptos,
  account: Account,
  operation: Exclude<Mode, "all">,
  iteration: number,
  payload: any
): Promise<TxResult> {
  const startTime = performance.now()

  try {
    const built = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    })

    const signed = aptos.transaction.sign({
      signer: account,
      transaction: built,
    })

    const pending = await aptos.transaction.submit.simple({
      transaction: built,
      senderAuthenticator: signed,
    })

    const confirmed = await aptos.waitForTransaction({
      transactionHash: pending.hash,
      options: { checkSuccess: true },
    })
    const endTime = performance.now()

    return {
      operation,
      iteration,
      startTime,
      endTime,
      latencyMs: endTime - startTime,
      gasUsed: Number(confirmed.gas_used ?? 0),
      transactionHash: pending.hash,
      success: true,
    }
  } catch (error) {
    const endTime = performance.now()
    return {
      operation,
      iteration,
      startTime,
      endTime,
      latencyMs: endTime - startTime,
      gasUsed: null,
      transactionHash: null,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function getLatestNftId(aptos: Aptos, account: Account) {
  const store = await aptos.getAccountResource<{
    next_id: string
    nfts: { handle: string }
  }>({
    accountAddress: account.accountAddress,
    resourceType: REAL_NFT_STORE as any,
  })

  return Number(store.next_id) - 1
}

async function mintForSeller(aptos: Aptos, seller: Account, iteration: number) {
  const mintName = `Benchmark NFT ${iteration} ${Date.now()}`
  const mintUri = `ipfs://benchmark/${iteration}/${Date.now()}`

  return submitAndMeasure(aptos, seller, "mint", iteration, {
    function: REAL_NFT_MINT_FUNCTION,
    typeArguments: [],
    functionArguments: [mintName, mintUri],
  })
}

async function runMintIteration(aptos: Aptos, seller: Account, iteration: number) {
  return withAccountLock(seller.accountAddress.toString(), async () => {
    await ensureStore(aptos, seller, REAL_NFT_STORE, REAL_NFT_INIT_FUNCTION)
    return mintForSeller(aptos, seller, iteration)
  })
}

async function runListIteration(aptos: Aptos, seller: Account, iteration: number) {
  return withAccountLock(seller.accountAddress.toString(), async () => {
    await ensureStore(aptos, seller, REAL_NFT_STORE, REAL_NFT_INIT_FUNCTION)
    await ensureStore(aptos, seller, MARKETPLACE_STORE, MARKETPLACE_INIT_FUNCTION)
    await mintForSeller(aptos, seller, iteration)
    const nftId = await getLatestNftId(aptos, seller)
    const priceInOctas = parseAptToOctas(DEFAULT_PRICE)

    return submitAndMeasure(aptos, seller, "list", iteration, {
      function: MARKETPLACE_LIST_FUNCTION,
      typeArguments: [],
      functionArguments: [nftId, priceInOctas],
    })
  })
}

async function runDelistIteration(aptos: Aptos, seller: Account, iteration: number) {
  return withAccountLock(seller.accountAddress.toString(), async () => {
    await ensureStore(aptos, seller, REAL_NFT_STORE, REAL_NFT_INIT_FUNCTION)
    await ensureStore(aptos, seller, MARKETPLACE_STORE, MARKETPLACE_INIT_FUNCTION)
    await mintForSeller(aptos, seller, iteration)
    const nftId = await getLatestNftId(aptos, seller)
    await submitAndMeasure(aptos, seller, "list", iteration, {
      function: MARKETPLACE_LIST_FUNCTION,
      typeArguments: [],
      functionArguments: [nftId, parseAptToOctas(DEFAULT_PRICE)],
    })

    return submitAndMeasure(aptos, seller, "delist", iteration, {
      function: MARKETPLACE_CANCEL_FUNCTION,
      typeArguments: [],
      functionArguments: [nftId],
    })
  })
}

async function runBuyIteration(
  aptos: Aptos,
  seller: Account,
  buyer: Account,
  iteration: number
) {
  return withAccountLock(seller.accountAddress.toString(), async () => {
    await ensureStore(aptos, seller, REAL_NFT_STORE, REAL_NFT_INIT_FUNCTION)
    await ensureStore(aptos, seller, MARKETPLACE_STORE, MARKETPLACE_INIT_FUNCTION)
    await ensureStore(aptos, buyer, REAL_NFT_STORE, REAL_NFT_INIT_FUNCTION)
    await mintForSeller(aptos, seller, iteration)
    const nftId = await getLatestNftId(aptos, seller)
    await submitAndMeasure(aptos, seller, "list", iteration, {
      function: MARKETPLACE_LIST_FUNCTION,
      typeArguments: [],
      functionArguments: [nftId, parseAptToOctas(DEFAULT_PRICE)],
    })

    return submitAndMeasure(aptos, buyer, "buy", iteration, {
      function: MARKETPLACE_BUY_FUNCTION,
      typeArguments: [],
      functionArguments: [
        seller.accountAddress,
        nftId,
      ],
    })
  })
}

function selectedModes(modes: Mode[]) {
  if (modes.includes("all")) {
    return ["mint", "list", "buy", "delist"] as const
  }

  return Array.from(new Set(modes.filter((mode): mode is Exclude<Mode, "all"> => mode !== "all")))
}

function summarize(results: TxResult[]): BenchmarkSummary {
  const operations = ["mint", "list", "buy", "delist"] as const
  const summary = Object.fromEntries(
    operations.map((operation) => {
      const opResults = results.filter((result) => result.operation === operation)
      const successful = opResults.filter((result) => result.success)
      const latencies = successful.map((result) => result.latencyMs)
      const gasValues = successful
        .map((result) => result.gasUsed)
        .filter((value): value is number => typeof value === "number")

      const aggregate = {
        minLatencyMs: latencies.length ? Math.min(...latencies) : null,
        avgLatencyMs: latencies.length
          ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
          : null,
        maxLatencyMs: latencies.length ? Math.max(...latencies) : null,
        avgGasUsed: gasValues.length
          ? gasValues.reduce((sum, value) => sum + value, 0) / gasValues.length
          : null,
        minGasUsed: gasValues.length ? Math.min(...gasValues) : null,
        maxGasUsed: gasValues.length ? Math.max(...gasValues) : null,
        successfulTransactions: successful.length,
        failedTransactions: opResults.length - successful.length,
      }

      return [operation, aggregate]
    })
  ) as BenchmarkSummary["operations"]

  const totalTransactions = results.length
  const successfulTransactions = results.filter((result) => result.success).length
  const failedTransactions = totalTransactions - successfulTransactions
  const totalExecutionTimeMs =
    results.length > 0
      ? Math.max(...results.map((result) => result.endTime)) -
        Math.min(...results.map((result) => result.startTime))
      : 0

  return {
    iterations: 0,
    mode: "all",
    concurrent: false,
    totalTransactions,
    totalExecutionTimeMs,
    tps: totalExecutionTimeMs > 0 ? totalTransactions / (totalExecutionTimeMs / 1000) : 0,
    successfulTransactions,
    failedTransactions,
    successPercentage:
      totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
    operations: summary,
  }
}

function formatNumber(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return "n/a"
  }

  return digits === 0 ? Math.round(value).toString() : value.toFixed(digits)
}

function printReport(results: TxResult[]) {
  const summary = summarize(results)
  const operations = ["mint", "list", "buy", "delist"] as const

  console.log("")
  console.log("Latency (ms)")
  console.log("---------------------------------------")
  console.log("Operation      Min     Avg     Max")
  for (const operation of operations) {
    const op = summary.operations[operation]
    console.log(
      `${operation.padEnd(12)} ${formatNumber(op.minLatencyMs).padStart(5)} ${formatNumber(op.avgLatencyMs, 0).padStart(7)} ${formatNumber(op.maxLatencyMs).padStart(7)}`
    )
  }

  console.log("")
  console.log("Throughput")
  console.log("---------------------------------------")
  console.log(
    `${summary.totalTransactions} tx completed in ${(summary.totalExecutionTimeMs / 1000).toFixed(1)} s`
  )
  console.log("")
  console.log(`TPS = ${summary.tps.toFixed(2)}`)

  console.log("")
  console.log("Gas Usage")
  console.log("---------------------------------------")
  for (const operation of operations) {
    const op = summary.operations[operation]
    console.log(
      `${operation.padEnd(12)} ${formatNumber(op.avgGasUsed).padStart(6)} ${formatNumber(op.minGasUsed).padStart(6)} ${formatNumber(op.maxGasUsed).padStart(6)}`
    )
  }

  console.log("")
  console.log("Success Rate")
  console.log("---------------------------------------")
  console.log(`${summary.successfulTransactions}/${summary.totalTransactions} successful`)
}

function toCsv(results: TxResult[]) {
  const header = [
    "operation",
    "iteration",
    "start_time_ms",
    "end_time_ms",
    "latency_ms",
    "gas_used",
    "transaction_hash",
    "success",
    "error",
  ]

  const rows = results.map((result) =>
    [
      result.operation,
      result.iteration,
      result.startTime.toFixed(3),
      result.endTime.toFixed(3),
      result.latencyMs.toFixed(3),
      result.gasUsed ?? "",
      result.transactionHash ?? "",
      result.success,
      result.error ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  )

  return [header.join(","), ...rows].join("\n")
}

async function writeOutputs(results: TxResult[], config: { iterations: number; mode: Mode; concurrent: boolean }) {
  const summary = summarize(results)
  const payload = {
    ...config,
    generatedAt: new Date().toISOString(),
    summary,
    results,
  }

  await writeFile(RESULTS_JSON_PATH, JSON.stringify(payload, null, 2), "utf8")
  await writeFile(RESULTS_CSV_PATH, toCsv(results), "utf8")
}

async function main() {
  const { iterations, modes, concurrent } = parseArgs(process.argv.slice(2))
  const aptos = createAptosClient()
  const seller = createAccountFromEnv("SELLER")
  const buyer = createAccountFromEnv("BUYER")
  const mode = modes.length === 1 ? modes[0] : "all"
  const operations = selectedModes(modes)
  const results: TxResult[] = []

  if (concurrent) {
    const tasks = operations.flatMap((operation) =>
      Array.from({ length: iterations }, (_, iterationIndex) =>
        (async () => {
          const iteration = iterationIndex + 1
          if (operation === "mint") return runMintIteration(aptos, seller, iteration)
          if (operation === "list") return runListIteration(aptos, seller, iteration)
          if (operation === "buy") return runBuyIteration(aptos, seller, buyer, iteration)
          return runDelistIteration(aptos, seller, iteration)
        })()
      )
    )

    const settled = await Promise.all(tasks)
    results.push(...settled)
  } else {
    for (const operation of operations) {
      for (let iteration = 1; iteration <= iterations; iteration += 1) {
        if (operation === "mint") {
          results.push(await runMintIteration(aptos, seller, iteration))
        } else if (operation === "list") {
          results.push(await runListIteration(aptos, seller, iteration))
        } else if (operation === "buy") {
          results.push(await runBuyIteration(aptos, seller, buyer, iteration))
        } else {
          results.push(await runDelistIteration(aptos, seller, iteration))
        }
      }
    }
  }

  await mkdir(process.cwd(), { recursive: true })
  await writeOutputs(results, {
    iterations,
    mode,
    concurrent,
  })

  printReport(results)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
