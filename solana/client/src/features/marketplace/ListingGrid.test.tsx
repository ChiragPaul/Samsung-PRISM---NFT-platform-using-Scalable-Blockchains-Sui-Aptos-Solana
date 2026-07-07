// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListingGrid } from './ListingGrid';
import type { EnrichedListing } from '../../types';

function makeListing(name: string): EnrichedListing {
  return {
    address: `addr-${name}`,
    seller: 'SeLLer1111111111111111111111111111111111111',
    nftMint: `mint-${name}`,
    vault: 'vault',
    priceLamports: 2_000_000_000,
    priceSol: 2,
    createdAt: 0,
    metadata: {
      mint: `mint-${name}`,
      name,
      symbol: '',
      image: null,
      description: null,
      collection: 'Test Collection',
      attributes: [],
      uri: '',
    },
    rarityTier: 'rare',
    rarityRank: 1,
  };
}

function renderGrid(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ListingGrid (browse happy path)', () => {
  it('renders listing cards with name and price', () => {
    renderGrid(
      <ListingGrid
        listings={[makeListing('Cosmic Ape')]}
        isLoading={false}
        isError={false}
        onBuy={vi.fn()}
      />,
    );
    expect(screen.getByText('Cosmic Ape')).toBeInTheDocument();
    expect(screen.getByText('2 SOL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeInTheDocument();
  });

  it('renders skeletons while loading', () => {
    const { container } = renderGrid(
      <ListingGrid listings={[]} isLoading isError={false} onBuy={vi.fn()} />,
    );
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders an empty state with no listings', () => {
    renderGrid(<ListingGrid listings={[]} isLoading={false} isError={false} onBuy={vi.fn()} />);
    expect(screen.getByText(/no listings found/i)).toBeInTheDocument();
  });

  it('renders an error state with retry', () => {
    const onRetry = vi.fn();
    renderGrid(
      <ListingGrid listings={[]} isLoading={false} isError onBuy={vi.fn()} onRetry={onRetry} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
