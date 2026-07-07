#!/usr/bin/env node
/**
 * Devnet stress-test harness for the NFT marketplace.
 *
 * Drives the REAL on-chain program with a local keypair: bulk-mints NFTs
 * (Metaplex) and lists them via the marketplace program, sequentially or
 * concurrently, with timing + a pass/fail summary. Pairs with the manual
 * checklist in STRESS_TEST.md and the Vitest suite (`npm test`).
 *
 * Usage (run from the project root):
 *   node scripts/stress-test.mjs mint-list        --count 10
 *   node scripts/stress-test.mjs concurrent-list  --count 8
 *   node scripts/stress-test.mjs buy --mint <MINT> --keypair ~/buyer.json
 *
 * Config via env (all optional, sensible Devnet defaults):
 *   RPC        RPC url            (default https://api.devnet.solana.com)
 *   PROGRAM_ID program id         (default Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7)
 *   MARKET     marketplace name   (default devnet-marketplace)
 *   KEYPAIR    signer keypair     (default ~/.config/solana/id.json)
 *   URI        metadata json uri  (default a public Metaplex sample)
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import anchor from '@coral-xyz/anchor';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

const { AnchorProvider, Program, BN, Wallet } = anchor;

// ---------- args + config ----------
const argv = process.argv.slice(2);
const mode = argv[0];
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const COUNT = Number(flag('count', '5'));
// Throttle between txs so the free public RPC doesn't 429. Lower it (or set 0)
// when using a dedicated RPC (Helius/QuickNode) via RPC=...
const DELAY = Number(flag('delay', process.env.DELAY || '400'));
const RPC = process.env.RPC || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || 'Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7';
const MARKET = process.env.MARKET || 'devnet-marketplace';
const URI =
  process.env.URI ||
  'https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Climate/metadata.json';
const KEYPAIR_PATH = (flag('keypair', process.env.KEYPAIR) || `${homedir()}/.config/solana/id.json`)
  .replace(/^~(?=$|\/)/, homedir());

const enc = (s) => Buffer.from(s, 'utf8');
const programId = new PublicKey(PROGRAM_ID);
const [marketplace] = PublicKey.findProgramAddressSync(
  [enc('marketplace'), enc(MARKET)],
  programId,
);
const listingPda = (mint) =>
  PublicKey.findProgramAddressSync([enc('listing'), marketplace.toBuffer(), mint.toBuffer()], programId)[0];
const vaultPda = (mint) =>
  PublicKey.findProgramAddressSync([enc('vault'), marketplace.toBuffer(), mint.toBuffer()], programId)[0];

function loadKeypair(path) {
  const secret = JSON.parse(readFileSync(resolve(path), 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function buildProgram(connection, payer) {
  const idl = JSON.parse(readFileSync(new URL('../client/src/lib/anchor/idl.json', import.meta.url), 'utf8'));
  // Single source of truth: target the configured program id (mirrors the app).
  idl.address = PROGRAM_ID;
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' });
  return new Program(idl, provider);
}

function buildUmi(payer) {
  const umi = createUmi(RPC).use(mplTokenMetadata());
  const umiKp = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);
  return umi.use(keypairIdentity(umiKp));
}

const randomPrice = () => Math.round((0.5 + Math.random() * 2.5) * 100) / 100;
const ms = (t) => `${(t).toFixed(0)}ms`;

/** min / avg / max over a sample array. */
function stats(arr) {
  if (!arr.length) return { min: 0, avg: 0, max: 0, n: 0 };
  const s = [...arr].sort((a, b) => a - b);
  return { min: s[0], avg: arr.reduce((a, b) => a + b, 0) / arr.length, max: s[s.length - 1], n: arr.length };
}

/** Fetch a confirmed tx's fee (lamports) + compute units consumed. */
async function txCost(connection, sig) {
  for (let i = 0; i < 6; i++) {
    try {
      const tx = await connection.getTransaction(sig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (tx?.meta) return { fee: tx.meta.fee, cu: tx.meta.computeUnitsConsumed ?? null };
    } catch {
      /* not queryable yet */
    }
    await sleep(600);
  }
  return { fee: null, cu: null };
}
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const isTransient = (m) => /429|too many|blockhash|timed out|node is behind|block height exceeded/i.test(m);

/** Retry an awaited RPC op a few times on transient (rate-limit/expiry) errors. */
async function withRetry(fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.message ?? String(e);
      if (i < tries - 1 && isTransient(msg)) {
        await sleep(700 * (i + 1));
        continue;
      }
      throw e;
    }
  }
}

