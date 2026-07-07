# Performance Benchmarking of an NFT Marketplace on the Solana Blockchain

## 1. Introduction

The rapid growth of decentralized applications (dApps), particularly Non-Fungible
Tokens (NFTs), has placed significant demand on blockchain scalability. Platforms
are judged on transaction **latency**, **throughput**, and **cost** under real
workloads. This report evaluates the performance of an NFT marketplace deployed
on the **Solana** blockchain (Devnet), measuring these metrics for the core
marketplace operations and assessing whether the architecture supports
real-world NFT marketplace use cases.

The marketplace is an escrow-based program: an NFT is moved into a
program-owned vault (PDA) when listed, transferred to the buyer on purchase
(with a fee routed to a treasury), and returned to the seller on delist.

## 2. Experimental Setup

Benchmarks were run against **Solana Devnet** using a Node.js harness
(`scripts/stress-test.mjs`, `bench` mode) that drives the deployed on-chain
program with a funded keypair via `@solana/web3.js` and `@coral-xyz/anchor`.

- **Program ID:** `Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7`
- **Cluster:** Devnet · **RPC:** public `api.devnet.solana.com`
- **Anchor:** 1.0.2 · **Token standard:** Metaplex Token Metadata (standard NFT)
- **Samples:** 5 per operation (`--count 5`)

The benchmarked operations represent the lifecycle of an NFT in the marketplace:

| Operation | Description |
|-----------|-------------|
| `mint_nft` | Creation of a new NFT (Metaplex) |
| `list_nft` | List an NFT — moves it into a program escrow vault |
| `delist_nft` | Cancel a listing — returns the NFT, closes the vault |
| `purchase_nft` | Buy a listed NFT (measured separately, requires a second wallet) |

**Latency** was measured as wall-clock time from transaction submission to
`confirmed` commitment, timed individually around each operation. **Throughput**
was derived from observed latency. **Cost** (fee + compute units) was read
directly from each confirmed transaction's on-chain metadata
(`getTransaction(...).meta`).

> Methodology note: to keep latency measurements clean on the rate-limited public
> RPC, a fixed delay was inserted **between** operations (outside the timers).
> This does not affect the per-operation latency figures, but means the harness's
> raw end-to-end "TPS" reflects the throttle, not the chain — so sequential TPS is
> reported below as the inverse of mean latency (see §4).

## 3. Latency Analysis

Latency for each operation, over 5 samples:

| Operation | Min (ms) | **Avg (ms)** | Max (ms) |
|-----------|---------:|-------------:|---------:|
| `mint_nft` | 688 | **749** | 833 |
| `list_nft` | 615 | **944** | 1,265 |
| `delist_nft` | 781 | **878** | 1,001 |

All three core operations confirm in **under ~1.3 seconds**, with averages
between **0.75 s and 0.94 s** and low variance — indicating consistent,
predictable performance.

- **`mint_nft` (~749 ms)** is the fastest on average. Minting issues a new token
  + metadata account; on Solana this is a single confirmed transaction.
- **`list_nft` (~944 ms)** is the most expensive operation in time. It does the
  most on-chain work: it initializes a listing PDA **and** a token-account vault,
  then performs a token-transfer CPI to move the NFT into escrow.
- **`delist_nft` (~878 ms)** returns the NFT from the vault to the seller and
  closes the vault account; slightly cheaper than listing as it creates no new
  state.

## 4. Throughput Evaluation

Because the harness inserts an inter-operation delay to avoid public-RPC rate
limits, the raw end-to-end measurement is throttle-bound and understates the
chain. The **sequential throughput** is therefore computed from the measured
latency as the inverse of the mean per-transaction time:

```
mean tx latency = (749 + 944 + 878) / 3  ≈ 857 ms
sequential TPS  = 1000 / 857             ≈ 1.17 TPS
```

This yields a **sequential throughput of ≈ 1.17 TPS** — i.e. back-to-back
single-threaded submission. This is a conservative baseline and **not** Solana's
ceiling: Solana executes non-conflicting transactions in parallel, so concurrent
submission (independent listings touch independent PDAs) scales far higher.
A concurrent run (`stress:concurrent` on a dedicated RPC) is recommended to
measure the parallel figure; it is left as the next step.

## 5. Cost Analysis (Fee & Compute)

Fees and compute units were read from confirmed transaction metadata for the
program instructions:

| Operation | Fee (lamports) | Fee (SOL) | Compute Units |
|-----------|---------------:|----------:|--------------:|
| `list_nft` | 5,000 | 0.000005 | 26,708 |
| `delist_nft` | 5,000 | 0.000005 | 19,228 |

Two observations:

- **Fees are flat and negligible** — 5,000 lamports (0.000005 SOL) per
  transaction, independent of the work performed. Unlike storage-rent-based
  models, Solana charges a base fee per signature (plus optional priority fee),
  so marketplace operations cost a fraction of a cent.
- **Compute is modest** — `list_nft` consumes ~26.7k compute units (it inits two
  accounts + a CPI transfer), `delist_nft` ~19.2k, both far below the 200k
  default / 1.4M max per transaction. Listing rent (for the listing PDA + vault)
  is reclaimable: the vault's rent is returned to the seller when the listing is
  bought or delisted.

## 6. Discussion

- **Listing is the heaviest operation** in both time and compute, because it
  performs the most on-chain state changes (two account inits + an escrow
  transfer). This is intrinsic to an escrow marketplace.
- **Fees are effectively constant and trivial** on Solana, which is favorable for
  high-frequency marketplace activity where users mint, list, and trade often.
- **The measured throughput is methodology-bound, not chain-bound.** Sequential,
  network-round-trip-limited submission yields ~1.17 TPS; Solana's parallel
  execution of non-conflicting transactions means real concurrent throughput is
  substantially higher and is the natural next measurement.

## 7. Conclusion

The benchmarking demonstrates that the NFT marketplace operates correctly and
efficiently on Solana, with all core operations (mint, list, delist) confirming
in **under ~1 second on average** at a **flat ~0.000005 SOL fee** and **modest
compute**. The figures validate the system as a realistic, low-cost, real-world
NFT marketplace.

Future work: measure `purchase_nft` latency with a second wallet, and measure
**concurrent** throughput on a dedicated RPC to characterize Solana's parallel
execution ceiling.

---

*Reproduce:* `npm run bench` (latency + cost) and `npm run stress:concurrent`
(concurrent TPS). See `STRESS_TEST.md` for methodology and knobs. Numbers above
are from a 5-sample Devnet run on the public RPC.
