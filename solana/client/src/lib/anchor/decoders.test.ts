import { describe, it, expect } from 'vitest';
import { BN } from '@coral-xyz/anchor';
import { Keypair, PublicKey, type AccountInfo } from '@solana/web3.js';
import {
  accountsCoder,
  decodeListing,
  decodeMarketplace,
  tryDecodeListing,
  LISTING_DISCRIMINATOR,
  MARKETPLACE_DISCRIMINATOR,
} from './decoders';

function fakeAccount(data: Buffer): AccountInfo<Buffer> {
  return {
    data,
    executable: false,
    lamports: 1,
    owner: PublicKey.default,
    rentEpoch: 0,
  };
}

describe('IDL account decoding', () => {
  it('round-trips a Marketplace account through the IDL coder', async () => {
    const authority = Keypair.generate().publicKey;
    const treasury = Keypair.generate().publicKey;
    const data = await accountsCoder.encode('Marketplace', {
      authority,
      treasury,
      feeBps: 250,
      name: 'test-marketplace',
      listingsCount: new BN(7),
      bump: 254,
      treasuryBump: 253,
    });

    const address = Keypair.generate().publicKey;
    const decoded = decodeMarketplace(address, fakeAccount(data));
    expect(decoded.authority).toBe(authority.toBase58());
    expect(decoded.treasury).toBe(treasury.toBase58());
    expect(decoded.feeBps).toBe(250);
    expect(decoded.name).toBe('test-marketplace');
    expect(decoded.listingsCount).toBe(7);
    expect(decoded.address).toBe(address.toBase58());
  });

  it('round-trips a Listing account and derives SOL price', async () => {
    const seller = Keypair.generate().publicKey;
    const nftMint = Keypair.generate().publicKey;
    const vault = Keypair.generate().publicKey;
    const data = await accountsCoder.encode('Listing', {
      seller,
      nftMint,
      price: new BN(1_500_000_000), // 1.5 SOL
      createdAt: new BN(1_700_000_000),
      vault,
      bump: 255,
    });

    const decoded = decodeListing(Keypair.generate().publicKey, fakeAccount(data));
    expect(decoded.seller).toBe(seller.toBase58());
    expect(decoded.nftMint).toBe(nftMint.toBase58());
    expect(decoded.priceLamports).toBe(1_500_000_000);
    expect(decoded.priceSol).toBe(1.5);
    expect(decoded.createdAt).toBe(1_700_000_000);
  });

  it('has distinct, 8-byte account discriminators', () => {
    expect(LISTING_DISCRIMINATOR).toHaveLength(8);
    expect(MARKETPLACE_DISCRIMINATOR).toHaveLength(8);
    expect(LISTING_DISCRIMINATOR.equals(MARKETPLACE_DISCRIMINATOR)).toBe(false);
  });

  it('tryDecodeListing returns null for non-listing data', () => {
    const garbage = fakeAccount(Buffer.alloc(40, 1));
    expect(tryDecodeListing(Keypair.generate().publicKey, garbage)).toBeNull();
  });
});