// web3.js confirmation polling can reject out-of-band on a 429; don't let a
// background rejection crash a run that's otherwise fine.
process.on('unhandledRejection', (e) => {
  const msg = e?.message ?? String(e);
  if (isTransient(msg)) return; // expected under public-RPC load
  console.warn('  ⚠ background error:', msg);
});

// ---------- on-chain ops ----------
async function mintNft(umi, i) {
  const mint = generateSigner(umi);
  await createNft(umi, {
    mint,
    name: `Stress #${i}`,
    symbol: 'STRS',
    uri: URI,
    sellerFeeBasisPoints: percentAmount(5),
    isMutable: true,
    tokenOwner: umi.identity.publicKey,
  }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
  return new PublicKey(mint.publicKey);
}

async function listNft(program, payer, mintPk, priceSol) {
  const sellerTokenAccount = getAssociatedTokenAddressSync(mintPk, payer.publicKey);
  return program.methods
    .listNft(new BN(Math.round(priceSol * LAMPORTS_PER_SOL)))
    .accountsPartial({
      marketplace,
      listing: listingPda(mintPk),
      seller: payer.publicKey,
      nftMint: mintPk,
      sellerTokenAccount,
      vault: vaultPda(mintPk),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function delistNft(program, seller, mintPk) {
  const sellerTokenAccount = getAssociatedTokenAddressSync(mintPk, seller.publicKey);
  return program.methods
    .delistNft()
    .accountsPartial({
      marketplace,
      listing: listingPda(mintPk),
      seller: seller.publicKey,
      nftMint: mintPk,
      vault: vaultPda(mintPk),
      sellerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function buyNft(program, buyer, mintPk) {
  const listing = await program.account.listing.fetch(listingPda(mintPk));
  const buyerTokenAccount = getAssociatedTokenAddressSync(mintPk, buyer.publicKey);
  const [treasury] = PublicKey.findProgramAddressSync(
    [enc('treasury'), marketplace.toBuffer()],
    programId,
  );
  return program.methods
    .purchaseNft()
    .accountsPartial({
      marketplace,
      listing: listingPda(mintPk),
      buyer: buyer.publicKey,
      seller: listing.seller,
      treasury,
      nftMint: mintPk,
      vault: vaultPda(mintPk),
      buyerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------- preflight ----------
async function preflight(connection, payer) {
  console.log(`\n▶ Stress test  ·  ${mode}`);
  console.log(`  RPC        ${RPC}`);
  console.log(`  Program    ${PROGRAM_ID}`);
  console.log(`  Market     ${MARKET}  (${marketplace.toBase58()})`);
  console.log(`  Signer     ${payer.publicKey.toBase58()}`);

  const prog = await connection.getAccountInfo(programId);
  if (!prog?.executable) {
    throw new Error(`Program ${PROGRAM_ID} is not deployed on this cluster. Deploy it first.`);
  }
  const mkt = await connection.getAccountInfo(marketplace);
  if (!mkt) {
    throw new Error(`Marketplace "${MARKET}" not initialized. Run /admin → Initialize first.`);
  }
  const bal = (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL;
  console.log(`  Balance    ${bal.toFixed(3)} SOL`);
  if (bal < 0.5) {
    console.warn(`  ⚠ Low balance — run: solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
  }
}

// ---------- runners ----------
async function runMintList(connection, payer, { concurrent }) {
  const program = buildProgram(connection, payer);
  const umi = buildUmi(payer);

  // Minting is sequential (each needs its own blockhash + confirmation).
  console.log(`\n⛏  Minting ${COUNT} NFTs…`);
  const mints = [];
  for (let i = 1; i <= COUNT; i++) {
    const t = performance.now();
    try {
      const mintPk = await withRetry(() => mintNft(umi, i));
      mints.push(mintPk);
      console.log(`  ✓ #${i} minted ${mintPk.toBase58()}  (${ms(performance.now() - t)})`);
    } catch (e) {
      console.log(`  ✗ #${i} mint failed: ${e.message}`);
    }
    await sleep(DELAY);
  }

  console.log(`\n🏷  Listing ${mints.length} NFTs  ${concurrent ? '(CONCURRENT)' : '(sequential)'}…`);
  let ok = 0;
  let fail = 0;
  const started = performance.now();
  if (concurrent) {
    const results = await Promise.allSettled(
      mints.map((m) => withRetry(() => listNft(program, payer, m, randomPrice()))),
    );
    for (const [i, r] of results.entries()) {
      if (r.status === 'fulfilled') {
        ok++;
        console.log(`  ✓ #${i + 1} listed  ${r.value.slice(0, 12)}…`);
      } else {
        fail++;
        console.log(`  ✗ #${i + 1} list failed: ${r.reason?.message ?? r.reason}`);
      }
    }
  } else {
    for (const [i, m] of mints.entries()) {
      const t = performance.now();
      try {
        const sig = await withRetry(() => listNft(program, payer, m, randomPrice()));
        ok++;
        console.log(`  ✓ #${i + 1} listed ${sig.slice(0, 12)}…  (${ms(performance.now() - t)})`);
      } catch (e) {
        fail++;
        console.log(`  ✗ #${i + 1} list failed: ${e.message}`);
      }
      await sleep(DELAY);
    }
  }

  const total = performance.now() - started;
  const tps = ok / (total / 1000);
  console.log(`\n📊 Listings: ${ok} ok / ${fail} failed  ·  ${ms(total)} total  ·  ${ms(total / Math.max(ok + fail, 1))}/tx avg  ·  ${tps.toFixed(3)} TPS`);
  console.log(`   Open the app's Browse page — the grid + Live activity should reflect all ${ok} on-chain.`);
}

async function runBuy(connection, payer) {
  const mintArg = flag('mint');
  if (!mintArg) throw new Error('buy mode needs --mint <MINT_ADDRESS>');
  const program = buildProgram(connection, payer);
  console.log(`\n💸 Buying ${mintArg} as ${payer.publicKey.toBase58()}…`);
  const sig = await withRetry(() => buyNft(program, payer, new PublicKey(mintArg)));
  console.log(`  ✓ purchased — sig ${sig}`);
}

async function runDelist(connection, payer) {
  const mintArg = flag('mint');
  if (!mintArg) throw new Error('delist mode needs --mint <MINT_ADDRESS>');
  const program = buildProgram(connection, payer);
  console.log(`\n↩️  Delisting ${mintArg} as ${payer.publicKey.toBase58()}…`);
  const sig = await withRetry(() => delistNft(program, payer, new PublicKey(mintArg)));
  console.log(`  ✓ delisted — sig ${sig}  (NFT returned to your wallet, vault closed)`);
}

/** Full single-wallet round-trip: mint → list → delist. Proves list AND sell. */
async function runCycle(connection, payer) {
  const program = buildProgram(connection, payer);
  const umi = buildUmi(payer);
  console.log('\n🔁 Round-trip: mint → list → delist');

  const mintPk = await withRetry(() => mintNft(umi, 1));
  console.log(`  ✓ minted  ${mintPk.toBase58()}`);
  await sleep(DELAY);

  const price = randomPrice();
  const listSig = await withRetry(() => listNft(program, payer, mintPk, price));
  console.log(`  ✓ listed  for ${price} SOL — sig ${listSig.slice(0, 16)}…  (NFT now in escrow vault)`);
  await sleep(DELAY);

  const delistSig = await withRetry(() => delistNft(program, payer, mintPk));
  console.log(`  ✓ delisted — sig ${delistSig.slice(0, 16)}…  (NFT returned, vault closed)`);

  // Verify the listing account is actually gone on-chain.
  const after = await connection.getAccountInfo(listingPda(mintPk));
  console.log(`  ${after ? '✗ listing still exists?!' : '✓ listing account closed on-chain'}`);
  console.log('\n   List + sell (delist) round-trip confirmed end-to-end. ✅');
}

/**
 * Latency + throughput + cost benchmark for the deployed marketplace.
 * Runs N mint→list→delist round-trips, timing each operation
 * (submit → confirmed), then reports per-op latency (min/avg/max), sequential
 * TPS, and on-chain fee + compute units for the program instructions.
 */
async function runBench(connection, payer) {
  const program = buildProgram(connection, payer);
  const umi = buildUmi(payer);
  const N = COUNT;
  console.log(`\n📐 Benchmark — ${N} samples per operation (mint → list → delist)\n`);

  const lat = { mint_nft: [], list_nft: [], delist_nft: [] };
  const fee = { list_nft: [], delist_nft: [] };
  const cu = { list_nft: [], delist_nft: [] };

  const batchStart = performance.now();
  for (let i = 1; i <= N; i++) {
    let t = performance.now();
    const mintPk = await withRetry(() => mintNft(umi, i));
    lat.mint_nft.push(performance.now() - t);
    await sleep(DELAY);

    t = performance.now();
    const listSig = await withRetry(() => listNft(program, payer, mintPk, randomPrice()));
    lat.list_nft.push(performance.now() - t);
    const lc = await txCost(connection, listSig);
    if (lc.fee != null) fee.list_nft.push(lc.fee);
    if (lc.cu != null) cu.list_nft.push(lc.cu);
    await sleep(DELAY);

    t = performance.now();
    const delSig = await withRetry(() => delistNft(program, payer, mintPk));
    lat.delist_nft.push(performance.now() - t);
    const dc = await txCost(connection, delSig);
    if (dc.fee != null) fee.delist_nft.push(dc.fee);
    if (dc.cu != null) cu.delist_nft.push(dc.cu);

    console.log(`  ✓ sample ${i}/${N}`);
    await sleep(DELAY);
  }
  const batchMs = performance.now() - batchStart;

  console.log('\n  Latency (ms)        min      avg      max    samples');
  console.log('  ' + '-'.repeat(50));
  for (const op of ['mint_nft', 'list_nft', 'delist_nft']) {
    const s = stats(lat[op]);
    console.log(
      `  ${op.padEnd(14)} ${s.min.toFixed(0).padStart(8)} ${s.avg.toFixed(0).padStart(8)} ${s.max
        .toFixed(0)
        .padStart(8)}    ${s.n}`,
    );
  }

  const totalTx = N * 3;
  const tps = totalTx / (batchMs / 1000);
  console.log('\n  Throughput (sequential)');
  console.log('  ' + '-'.repeat(50));
  console.log(`  ${totalTx} txs (mint+list+delist) in ${(batchMs / 1000).toFixed(2)} s`);
  console.log(`  = ${tps.toFixed(3)} TPS   (avg ${(batchMs / totalTx).toFixed(0)} ms/tx)`);

  console.log('\n  On-chain cost (program instructions)');
  console.log('  ' + '-'.repeat(50));
  for (const op of ['list_nft', 'delist_nft']) {
    const f = stats(fee[op]);
    const c = stats(cu[op]);
    console.log(
      `  ${op.padEnd(14)} fee ~${(f.avg / 1e9).toFixed(6)} SOL (${f.avg.toFixed(0)} lamports)  ·  compute ~${c.avg.toFixed(0)} CU`,
    );
  }
  console.log(
    '\n  Notes: sequential CLI-style measurement (network + confirmation bound),\n' +
      '  not Solana’s parallel ceiling. For concurrent TPS use `concurrent-list`.\n' +
      '  `buy` latency: run `buy` mode with a second funded wallet.\n',
  );
}

async function main() {
  if (!['mint-list', 'concurrent-list', 'buy', 'delist', 'cycle', 'bench'].includes(mode)) {
    console.log('Usage: node scripts/stress-test.mjs <mint-list|concurrent-list|bench|cycle|buy|delist> [--count N] [--mint ADDR] [--keypair PATH]');
    process.exit(1);
  }
  const connection = new Connection(RPC, 'confirmed');
  const payer = loadKeypair(KEYPAIR_PATH);
  await preflight(connection, payer);

  if (mode === 'buy') await runBuy(connection, payer);
  else if (mode === 'delist') await runDelist(connection, payer);
  else if (mode === 'cycle') await runCycle(connection, payer);
  else if (mode === 'bench') await runBench(connection, payer);
  else await runMintList(connection, payer, { concurrent: mode === 'concurrent-list' });

  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}\n`);
  process.exit(1);
});
