import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { NetworkBanner } from './components/layout/NetworkBanner';
import { Ticker } from './components/layout/Ticker';
import { Aurora } from './components/Aurora';
import { ToastViewport } from './components/toast/ToastViewport';
import { Footer } from './components/layout/Footer';
import { MarketplacePage } from './features/marketplace/MarketplacePage';
import { MintPage } from './features/mint/MintPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { PortfolioPage } from './features/portfolio/PortfolioPage';
import { FavoritesPage } from './features/favorites/FavoritesPage';
import { AdminPage } from './features/admin/AdminPage';
import { NftDetailPage } from './features/nft/NftDetailPage';
import { useRealtimeSync } from './hooks/useRealtimeSync';

export function App() {
  // Single mount of the real-time engine: account + log subscriptions that keep
  // the whole app live without any backend or polling.
  useRealtimeSync();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Aurora />
      <NetworkBanner />
      <Header />
      <Ticker />
      {/* `key` on the location restarts the fade-in animation on every route change. */}
      <main
        key={location.pathname}
        className="mx-auto w-full max-w-7xl flex-1 animate-fade-in px-4 py-6 motion-reduce:animate-none"
      >
        <Routes location={location}>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/mint" element={<MintPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/nft/:mint" element={<NftDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ToastViewport />
    </div>
  );
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-5xl">🛸</p>
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <Link to="/" className="btn-primary mt-4 inline-flex">
        Back to marketplace
      </Link>
    </div>
  );
}
