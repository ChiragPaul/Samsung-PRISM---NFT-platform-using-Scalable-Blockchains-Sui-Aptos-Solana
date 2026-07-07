import { IDL } from '../anchor/idl';

/**
 * Map raw Solana / Anchor / wallet errors to human-readable, actionable
 * messages. This is the single place the UI gets its error copy so messaging
 * stays consistent across buy / list / delist / admin flows.
 */

const ANCHOR_ERRORS: Record<number, string> = Object.fromEntries(
  (IDL.errors ?? []).map((e) => [e.code, e.msg ?? e.name]),
);

export interface FriendlyError {
  message: string;
  /** True when the user cancelled — we suppress error toasts for these. */
  isUserRejection: boolean;
}

function asRecord(err: unknown): Record<string, unknown> {
  return (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
}

function stringifyError(err: unknown): string {
  const rec = asRecord(err);
  if (typeof rec.message === 'string') return rec.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function mapTxError(err: unknown): FriendlyError {
  const raw = stringifyError(err).toLowerCase();

  // User cancelled in the wallet.
  if (
    raw.includes('user rejected') ||
    raw.includes('rejected the request') ||
    raw.includes('request rejected') ||
    raw.includes('user denied')
  ) {
    return { message: 'Transaction cancelled.', isUserRejection: true };
  }

  // Anchor custom program error → friendly text from the IDL.
  const customMatch = raw.match(/custom program error: (0x[0-9a-f]+|\d+)/);
  if (customMatch) {
    const code = customMatch[1].startsWith('0x')
      ? parseInt(customMatch[1], 16)
      : parseInt(customMatch[1], 10);
    if (ANCHOR_ERRORS[code]) {
      return { message: ANCHOR_ERRORS[code], isUserRejection: false };
    }
  }

  // Anchor surfaces a structured error too.
  const rec = asRecord(err);
  const errorNumber = asRecord(asRecord(rec.error).errorCode).number;
  if (typeof errorNumber === 'number' && ANCHOR_ERRORS[errorNumber]) {
    return { message: ANCHOR_ERRORS[errorNumber], isUserRejection: false };
  }

  if (raw.includes('insufficient') && raw.includes('lamports')) {
    return {
      message: 'Insufficient SOL to cover the price plus network fees.',
      isUserRejection: false,
    };
  }
  if (raw.includes('insufficient funds')) {
    return { message: 'Insufficient funds for this transaction.', isUserRejection: false };
  }
  if (raw.includes('blockhash not found') || raw.includes('block height exceeded')) {
    return {
      message: 'The transaction expired before it confirmed. Please try again.',
      isUserRejection: false,
    };
  }
  if (raw.includes('account does not exist') || raw.includes('could not find account')) {
    return {
      message: 'This listing no longer exists — it may have just sold or been delisted.',
      isUserRejection: false,
    };
  }
  if (raw.includes('already in use') || raw.includes('already been processed')) {
    return { message: 'This item is already listed.', isUserRejection: false };
  }
  if (raw.includes('0x1') && raw.includes('transfer')) {
    return { message: 'Token transfer failed — check the NFT is still in your wallet.', isUserRejection: false };
  }

  return { message: stringifyError(err) || 'Transaction failed.', isUserRejection: false };
}
