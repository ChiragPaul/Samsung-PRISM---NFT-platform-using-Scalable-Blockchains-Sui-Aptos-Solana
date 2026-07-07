# 🟣🟢 Solana NFT Market — *Own the moment, on-chain.*

> **Mint it. Own it. Trade it. On Solana — in real time.**

A production-quality NFT marketplace where **the chain is the backend**. Mint a
1/1, list it into **trustless escrow**, buy with a tap, and watch **ownership**
transfer for real — every move settled on Solana, nothing hidden behind a
server. State comes straight from on-chain accounts and updates **the instant it
happens** via WebSocket account subscriptions. No backend. No middleman. Just
you, your wallet, and the chain.

✨ AI names + prices your NFTs · 📊 live floor/volume/rarity analytics · ⚡
sweep-the-floor · 👑 real on-chain ownership · 🎉 confetti on mint.

**Devnet is live. Mainnet is loading.**

> Program ID (deployed + initialized on Devnet as `devnet-marketplace`):
> `Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7`

---

## Tech stack

- **React 18 + TypeScript** (strict, no `any`)
- **Vite** with Buffer/process browser polyfills for Solana
- **Tailwind CSS** (dark/light)
- **TanStack React Query** — on-chain data fetching + caching
- **Zustand** (global state, persisted) + **React Context** (wallet/provider plumbing)
- **@solana/wallet-adapter** — Phantom, Solflare, Coinbase, Trust (+ any Wallet Standard wallet)
- **@coral-xyz/anchor** — typed client generated from the bundled IDL
- **@metaplex-foundation/** — Token Metadata resolution from IPFS/Arweave
- **Vitest + Testing Library** — focused unit/render tests

## Quick start

```bash
cp .env.example .env      # defaults point at the live Devnet deployment
npm install
npm run dev               # http://localhost:5173, talking to Devnet
```

### Everything is real on-chain

The app runs **only** against real Solana Devnet — there is no demo/simulated
mode. Minting creates real NFTs via Metaplex (the NFT lands in your connected
wallet); listing / buying / selling and **ownership** are real on-chain
transactions against the marketplace program. **The bundled default program is
already deployed and initialized on Devnet**, so a fresh clone trades
immediately. If you deploy your own program instead, see [`anchor/`](./anchor)
and the Admin setup below.

Other scripts:

```bash
npm run build       # tsc + vite production build → ./dist
npm run preview     # serve the production build locally
npm run test        # run the Vitest suite once
npm run typecheck   # strict type check
npm run lint        # eslint
npm run bench       # latency / TPS / fee benchmark against Devnet (see BENCHMARK.md)
npm run stress      # stress-test harness (see STRESS_TEST.md)
```

## Environment variables

All vars are **public, build-time** values (no secrets — never commit a real `.env`).

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_RPC_URL` | `https://api.devnet.solana.com` | RPC HTTP endpoint. A dedicated provider (Helius/QuickNode) is strongly recommended for reliable WebSocket subscriptions. |
| `VITE_RPC_WS_URL` | derived from RPC | Optional dedicated WebSocket endpoint. |
| `VITE_PROGRAM_ID` | the deployed program above | Anchor program ID — the **single source of truth** for both instruction targeting and PDA derivation. |
| `VITE_NETWORK` | `devnet` | Cluster. The UI forces Devnet and warns on mismatch. |
| `VITE_MARKETPLACE_NAME` | `devnet-marketplace` | Name used as the marketplace PDA seed — **must match the on-chain config**. |

## How the real-time (no-backend) layer works

The program's accounts *are* the database. `src/hooks/useRealtimeSync.ts` mounts
once at the app root and wires the on-chain firehose into the UI:

1. **`onProgramAccountChange`** (filtered server-side by the `Listing` account
   discriminator via a `memcmp` filter) streams every listing create / price
   change / close. The handler **upserts or removes** listings directly in the
   React Query cache, so the grid updates instantly — **no polling**.
2. **`onLogs`** (program-scoped) parses each instruction (`Instruction: ListNft`
   / `PurchaseNft` / `DelistNft` / `UpdateFee`) to (a) build the live **activity
   feed** and (b) disambiguate a closed listing as a **sale vs delist** — the
   account subscription alone can't tell them apart.
3. From these streams we derive **per-listing price history**, a **collection
   floor tracker**, evaluate **client-side price alerts**, and raise toasts /
   browser notifications (e.g. *"your listing sold"*, *"a favorited item changed
   price"*).

The marketplace config account and the connected wallet's balance use
`onAccountChange` the same way. **All subscriptions are cleaned up on unmount**
(`removeSubscription` / `removeOnLogsListener`).

PDA derivation and account decoding are driven entirely by the **bundled IDL**
(`src/lib/anchor/idl.json`) — no hardcoded byte layouts. See
`src/lib/anchor/{pdas,decoders,program}.ts`.

### PDA seeds

```
marketplace = ["marketplace", name]
treasury    = ["treasury",    marketplace]
listing     = ["listing",     marketplace, nftMint]
vault       = ["vault",       marketplace, nftMint]   # program-owned escrow token account
```

## End-to-end flow: mint → list → buy → sell

The platform supports the full NFT lifecycle on Devnet:

1. **Mint** (`/mint`, "Create" tab): mints a real 1/1 NFT into your wallet via
   Metaplex Token Metadata. Upload an image (stored on Irys) or point at an
   existing metadata JSON URI. This is independent of the marketplace program —
   it just gives you something to trade. Needs a little Devnet SOL (use a
   faucet); the Irys-free path accepts a ready-made metadata URI.
2. **List** (`/portfolio` → Owned NFTs → *List for sale*): escrows the NFT into
   the program vault PDA at your chosen price.
3. **Buy** (`/`): any other wallet purchases it; SOL is split between seller and
   the marketplace treasury, and the NFT transfers to the buyer.
4. **Sell / delist**: it sells automatically when bought, or you can delist from
   *My Active Listings* to pull it back out of escrow.

> The bundled default marketplace is already deployed + initialized on Devnet,
> so all four steps work on a fresh clone. If you point `VITE_PROGRAM_ID` at
> your own deployment, initialize it once via `/admin` first.

## Features

- **Wallet**: multi-wallet connect modal, address + live SOL balance, Devnet
  mismatch banner.
- **Mint / Create**: Metaplex 1/1 NFT minting with image/metadata upload (Irys)
  or a direct metadata URI, plus **✨ AI name & description generation**.
- **AI-assist**: generate NFT names/descriptions on mint and **fair-price
  suggestions** when listing (local heuristic by default; set `VITE_AI_PROXY_URL`
  to a serverless Claude proxy for real-model output, key stays server-side).
- **Analytics** (`/analytics`, "Stats"): KPI cards, a collection leaderboard
  (floor / avg / top / listed), a recent-sales feed, and a rarity leaderboard.
- **Pro trading**: **Sweep the floor** — buy the N cheapest listings in one
  action (filter to a collection first to sweep just that one).
- **Browse**: live grid of active listings with image, name, collection, price,
  seller; lazy images + skeletons.
- **Search & filter**: by name/collection/price range, sort (price ↑/↓, recent,
  rarity); debounced and **URL-synced** (shareable filtered views).
- **Buy**: pre-tx fee/total breakdown, confirmation modal, staged tx tracker
  (sent → confirmed → finalized) with Explorer links; optimistic removal +
  rollback on failure.
- **List / Delist**: escrow an owned NFT into the vault PDA; clear escrow
  explanation; delist from *My Listings*.
- **Portfolio**: tabs for *Owned NFTs* (wallet-held, via Metaplex) and *My Active
  Listings* (on-chain); CSV export of both.
- **Favorites**: local-first (IndexedDB) heart toggle + Favorites view.
- **Drag-and-drop organizer**: group favorites into custom local collections
  (dnd-kit), reorderable, persisted locally, keyboard-operable.
- **Admin panel**: visible only when the connected wallet is the on-chain
  marketplace authority; shows fee + treasury, allows `updateFee`, and offers a
  one-time `initializeMarketplace`. Every admin action is guarded in the UI *and*
  by checking the on-chain authority.
- **Extras**: rarity badges from trait frequency, per-listing price history +
  collection floor, watchlist price alerts, dark/light theme, full keyboard nav
  + ARIA, robust empty/error/loading states, RPC retry with backoff, shareable
  deep links, browser notifications.

## Admin setup

The first wallet to call `initializeMarketplace` becomes the **authority**. If no
marketplace config exists for `VITE_MARKETPLACE_NAME`, connect that wallet and
open **/admin** — you'll get the initialize form (set the name to match
`VITE_MARKETPLACE_NAME` so the rest of the app resolves the same PDA). Afterwards
the **Admin** tab and fee controls appear only for that authority wallet; all
others are blocked in the UI and on-chain.

