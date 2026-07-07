// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// A fake Connection that satisfies every method the app touches at mount, so we
// can render the WHOLE app under jsdom and catch crash/blank-screen bugs
// without a real RPC or browser.
const fakeConnection = {
  onAccountChange: vi.fn(() => 1),
  onProgramAccountChange: vi.fn(() => 2),
  onLogs: vi.fn(() => 3),
  removeAccountChangeListener: vi.fn(async () => undefined),
  removeOnLogsListener: vi.fn(async () => undefined),
  getAccountInfo: vi.fn(async () => null),
  getProgramAccounts: vi.fn(async () => []),
  getBalance: vi.fn(async () => 0),
  getParsedTokenAccountsByOwner: vi.fn(async () => ({ value: [] })),
  getGenesisHash: vi.fn(async () => 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'),
};

vi.mock('@solana/wallet-adapter-react', () => ({
  useConnection: () => ({ connection: fakeConnection }),
  useWallet: () => ({ connected: false, publicKey: null, sendTransaction: vi.fn() }),
  useAnchorWallet: () => undefined,
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button>Select Wallet</button>,
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Avoid pulling Umi/Metaplex network stack into the render.
vi.mock('../lib/solana/metadata', () => ({
  fetchNftMetadata: vi.fn(async () => null),
  normalizeUri: (u: string) => u,
}));

// findProgramAddressSync relies on ed25519 curve checks that misbehave under
// jsdom's cross-realm typed arrays (a test-env artifact, not a browser bug).
// PDA derivation is unit-tested separately in the node environment, so here we
// stub it with a valid key to let the component tree render.
vi.mock('../lib/anchor/pdas', () => {
  // require is required here: vi.mock factories are hoisted above imports.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PublicKey } = require('@solana/web3.js');
  const key = new PublicKey('11111111111111111111111111111111');
  return {
    findMarketplacePda: () => [key, 255],
    findTreasuryPda: () => [key, 255],
    findListingPda: () => [key, 255],
    findVaultPda: () => [key, 255],
  };
});

import { App } from '../App';

function renderApp(route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App renders end-to-end (no crash / blank screen)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the marketplace landing without throwing', () => {
    renderApp('/');
    expect(screen.getByText(/Own the moment/i)).toBeInTheDocument();
    // Subscriptions wired up at mount.
    expect(fakeConnection.onProgramAccountChange).toHaveBeenCalled();
  });

  it('renders portfolio (wallet-gated) without throwing', () => {
    renderApp('/portfolio');
    expect(screen.getByText(/Wallet not connected/i)).toBeInTheDocument();
  });

  it('renders favorites without throwing', () => {
    renderApp('/favorites');
    expect(screen.getByRole('heading', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('renders an unknown route as Not found', () => {
    renderApp('/does-not-exist');
    expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
  });
});
