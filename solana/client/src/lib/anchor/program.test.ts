import { describe, expect, it } from 'vitest';
import { Connection } from '@solana/web3.js';
import { MarketplaceClient, MarketplaceNotReadyError } from './program';
import { findMarketplacePda } from './pdas';
import { IDL } from './idl';
import { config } from '../config';

// No network calls happen here: Connection is lazy and we never send a tx.
const connection = new Connection('http://localhost:8899');

describe('MarketplaceClient program ID', () => {
  it('targets config.programId (single source of truth, not the bundled idl.address)', () => {
    const client = new MarketplaceClient(connection);
    expect(client.program.programId.toBase58()).toBe(config.programId.toBase58());
  });

  it('derives PDAs against the same program ID the instructions target', () => {
    const client = new MarketplaceClient(connection, undefined, 'unit-test-market');
    const [expected] = findMarketplacePda('unit-test-market', client.program.programId);
    expect(client.marketplace.toBase58()).toBe(expected.toBase58());
  });
});

describe('IDL account flags', () => {
  // Regression guard: the program marks `marketplace` as `mut` in every
  // instruction that touches it (list_nft bumps listings_count). A missing
  // `writable: true` in the IDL builds a read-only account meta and the program
  // fails with ConstraintMut (0x7d0 / 2000).
  it('marks marketplace writable in every instruction that uses it', () => {
    const idl = IDL as unknown as {
      instructions: { name: string; accounts: { name: string; writable?: boolean }[] }[];
    };
    for (const ix of idl.instructions) {
      const marketplace = ix.accounts.find((a) => a.name === 'marketplace');
      if (marketplace) {
        expect(marketplace.writable, `${ix.name}.marketplace must be writable`).toBe(true);
      }
    }
  });

  // Full lock-in of the three core trade instructions: account order + each
  // account's writable/signer flags must mirror the program's #[account(..)]
  // constraints in anchor/programs/nft_marketplace/src/lib.rs. If these drift,
  // the on-chain program rejects the tx (ConstraintMut / signature errors).
  const TRADE_FLAGS: Record<string, [string, boolean, boolean][]> = {
    // name, writable, signer
    list_nft: [
      ['marketplace', true, false],
      ['listing', true, false],
      ['seller', true, true],
      ['nft_mint', false, false],
      ['seller_token_account', true, false],
      ['vault', true, false],
      ['token_program', false, false],
      ['system_program', false, false],
    ],
    purchase_nft: [
      ['marketplace', true, false],
      ['listing', true, false],
      ['buyer', true, true],
      ['seller', true, false],
      ['treasury', true, false],
      ['nft_mint', false, false],
      ['vault', true, false],
      ['buyer_token_account', true, false],
      ['token_program', false, false],
      ['associated_token_program', false, false],
      ['system_program', false, false],
    ],
    delist_nft: [
      ['marketplace', true, false],
      ['listing', true, false],
      ['seller', true, true],
      ['nft_mint', false, false],
      ['vault', true, false],
      ['seller_token_account', true, false],
      ['token_program', false, false],
    ],
  };

  for (const [ixName, expected] of Object.entries(TRADE_FLAGS)) {
    it(`${ixName}: account order + writable/signer flags match the program`, () => {
      const idl = IDL as unknown as {
        instructions: {
          name: string;
          accounts: { name: string; writable?: boolean; signer?: boolean }[];
        }[];
      };
      const ix = idl.instructions.find((i) => i.name === ixName);
      expect(ix, `${ixName} missing from IDL`).toBeTruthy();
      const got = ix!.accounts.map((a) => [a.name, !!a.writable, !!a.signer]);
      expect(got).toEqual(expected);
    });
  }
});

describe('MarketplaceNotReadyError', () => {
  it('is identifiable across the trade hooks', () => {
    const err = new MarketplaceNotReadyError('nope');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MarketplaceNotReadyError');
  });
});