## Testing & performance

Focused Vitest + Testing Library coverage on the critical paths (48 tests):

- PDA derivation (`src/lib/anchor/pdas.test.ts`)
- IDL account decoding / discriminators / **writable-flag regression guards**
  (`src/lib/anchor/{decoders,program}.test.ts`)
- price/fee math (`src/lib/anchor/feeMath.test.ts`)
- favorites store (`src/stores/favoritesStore.test.ts`)
- filter/sort pipeline (`src/hooks/useListingFilters.test.ts`)
- rarity scoring (`src/lib/rarity.test.ts`)
- happy-path renders (browse grid, mint page, full app mount)

Crypto-heavy tests run in the `node` environment; render tests opt into `jsdom`
per-file.

```bash
npm run test
```

Beyond unit tests:

- **[`STRESS_TEST.md`](./STRESS_TEST.md)** — the 4-layer test plan (automated
  suite, manual E2E checklist, load/volume, concurrency) and the
  `scripts/stress-test.mjs` harness (bulk mint+list, concurrent listings,
  cross-wallet buy, delist, full round-trip `cycle`).
- **[`BENCHMARK.md`](./BENCHMARK.md)** — measured Devnet performance: latency
  (mint ~749 ms, list ~944 ms, delist ~878 ms avg), sequential TPS, per-op fee +
  compute units.

