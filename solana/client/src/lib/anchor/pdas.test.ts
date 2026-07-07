import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  findListingPda,
  findMarketplacePda,
  findTreasuryPda,
  findVaultPda,
} from './pdas';
import { config } from '../config';

const MINT = new PublicKey('So11111111111111111111111111111111111111112');

describe('PDA derivation', () => {
  it('derives the marketplace PDA from the program + name seed deterministically', () => {
    const [a, bumpA] = findMarketplacePda('test-marketplace');
    const [b, bumpB] = findMarketplacePda('test-marketplace');
    expect(a.toBase58()).toBe(b.toBase58());
    expect(bumpA).toBe(bumpB);
    expect(bumpA).toBeGreaterThanOrEqual(0);
    expect(bumpA).toBeLessThanOrEqual(255);
  });

  it('produces different marketplace PDAs for different names', () => {
    const [a] = findMarketplacePda('alpha');
    const [b] = findMarketplacePda('beta');
    expect(a.toBase58()).not.toBe(b.toBase58());
  });

  it('matches the manual seed derivation for the marketplace', () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('marketplace'), Buffer.from('test-marketplace')],
      config.programId,
    );
    const [actual] = findMarketplacePda('test-marketplace');
    expect(actual.toBase58()).toBe(expected.toBase58());
  });

  it('derives treasury from the marketplace PDA', () => {
    const [marketplace] = findMarketplacePda('test-marketplace');
    const [treasury] = findTreasuryPda(marketplace);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), marketplace.toBuffer()],
      config.programId,
    );
    expect(treasury.toBase58()).toBe(expected.toBase58());
  });

  it('derives listing + vault PDAs scoped to marketplace and mint', () => {
    const [marketplace] = findMarketplacePda('test-marketplace');
    const [listing] = findListingPda(marketplace, MINT);
    const [vault] = findVaultPda(marketplace, MINT);
    expect(listing.toBase58()).not.toBe(vault.toBase58());

    const [expectedListing] = PublicKey.findProgramAddressSync(
      [Buffer.from('listing'), marketplace.toBuffer(), MINT.toBuffer()],
      config.programId,
    );
    expect(listing.toBase58()).toBe(expectedListing.toBase58());
  });
});
