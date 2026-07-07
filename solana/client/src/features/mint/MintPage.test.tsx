// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({ connected: true, publicKey: { toBase58: () => 'Wa11et1111111111111111111111111111111111111' } }),
}));
vi.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button>Select Wallet</button>,
}));
// Keep the heavy Umi/Irys mint stack out of the render path.
vi.mock('../../hooks/useMintNft', () => ({
  useMintNft: () => ({ mint: vi.fn(), status: { stage: 'idle' }, reset: vi.fn() }),
}));

import { MintPage } from './MintPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MintPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MintPage (create happy path)', () => {
  it('renders the mint form when a wallet is connected', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Mint an NFT/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/My Cool NFT/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mint NFT/i })).toBeInTheDocument();
  });

  it('disables submit until required fields are filled', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Mint NFT/i })).toBeDisabled();
  });
});
