import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';
import './App.css';
import MintWidget from './components/MintWidget';
import Marketplace from './components/Marketplace';
import LoyaltyDashboard from './components/LoyaltyDashboard';

function shortenAddress(value: string) {
  if (!value) return '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function App() {
  const currentAccount = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<'mint' | 'market' | 'loyalty'>('market');
  const [recentMintedNftId, setRecentMintedNftId] = useState<string | null>(null);

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo" style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
          <h1>Sui NFT Platform 🚀</h1>
          {currentAccount && (
            <div className="user-badge" style={{display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.5s'}}>
              <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981'}}></div>
              <span style={{fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-light)'}}>
                {currentAccount.label || 'Wallet'}
              </span>
              <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                ({shortenAddress(currentAccount.address)})
              </span>
            </div>
          )}
        </div>
        <div className="nav-controls">
          <ConnectButton />
        </div>
      </header>

      <main className="main-content">
        {!currentAccount ? (
          <div className="hero-section">
            <h2 className="gradient-text">Next-Gen NFT Experience</h2>
            <p>Connect your wallet to mint, discover, and trade premium digital assets on the fastest blockchain.</p>
            <div className="placeholder-connect">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="dashboard">
            <nav className="tab-menu">
              <button 
                className={activeTab === 'market' ? 'active tab-btn' : 'tab-btn'} 
                onClick={() => setActiveTab('market')}
              >
                Marketplace
              </button>
              <button 
                className={activeTab === 'mint' ? 'active tab-btn' : 'tab-btn'} 
                onClick={() => setActiveTab('mint')}
              >
                Create NFT
              </button>
              <button 
                className={activeTab === 'loyalty' ? 'active tab-btn' : 'tab-btn'} 
                onClick={() => setActiveTab('loyalty')}
              >
                VIP Rewards
              </button>
            </nav>

            <div className="tab-content glass-panel">
              {activeTab === 'mint' && (
                <MintWidget
                  onMinted={(nftId) => {
                    setRecentMintedNftId(nftId);
                    setActiveTab('market');
                  }}
                />
              )}
              {activeTab === 'market' && (
                <Marketplace
                  recentMintedNftId={recentMintedNftId}
                  onRecentMintHandled={() => setRecentMintedNftId(null)}
                />
              )}
              {activeTab === 'loyalty' && <LoyaltyDashboard />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
