import { describe, it, expect } from 'vitest';
import {
  clampFeeBps,
  computeFeeBreakdown,
  feeBpsToPercent,
  lamportsToSol,
  solToLamports,
} from './feeMath';
import { LAMPORTS_PER_SOL } from '../config';

describe('feeMath', () => {
  it('converts SOL <-> lamports without floating dust', () => {
    expect(solToLamports(1)).toBe(LAMPORTS_PER_SOL);
    expect(solToLamports(1.5)).toBe(1_500_000_000);
    expect(lamportsToSol(LAMPORTS_PER_SOL)).toBe(1);
    // Round-trip a tricky value.
    expect(solToLamports(0.1)).toBe(100_000_000);
  });

  it('clamps fee bps into [0, 10000]', () => {
    expect(clampFeeBps(-5)).toBe(0);
    expect(clampFeeBps(250)).toBe(250);
    expect(clampFeeBps(99999)).toBe(10_000);
    expect(clampFeeBps(NaN)).toBe(0);
    expect(clampFeeBps(250.9)).toBe(250);
  });

  it('expresses bps as a percent', () => {
    expect(feeBpsToPercent(250)).toBe(2.5);
    expect(feeBpsToPercent(10_000)).toBe(100);
  });

  it('computes a fee breakdown carved out of the price', () => {
    const b = computeFeeBreakdown(solToLamports(2), 250); // 2 SOL @ 2.5%
    expect(b.priceSol).toBe(2);
    expect(b.feeSol).toBe(0.05);
    expect(b.sellerProceedsSol).toBeCloseTo(1.95, 9);
    // Buyer pays exactly the price; fee comes out of it.
    expect(b.totalSol).toBe(2);
    expect(b.feeLamports + b.sellerProceedsLamports).toBe(b.priceLamports);
  });

  it('handles a zero fee', () => {
    const b = computeFeeBreakdown(solToLamports(1), 0);
    expect(b.feeLamports).toBe(0);
    expect(b.sellerProceedsLamports).toBe(b.priceLamports);
  });

  it('floors fractional-lamport fees (never over-charges the seller)', () => {
    // 1 lamport @ 1 bps would be 0.0001 lamports -> floored to 0.
    const b = computeFeeBreakdown(1, 1);
    expect(b.feeLamports).toBe(0);
    expect(b.sellerProceedsLamports).toBe(1);
  });
});
