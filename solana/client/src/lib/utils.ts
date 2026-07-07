import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Shorten a base58 address for display, e.g. `7xKX…WQ9`. */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Format a SOL amount with sensible precision. */
export function formatSol(sol: number, maxFractionDigits = 4): string {
  if (!Number.isFinite(sol)) return '0';
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatRelativeTime(unixSeconds: number): string {
  const deltaSec = Math.floor(Date.now() / 1000) - unixSeconds;
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}

/** Stable id generator for client-only entities (activity, collections). */
export function makeId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidPublicKey(value: string): boolean {
  // base58, 32-44 chars — cheap pre-validation before constructing a PublicKey.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}