## Deployment

**Vercel** (SPA rewrites + headers in `vercel.json`):

```bash
./deploy.sh vercel      # or: vercel --prod
```

**Docker** (multi-stage build → nginx with SPA fallback, gzip, security headers,
asset caching):

```bash
./deploy.sh docker      # docker compose up --build -d  → http://localhost:8080
```

Build-time `VITE_*` values are passed as Docker build args / compose env (see
`docker-compose.yml`). `deploy.sh build` just produces `./dist`.

## On-chain program (real Devnet trading)

The Anchor (1.0.2) program source lives in [`anchor/`](./anchor) — `initialize`,
`list`, `purchase`, `delist`, `update_fee`, matching the frontend's PDA seeds and
account layout. **A build of this program is deployed on Devnet at the program ID
above and initialized as `devnet-marketplace`** — the frontend trades against it
out of the box. To run your own: build + deploy (`anchor build && anchor
deploy`), set `VITE_PROGRAM_ID`, and initialize via `/admin`. Full instructions
in [`anchor/README.md`](./anchor/README.md). The frontend decoder tolerates both
the bundled (camelCase) and anchor-generated (snake_case) IDL field names, so
swapping in a regenerated IDL needs no client changes.

## Project structure

```
src/
  components/   ui primitives + shared feature components
  features/     marketplace, portfolio, favorites, admin, mint, nft, analytics
  hooks/        useMarketplace, useListings, useOwnedNfts, useRealtimeSync, tx hooks…
  lib/
    anchor/     program client, PDA helpers, bundled IDL, decoders, fee math
    solana/     connection, subscriptions, tx send/confirm, metadata, errors
  providers/    wallet + query providers
  stores/       zustand (favorites, collections, watchlist, theme, activity, …)
  types/        shared types derived from the IDL
scripts/        stress-test + benchmark harness (see STRESS_TEST.md)
anchor/         the on-chain Anchor program (deployed to Devnet)
```

## Notes & limitations

- The bundled IDL mirrors the deployed program's instruction/account shape so
  the typed client, PDA derivation, and Borsh decoding are correct. If you
  deploy a modified program, regenerate with `anchor idl fetch <PROGRAM_ID>`
  into `src/lib/anchor/idl.json` — the rest of the app is IDL-driven and adapts.
- Public Devnet RPC rate-limits `onLogs`/`getProgramAccounts`; for a smooth
  experience point `VITE_RPC_URL`/`VITE_RPC_WS_URL` at a dedicated provider.
- Price history and the activity feed are session-scoped (and locally cached) —
  the honest scope of a backend-less, log-derived design.
- Royalties (`sellerFeeBasisPoints`) are recorded in NFT metadata but are **not
  enforced** by the marketplace program on secondary sales — enforcement would
  be a program extension (paying `creators` inside `purchase_nft`).
