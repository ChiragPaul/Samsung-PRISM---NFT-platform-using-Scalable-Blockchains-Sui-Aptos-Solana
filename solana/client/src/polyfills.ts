// Solana web3.js + Anchor assume Node's Buffer/process exist on the global
// object. Vite doesn't provide them in the browser, so we shim them here.
// This file MUST be imported before any Solana code runs (see main.tsx).
import { Buffer } from 'buffer';
import process from 'process';

declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: typeof process;
  }
}

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer ?? Buffer;
  window.global = window.global ?? window;
  window.process = window.process ?? process;
}

// Some libs reference a bare `global`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = (globalThis as any).Buffer ?? Buffer;
