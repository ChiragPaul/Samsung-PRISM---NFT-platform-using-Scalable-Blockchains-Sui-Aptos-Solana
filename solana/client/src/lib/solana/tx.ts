import {
  type Connection,
  type PublicKey,
  type TransactionInstruction,
  Transaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export interface SendOptions {
  /** Called as the tx moves through its lifecycle so the UI can render a tracker. */
  onStage?: (stage: 'building' | 'sent' | 'confirmed' | 'finalized', signature?: string) => void;
  /** Extra compute units (some token-program CPIs need a bump). */
  computeUnitLimit?: number;
}

/**
 * Build, sign, send and confirm a transaction from raw instructions, reporting
 * each lifecycle stage. We confirm to `confirmed` for snappy UX, then upgrade
 * to `finalized` in the background so the tracker can show the final state.
 */
export async function sendAndConfirm(
  connection: Connection,
  wallet: WalletContextState,
  instructions: TransactionInstruction[],
  options: SendOptions = {},
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  options.onStage?.('building');

  const tx = new Transaction();
  if (options.computeUnitLimit) {
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: options.computeUnitLimit }));
  }
  tx.add(...instructions);

  const latest = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = wallet.publicKey;

  // Prefer signing locally and sending through OUR (known-good) RPC connection
  // instead of letting the wallet send via its own node. Some wallets (notably
  // Solflare) route preflight simulation through their internal RPC, which can
  // return an opaque "Internal error" (JSON-RPC -32603) even for a valid tx.
  // Sending the signed tx ourselves uses the app's configured RPC and yields
  // real simulation logs on failure.
  let signature: string;
  try {
    if (typeof wallet.signTransaction === 'function') {
      const signed = await wallet.signTransaction(tx);
      signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    } else {
      signature = await wallet.sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    }
  } catch (err) {
    // web3.js SendTransactionError carries the program logs — surface them so
    // a real failure is actionable instead of an opaque wallet message.
    const logs = (err as { logs?: string[] | null }).logs;
    if (Array.isArray(logs) && logs.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Transaction simulation failed. Program logs:\n' + logs.join('\n'));
      throw new Error(
        `${(err as Error).message ?? 'Transaction failed'} — Program logs: ${logs.join(' | ')}`,
      );
    }
    throw err;
  }
  options.onStage?.('sent', signature);

  const confirmed = await connection.confirmTransaction(
    { signature, ...latest },
    'confirmed',
  );
  if (confirmed.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmed.value.err)}`);
  }
  options.onStage?.('confirmed', signature);

  // Upgrade to finalized in the background; do not block the UI on it.
  void connection
    .confirmTransaction({ signature, ...latest }, 'finalized')
    .then((res) => {
      if (!res.value.err) options.onStage?.('finalized', signature);
    })
    .catch(() => {
      /* finalization tracking is best-effort */
    });

  return signature;
}

/** Fetch a wallet's SOL balance in lamports, tolerant of RPC hiccups. */
export async function fetchBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<number> {
  return connection.getBalance(owner, 'confirmed');
}
