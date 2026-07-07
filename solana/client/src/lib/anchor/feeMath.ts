import { LAMPORTS_PER_SOL, MAX_FEE_BPS } from '../config';

/**
 * Marketplace fee math. The fee is taken from the buyer's payment in basis
 * points (1 bps = 0.01%). These helpers are pure so they are unit-tested
 * directly and reused for the pre-tx breakdown and the admin panel.
 */

export interface FeeBreakdown {
  /** Listing price in lamports. */
  priceLamports: number;
  /** Marketplace fee in lamports. */
  feeLamports: number;
  /** What the seller receives in lamports. */
  sellerProceedsLamports: number;
  /** Total the buyer pays in lamports (== price; fee is carved out of price). */
  totalLamports: number;
  // SOL-denominated mirrors for display.
  priceSol: number;
  feeSol: number;
  sellerProceedsSol: number;
  totalSol: number;
  feeBps: number;
}

export function clampFeeBps(feeBps: number): number {
  if (!Number.isFinite(feeBps)) return 0;
  return Math.max(0, Math.min(MAX_FEE_BPS, Math.floor(feeBps)));
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  // Round to avoid floating point dust producing fractional lamports.
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function feeBpsToPercent(feeBps: number): number {
  return clampFeeBps(feeBps) / 100;
}

/**
 * Compute the full buyer/seller breakdown for a purchase.
 * The buyer pays `price`; the marketplace keeps `price * feeBps / 10000`;
 * the seller receives the remainder.
 */
export function computeFeeBreakdown(priceLamports: number, feeBps: number): FeeBreakdown {
  const bps = clampFeeBps(feeBps);
  const safePrice = Math.max(0, Math.floor(priceLamports));
  const feeLamports = Math.floor((safePrice * bps) / MAX_FEE_BPS);
  const sellerProceedsLamports = safePrice - feeLamports;

  return {
    priceLamports: safePrice,
    feeLamports,
    sellerProceedsLamports,
    totalLamports: safePrice,
    priceSol: lamportsToSol(safePrice),
    feeSol: lamportsToSol(feeLamports),
    sellerProceedsSol: lamportsToSol(sellerProceedsLamports),
    totalSol: lamportsToSol(safePrice),
    feeBps: bps,
  };
}
