import type { Idl } from '@coral-xyz/anchor';
import idlJson from './idl.json';

/**
 * The bundled Anchor IDL for the marketplace program.
 *
 * We intentionally drive PDA derivation and account decoding from this IDL
 * (via @coral-xyz/anchor's BorshAccountsCoder) rather than hardcoding byte
 * layouts. If the deployed program changes, regenerate this file with
 * `anchor idl fetch <PROGRAM_ID>` and the client below stays correct.
 */
export const IDL = idlJson as unknown as Idl;

export type MarketplaceIdl = typeof idlJson;
