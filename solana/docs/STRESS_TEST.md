# Stress-testing the marketplace

Four layers, from "prove it works" to "push it hard." Do them in order — each
builds confidence for the next. All on **Devnet**, all against the **real**
deployed program.

Prereqs (one-time):
- Program deployed + marketplace initialized (`/admin → Initialize`).
- `.env` points at the deployed program:
  ```
  VITE_RPC_URL=https://api.devnet.solana.com
  VITE_PROGRAM_ID=Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7
  VITE_MARKETPLACE_NAME=devnet-marketplace
  ```
- A funded Devnet keypair at `~/.config/solana/id.json`
  (`solana airdrop 2 --url devnet`, repeat for ~3–4 SOL).

---

## 1. Automated test suite (no SOL, no network)

Fast, repeatable correctness gate — run this first and any time you change code.

```bash
npm test          # 44 tests: PDAs, fee math, decoders, IDL flags, render smoke
npm run typecheck # full TypeScript check
npm run lint
```

✅ Pass criteria: all green. These guard the bugs we already fixed (program-ID
single-source, IDL `writable` flags, RPC placeholder fallback).

---

## 2. End-to-end functional test (manual, ~10 min)

Prove every real flow works against Devnet. Use **two Solflare accounts** —
"Seller" and "Buyer" — both on Devnet, both funded.

