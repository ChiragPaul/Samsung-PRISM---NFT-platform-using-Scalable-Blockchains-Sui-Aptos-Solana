import { type Connection, type PublicKey, type AccountInfo } from '@solana/web3.js';
import { config } from '../config';
import { LISTING_DISCRIMINATOR } from '../anchor/decoders';
import { bs58Encode } from './encoding';

/**
 * Thin wrappers over the RPC WebSocket subscription API. These are the heart
 * of the "no backend" real-time story: the program's accounts ARE the
 * database, and we react to their changes directly.
 */

export interface ProgramAccountUpdate {
  accountId: PublicKey;
  account: AccountInfo<Buffer>;
}

/**
 * Subscribe to every change among the program's `Listing` accounts. We filter
 * server-side by the account discriminator (memcmp at offset 0) so the
 * WebSocket only streams listings, not unrelated program accounts.
 */
export function subscribeListings(
  connection: Connection,
  onChange: (update: ProgramAccountUpdate) => void,
): number {
  return connection.onProgramAccountChange(
    config.programId,
    (keyedInfo) => {
      onChange({
        accountId: keyedInfo.accountId,
        account: keyedInfo.accountInfo as AccountInfo<Buffer>,
      });
    },
    {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58Encode(LISTING_DISCRIMINATOR),
          },
        },
      ],
    },
  );
}

/** Subscribe to a single account (e.g. the marketplace config for fee updates). */
export function subscribeAccount(
  connection: Connection,
  address: PublicKey,
  onChange: (account: AccountInfo<Buffer> | null) => void,
): number {
  return connection.onAccountChange(
    address,
    (account) => onChange(account as AccountInfo<Buffer>),
    'confirmed',
  );
}

export function removeSubscription(connection: Connection, id: number): void {
  // removeAccountChangeListener handles both account + program subscriptions.
  void connection.removeAccountChangeListener(id).catch(() => {
    /* connection may already be torn down */
  });
}
