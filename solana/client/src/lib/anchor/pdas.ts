import { PublicKey } from '@solana/web3.js';
import { config } from '../config';

/**
 * PDA derivation helpers. Seeds mirror the bundled IDL exactly:
 *
 *   marketplace = [ "marketplace", name ]
 *   treasury    = [ "treasury",    marketplace ]
 *   listing     = [ "listing",     marketplace, nftMint ]
 *   vault       = [ "vault",       marketplace, nftMint ]   (token account owned by program)
 *
 * Keeping these in one place avoids drift between the read path (decoding
 * accounts) and the write path (building instructions).
 */

const enc = (s: string) => Buffer.from(s, 'utf8');

export function findMarketplacePda(
  name: string = config.marketplaceName,
  programId: PublicKey = config.programId,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([enc('marketplace'), enc(name)], programId);
}

export function findTreasuryPda(
  marketplace: PublicKey,
  programId: PublicKey = config.programId,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc('treasury'), marketplace.toBuffer()],
    programId,
  );
}

export function findListingPda(
  marketplace: PublicKey,
  nftMint: PublicKey,
  programId: PublicKey = config.programId,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc('listing'), marketplace.toBuffer(), nftMint.toBuffer()],
    programId,
  );
}

export function findVaultPda(
  marketplace: PublicKey,
  nftMint: PublicKey,
  programId: PublicKey = config.programId,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc('vault'), marketplace.toBuffer(), nftMint.toBuffer()],
    programId,
  );
}
