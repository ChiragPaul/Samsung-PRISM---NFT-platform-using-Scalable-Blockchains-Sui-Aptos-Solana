/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Solana web3.js + Anchor expect Node globals (Buffer, process) in the browser.
// We polyfill them via aliases + define so the bundle works without a backend.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Bare Node builtins some Solana deps may import. We map only the exact
      // specifiers (no `process`/`buffer` prefix aliases — those collide with
      // sub-paths like `process/browser` that readable-stream imports).
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
    },
  },
  define: {
    // Provide a global shim; `globalThis` is wired up in src/polyfills.ts.
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
    include: ['buffer', 'process'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
  test: {
    globals: true,
    // Default to the node environment so @solana/web3.js crypto (PDA curve
    // checks) uses native typed arrays. Component/render tests opt into jsdom
    // per-file via `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    // Deterministic env so `config` validates without a real .env during tests.
    env: {
      VITE_RPC_URL: 'https://api.devnet.solana.com',
      VITE_PROGRAM_ID: '6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih',
      VITE_NETWORK: 'devnet',
      VITE_MARKETPLACE_NAME: 'test-marketplace',
      VITE_FEATURE_OFFERS: 'false',
    },
  },
});