| # | Action | Where | Expected |
|---|--------|-------|----------|
| 1 | Connect Seller wallet | top-right | balance shows, address chip appears |
| 2 | Mint an NFT | **Create** → fill name/image → Mint | "NFT minted" toast; appears in **Portfolio** & in Solflare collectibles |
| 3 | List it | **Portfolio** → List for sale → price → List NFT | "NFT listed"; **Browse** shows it; `/admin` **Active listings = 1** |
| 4 | Verify escrow | Solflare | the NFT left the Seller wallet (it's in the program vault) |
| 5 | Switch to Buyer wallet | top-right | Browse card now shows **"Buy now"** (not "Your listing") |
| 6 | Buy it | **Buy now** → approve | SOL: Buyer −price, Seller +97.5%, treasury +2.5%; NFT now in Buyer wallet; listing gone; `/admin` **Active listings = 0** |
| 7 | Re-list from Buyer, then **Delist** | Portfolio | NFT returns to Buyer wallet; listing removed |
| 8 | Real-time | keep Browse open in a 2nd tab during 3/6 | grid + **Live activity** update without refresh |
| 9 | Search / filter / sort / favorites | Browse | all respond correctly |

✅ Pass criteria: ownership actually moves between two real wallets, balances
change by the right amounts, the UI updates live.

---

## 3. Load / volume test (script)

Bulk-mint + list many NFTs to stress the grid, account subscriptions, and the
program. Run from the **project root**:

```bash
# mint 10 NFTs and list them sequentially
npm run stress:mint-list
#   …or choose the count:
node scripts/stress-test.mjs mint-list --count 20
```

Watch the app's **Browse** page while it runs — listings should stream in via
the live subscription, the floor price should update, and the grid should stay
smooth. The script prints per-tx timing and a `N ok / M failed · avg/tx`
summary.

Budget: each mint+list ≈ 0.02–0.03 SOL. 20 NFTs ≈ ~0.5 SOL.

---

## 4. Concurrency test (script)

Fire many listings **at once** to check the program + RPC handle simultaneous
on-chain writes (each listing creates its own PDAs, so they don't contend, but
the marketplace counter does — a good consistency check).

```bash
npm run stress:concurrent
#   …or:
node scripts/stress-test.mjs concurrent-list --count 8
```

✅ Pass criteria: all (or nearly all) list transactions succeed; `/admin`
**Active listings** equals the number that landed; no stuck/duplicate cards.
Occasional failures here are usually RPC rate-limits on public Devnet, not the
program — re-run, or use a dedicated RPC (Helius) via `RPC=...`.

### Cross-wallet concurrent buys
With listings live, buy from a second funded keypair:
```bash
node scripts/stress-test.mjs buy --mint <MINT_ADDRESS> --keypair ~/buyer.json
```
Run several in parallel shells to simulate competing buyers.

---

## Verifying list / buy / sell directly (the three core ops)

These prove the marketplace's primary on-chain operations with the script:

```bash
# Full round-trip with ONE wallet: mint → list → delist (proves list + sell).
# Ends by asserting the listing account is closed on-chain.
node scripts/stress-test.mjs cycle

# Sell/cancel a specific listing you own (returns the NFT, closes the vault).
node scripts/stress-test.mjs delist --mint <MINT_ADDRESS>

# Buy a listing from a different funded wallet (you can't buy your own).
node scripts/stress-test.mjs buy --mint <MINT_ADDRESS> --keypair ~/buyer.json
```

`cycle` is the quickest single-command proof that **listing and selling
(delisting) work end-to-end on-chain**; pair it with one `buy` from a second
wallet and all three operations are verified live.

---

## Latency & TPS benchmarking (Solana performance report)

To produce a performance report — **latency**, **throughput (TPS)**, and
**on-chain cost** per operation — run:

```bash
npm run bench
#   …or choose the sample size:
node scripts/stress-test.mjs bench --count 10
```

It runs N `mint → list → delist` round-trips and reports:

- **Latency (ms)** — min / avg / max per operation, measured submit → confirmed
  (standard CLI execution-timing methodology).
- **Throughput (TPS)** — total txs ÷ wall-clock seconds (sequential). For the
  *concurrent* number (Solana's parallel strength), use `concurrent-list`, which
  now prints TPS too.
- **On-chain cost** — fee (lamports/SOL) + compute units consumed per program
  instruction, read from the confirmed transaction meta.

### How each metric is defined
| Metric | Definition | How it's obtained |
|--------|-----------|-------------------|
| Latency | time from submitting a tx to `confirmed` | `performance.now()` around each send+confirm |
| TPS (sequential) | `txCount / totalSeconds` running back-to-back | batch timer in `bench` / `mint-list` |
| TPS (concurrent) | `txCount / wallClock` firing in parallel | `concurrent-list` summary line |
| Fee | lamports paid (base + priority) | `getTransaction(sig).meta.fee` |
| Compute | CU consumed by the instruction | `getTransaction(sig).meta.computeUnitsConsumed` |

> Note: a sequential CLI/script measurement is bounded by
> network round-trips + confirmation, **not** the chain's parallel ceiling. Use
> a dedicated RPC (`RPC=…`) and `concurrent-list` to approach the real ceiling,
> and report sequential numbers as a baseline.

## Knobs (env vars)

All scripts accept:

| Var | Default | Purpose |
|-----|---------|---------|
| `RPC` | `https://api.devnet.solana.com` | use a Helius/QuickNode URL to avoid rate limits under load |
| `PROGRAM_ID` | `Bx1csW3…WGqbM7` | the deployed program |
| `MARKET` | `devnet-marketplace` | must match `VITE_MARKETPLACE_NAME` |
| `KEYPAIR` | `~/.config/solana/id.json` | signer (also `--keypair`) |
| `URI` | a public sample | metadata JSON for minted NFTs |
| `DELAY` | `400` (ms) | pause between txs to avoid public-RPC 429s (also `--delay`; set `0` with a dedicated RPC) |

> **Seeing `429 Too Many Requests`?** That's the free public Devnet RPC
> throttling — not your program. The script now throttles (`DELAY`) and retries
> transient errors automatically, and won't crash on a background rate-limit.
> For heavy runs, pass a dedicated RPC and drop the delay:
> `RPC="https://devnet.helius-rpc.com/?api-key=KEY" DELAY=0 node scripts/stress-test.mjs concurrent-list --count 25`

Example, hammering through a dedicated RPC:
```bash
RPC="https://devnet.helius-rpc.com/?api-key=REAL_KEY" \
  node scripts/stress-test.mjs concurrent-list --count 25
```

The script **pre-flights** every run: it verifies the program is deployed, the
marketplace is initialized, and the signer has SOL — and tells you exactly what
to fix if not.
