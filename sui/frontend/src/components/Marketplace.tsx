import { useEffect, useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x_PACKAGE_ID';
const MARKETPLACE_ID = import.meta.env.VITE_MARKETPLACE_ID || '0x_MARKETPLACE_ID';
const FALLBACK_LOYALTY_ID = import.meta.env.VITE_LOYALTY_ID || '0x_LOYALTY_ID';
const PLACEHOLDER_MARKETPLACE_ID = '0x_MARKETPLACE_ID';

type ListingCard = {
  listingId: string;
  nftId: string;
  priceMist: string;
  seller: string;
  nftName?: string;
  nftUrl?: string;
};

type OwnedNftCard = {
  objectId: string;
  name: string;
  description: string;
  url: string;
  owner: string;
};

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
  }
  return url;
}

function parseSuiString(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    try {
      return new TextDecoder().decode(new Uint8Array(value));
    } catch (e) {
      return String(value);
    }
  }
  if (value && typeof value === 'object') {
    if (value.fields && Array.isArray(value.fields.bytes)) {
       try {
         return new TextDecoder().decode(new Uint8Array(value.fields.bytes));
       } catch (e) {
         return String(value.fields.bytes);
       }
    }
    // other custom struct containing a string or bytes
    if (Array.isArray(value.bytes)) {
       try {
         return new TextDecoder().decode(new Uint8Array(value.bytes));
       } catch (e) {
         return String(value.bytes);
       }
    }
  }
  return String(value ?? '');
}

function formatSui(mist: string) {
  return (Number(mist) / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function parseErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: string }).message;
    if (maybeMessage) return maybeMessage;

    const nestedMessage = (error as { cause?: { message?: string } }).cause?.message;
    if (nestedMessage) return nestedMessage;
  }

  return 'Unknown transaction error';
}

function LiveListingCard({ 
  item, 
  currentAccountAddress,
  currentAccountLabel,
  cancelingId,
  onBuy, 
  onCancel 
}: { 
  item: ListingCard; 
  currentAccountAddress: string | undefined;
  currentAccountLabel: string | undefined;
  cancelingId: string | null;
  onBuy: (nftId: string, price: string) => void;
  onCancel: (nftId: string) => void;
}) {
  const { data: nftResponse, error, isPending } = useSuiClientQuery(
    'getObject',
    {
      id: item.nftId,
      options: { showContent: true },
    }
  );

  const fields = nftResponse?.data?.content?.dataType === 'moveObject' ? (nftResponse.data.content.fields as any) : null;
  const nftName = item.nftName || (fields ? parseSuiString(fields.name ?? 'Untitled NFT') : '');
  const nftUrl = item.nftUrl || (fields ? parseSuiString(fields.url ?? '') : '');

  const errorMsg = error ? parseErrorMessage(error) : (nftResponse?.error ? JSON.stringify(nftResponse.error) : '');

  return (
    <div className="nft-card">
      <div className="nft-card-image-container">
        {nftUrl ? (
          <img
            src={resolveImageUrl(nftUrl)}
            alt={nftName}
            className="nft-card-image"
          />
        ) : (
          <div className="nft-card-image" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {isPending ? <span style={{fontSize: '0.9rem', color: 'gray'}}>Loading...</span> : <span style={{fontSize: '0.9rem', color: 'gray'}}>No Image</span>}
          </div>
        )}
      </div>

      <div className="nft-card-content">
        <h3 className="nft-card-title">{nftName || (errorMsg ? `Err: ${errorMsg}` : (isPending ? 'Loading...' : 'Unknown NFT'))}</h3>
        <p className="nft-card-subtitle">
          {item.nftId}
        </p>

        <div className="nft-card-footer">
          <div>
            <p className="nft-card-price-label">Price</p>
            <p className="nft-card-price-value">{formatSui(item.priceMist)} SUI</p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p className="nft-card-price-label">Listed By</p>
            <p style={{margin: 0, fontWeight: 600, color: 'var(--text-light)', fontSize: '0.95rem'}}>
              {currentAccountAddress === item.seller ? (currentAccountLabel || 'You') : shortenAddress(item.seller)}
            </p>
          </div>
        </div>

        {currentAccountAddress === item.seller ? (
          <button
            type="button"
            className="primary-btn"
            style={{marginTop: '1.5rem', background: 'rgba(255,50,50,0.2)', color: '#ff5555', border: '1px solid rgba(255,50,50,0.5)', cursor: cancelingId === item.nftId ? 'not-allowed' : 'pointer'}}
            onClick={() => onCancel(item.nftId)}
            disabled={cancelingId === item.nftId}
          >
            {cancelingId === item.nftId ? 'Canceling...' : 'Cancel Listing'}
          </button>
        ) : (
          <button
            type="button"
            className="primary-btn"
            style={{marginTop: '1.5rem'}}
            onClick={() => onBuy(item.nftId, formatSui(item.priceMist))}
          >
            Buy Now
          </button>
        )}
      </div>
    </div>
  );
}

type MarketplaceProps = {
  recentMintedNftId?: string | null;
  onRecentMintHandled?: () => void;
};

export default function Marketplace({ recentMintedNftId, onRecentMintHandled }: MarketplaceProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [activeLoyaltyId, setActiveLoyaltyId] = useState<string>(FALLBACK_LOYALTY_ID);

  const [nftIdToBuy, setNftIdToBuy] = useState('');
  const [priceToBuy, setPriceToBuy] = useState('');
  const [buying, setBuying] = useState(false);

  const [nftIdToList, setNftIdToList] = useState('');
  const [priceToList, setPriceToList] = useState('');
  const [listing, setListing] = useState(false);

  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!recentMintedNftId) return;
    setNftIdToList(recentMintedNftId);
    if (!priceToList) {
      setPriceToList('0.01');
    }
    onRecentMintHandled?.();
  }, [onRecentMintHandled, priceToList, recentMintedNftId]);

  const hasMarketplaceId = !!MARKETPLACE_ID && MARKETPLACE_ID !== PLACEHOLDER_MARKETPLACE_ID;

  const {
    data: ownedNftsResponse,
    isPending: ownedNftsPending,
    refetch: refetchOwnedNfts,
  } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: currentAccount?.address ?? '',
      filter: {
        StructType: `${PACKAGE_ID}::nft::NFT`,
      },
      options: { showContent: true },
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  const {
    data: loyaltyOwnedObjects,
    refetch: refetchLoyaltyOwnedObjects,
  } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: currentAccount?.address ?? '',
      filter: {
        StructType: `${PACKAGE_ID}::loyalty::Loyalty`,
      },
      options: { showContent: true },
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  useEffect(() => {
    const ownedLoyaltyId = loyaltyOwnedObjects?.data?.[0]?.data?.objectId;
    if (ownedLoyaltyId) {
      setActiveLoyaltyId(String(ownedLoyaltyId));
      return;
    }

    setActiveLoyaltyId(FALLBACK_LOYALTY_ID);
  }, [loyaltyOwnedObjects]);

  const {
    data: dynamicFields,
    isPending: listingsPending,
    error: listingsError,
    refetch: refetchDynamicFields,
  } = useSuiClientQuery(
    'getDynamicFields',
    { parentId: MARKETPLACE_ID },
    { enabled: hasMarketplaceId }
  );

  const listingObjectIds =
    dynamicFields?.data
      ?.map((field: any) => field.objectId)
      .filter((id: string | undefined): id is string => Boolean(id)) ?? [];

  const {
    data: listingObjects,
    isPending: listingObjectsPending,
    refetch: refetchListingObjects,
  } = useSuiClientQuery(
    'multiGetObjects',
    {
      ids: listingObjectIds,
      options: { showContent: true },
    },
    {
      enabled: listingObjectIds.length > 0,
    }
  );

  const visibleListings: ListingCard[] =
    listingObjects
      ?.map((item: any) => {
        const fields = item?.data?.content?.fields;
        if (!fields?.nft_id || fields?.price == null || !fields?.seller) return null;

        let nftName = undefined;
        let nftUrl = undefined;
        // If NFT is embedded in the listing struct
        const embeddedNft = fields.nft ?? fields.item;
        if (embeddedNft?.fields) {
          nftName = parseSuiString(embeddedNft.fields.name ?? 'Untitled NFT');
          nftUrl = parseSuiString(embeddedNft.fields.url ?? '');
        }

        return {
          listingId: item?.data?.objectId ?? '',
          nftId: String(fields.nft_id),
          priceMist: String(fields.price),
          seller: String(fields.seller),
          nftName,
          nftUrl,
        };
      })
      .filter((item: ListingCard | null): item is ListingCard => Boolean(item)) ?? [];

  const ownedNfts: OwnedNftCard[] =
    ownedNftsResponse?.data
      ?.map((item: any) => {
        const fields = item?.data?.content?.fields;
        const objectId = item?.data?.objectId;
        if (!fields || !objectId) return null;

        return {
          objectId,
          name: parseSuiString(fields.name ?? 'Untitled NFT'),
          description: parseSuiString(fields.description ?? ''),
          url: parseSuiString(fields.url ?? ''),
          owner: String(fields.owner ?? ''),
        };
      })
      .filter((item: OwnedNftCard | null): item is OwnedNftCard => Boolean(item)) ?? [];

  const refreshListings = () => {
    refetchDynamicFields();
    if (listingObjectIds.length > 0) {
      refetchListingObjects();
    }
    if (currentAccount?.address) {
      refetchOwnedNfts();
      refetchLoyaltyOwnedObjects();
    }
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nftIdToBuy || !priceToBuy || !MARKETPLACE_ID || !currentAccount?.address) return;
    setBuying(true);

    try {
      const tx = new Transaction();
      
      const priceMist = BigInt(Math.floor(Number(priceToBuy) * 1_000_000_000));
      const [coin] = tx.splitCoins(tx.gas, [priceMist]);

      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::buy_nft`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.id(nftIdToBuy),
          coin,
          tx.object(activeLoyaltyId),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('Successfully purchased NFT!');
            setNftIdToBuy('');
            setPriceToBuy('');
            refreshListings();
            refetchOwnedNfts();
          },
          onError: (err) => {
            console.error(err);
            alert(`Purchase failed: ${parseErrorMessage(err)}`);
          },
          onSettled: () => setBuying(false)
        }
      );
    } catch(err) {
      console.error(err);
      setBuying(false);
    }
  };

  const handleCancelListing = async (nftIdToCancel: string) => {
    if (!MARKETPLACE_ID || !currentAccount?.address) return;
    setCancelingId(nftIdToCancel);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::cancel_listing`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.id(nftIdToCancel),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('Successfully canceled listing!');
            refreshListings();
            refetchOwnedNfts();
          },
          onError: (err) => {
            console.error(err);
            alert(`Cancel listing failed: ${parseErrorMessage(err)}`);
          },
          onSettled: () => setCancelingId(null)
        }
      );
    } catch(err) {
      console.error(err);
      setCancelingId(null);
    }
  };

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;
    setListing(true);

    try {
      const tx = new Transaction();
      // Price in MIST
      const priceInMist = BigInt(parseFloat(priceToList) * 1_000_000_000);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::list_nft`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.object(nftIdToList),
          tx.pure.u64(priceInMist),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('Listing successful!');
            setNftIdToList('');
            setPriceToList('');
            refreshListings();
          },
          onError: (err) => {
            console.error(err);
            alert(`Listing failed: ${parseErrorMessage(err)}`);
          },
          onSettled: () => setListing(false)
        }
      );
    } catch(err) {
      console.error(err);
      setListing(false);
    }
  };

  const handleDeleteNft = async (nftId: string) => {
    if (!currentAccount?.address) return;
    
    if (!confirm('Are you sure you want to delete this NFT? This action is permanent and cannot be undone.')) {
      return;
    }

    setDeletingId(nftId);
    
    try {
      const tx = new Transaction();
      // Using the standard 0x0 address as a burn address
      const burnAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      tx.moveCall({
        target: `${PACKAGE_ID}::nft::transfer_nft`,
        arguments: [
          tx.object(nftId),
          tx.pure.address(burnAddress),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('NFT successfully deleted!');
            refetchOwnedNfts();
          },
          onError: (err) => {
            console.error(err);
            alert(`Failed to delete NFT: ${parseErrorMessage(err)}`);
          },
          onSettled: () => setDeletingId(null)
        }
      );
    } catch(err) {
      console.error(err);
      setDeletingId(null);
    }
  };

  return (
    <div className="marketplace-container" style={{animation: 'fadeIn 0.5s'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem'}}>
        <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 800}}>Marketplace</h2>
      </div>
      
      <div className="grid-container" style={{marginTop: '2.5rem'}}>
        {/* Buy Section */}
        <div className="nft-card" style={{padding: '2rem'}}>
          <h3 style={{color: 'var(--secondary)', fontSize: '1.4rem'}}>Buy NFT</h3>
          <p className="subtitle" style={{color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem'}}>
            Purchase an NFT and earn loyalty points (1 point per SUI).
          </p>
          <form onSubmit={handleBuy}>
            <div className="input-group">
              <label>Target NFT Object ID</label>
              <input type="text" className="form-input" required value={nftIdToBuy} onChange={e=>setNftIdToBuy(e.target.value)} placeholder="0x..." />
            </div>
            <div className="input-group">
              <label>Purchase Price (SUI)</label>
              <input type="number" step="0.001" className="form-input" required value={priceToBuy} onChange={e=>setPriceToBuy(e.target.value)} placeholder="0.00" />
            </div>
            <button type="submit" className="primary-btn" disabled={buying}>{buying ? 'Confirming...' : 'Buy Now'}</button>
          </form>
        </div>

        {/* List Section */}
        <div className="nft-card" style={{padding: '2rem'}}>
          <h3 style={{color: 'var(--primary)', fontSize: '1.4rem'}}>List NFT</h3>
          <p className="subtitle" style={{color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem'}}>
            Sell an NFT you own on the decentralized marketplace.
          </p>
          {recentMintedNftId && (
            <div style={{marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)'}}>
              <p style={{margin: 0, fontWeight: 700, color: 'var(--secondary)'}}>Freshly Minted NFT Ready</p>
              <p style={{margin: '0.5rem 0 0', color: 'var(--text-light)', wordBreak: 'break-all', fontSize: '0.9rem', opacity: 0.8}}>
                {recentMintedNftId}
              </p>
            </div>
          )}
          <form onSubmit={handleList}>
            <div className="input-group">
              <label>Your NFT Object ID</label>
              <input type="text" className="form-input" required value={nftIdToList} onChange={e=>setNftIdToList(e.target.value)} placeholder="0x..." />
            </div>
            <div className="input-group">
              <label>Listing Price (SUI)</label>
              <input type="number" step="0.001" className="form-input" required value={priceToList} onChange={e=>setPriceToList(e.target.value)} placeholder="0.00" />
            </div>
            <button type="submit" className="primary-btn" disabled={listing} style={{backgroundImage: 'linear-gradient(135deg, var(--secondary), var(--primary))'}}>
              {listing ? 'Listing...' : 'List on Market'}
            </button>
          </form>
        </div>
      </div>

      <div className="glass-panel" style={{marginTop: '2.5rem', padding: '2rem'}}>
        <h3 style={{color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.5rem'}}>Your Wallet NFTs</h3>
        <p className="subtitle" style={{color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 0}}>
          Select an NFT to prefill the listing form.
        </p>

        {ownedNftsPending ? (
          <p style={{marginTop: '2rem', color: 'var(--text-muted)'}}>Loading your NFTs...</p>
        ) : ownedNfts.length === 0 ? (
          <div style={{marginTop: '2rem', padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px'}}>
            <p style={{color: 'var(--text-muted)'}}>No owned NFTs found for this wallet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid-container" style={{marginTop: '2rem'}}>
            {ownedNfts.map((item) => (
              <div key={item.objectId} className="nft-card">
                <div className="nft-card-image-container">
                  {item.url ? (
                    <img
                      src={resolveImageUrl(item.url)}
                      alt={item.name}
                      className="nft-card-image"
                    />
                  ) : (
                    <div className="nft-card-image" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <span style={{fontSize: '0.9rem', color: 'gray'}}>No Image</span>
                    </div>
                  )}
                </div>
                
                <div className="nft-card-content">
                  <h3 className="nft-card-title">{item.name}</h3>
                  <p className="nft-card-subtitle">{item.objectId}</p>
                  
                  <div className="nft-card-footer" style={{flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', paddingBottom: 0}}>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        setNftIdToList(item.objectId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      List This NFT
                    </button>
                    
                    <button
                      type="button"
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(255, 50, 50, 0.1)',
                        color: '#ff5555',
                        border: '1px solid rgba(255, 50, 50, 0.3)',
                        borderRadius: '12px',
                        cursor: deletingId === item.objectId ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={(e) => {
                        if (deletingId !== item.objectId) {
                          e.currentTarget.style.background = 'rgba(255, 50, 50, 0.2)';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 50, 50, 0.1)';
                      }}
                      onClick={() => handleDeleteNft(item.objectId)}
                      disabled={deletingId === item.objectId}
                    >
                      {deletingId === item.objectId ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{marginTop: '2.5rem', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem'}}>Active loyalty profile for this wallet:</p>
          <p style={{margin: '0.5rem 0 0', wordBreak: 'break-all', fontWeight: 700, color: 'var(--secondary)'}}>
            {activeLoyaltyId}
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{marginTop: '2.5rem', padding: '2.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem'}}>
          <div>
            <h3 style={{color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.8rem'}}>Live Listings</h3>
            <p className="subtitle" style={{color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 0}}>
              Real-time NFT listings from the Sui marketplace.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={refreshListings}
            disabled={!hasMarketplaceId || listingsPending || listingObjectsPending}
            style={{maxWidth: '220px'}}
          >
            {listingsPending || listingObjectsPending ? 'Refreshing...' : 'Refresh Listings'}
          </button>
        </div>

        {!hasMarketplaceId ? (
          <div style={{marginTop: '2rem', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
            <p style={{margin: 0, color: '#fca5a5'}}>Configure `VITE_MARKETPLACE_ID` to load marketplace listings.</p>
          </div>
        ) : listingsError ? (
          <div style={{marginTop: '2rem', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
            <p style={{margin: 0, color: '#fca5a5'}}>Could not load listings. Verify the marketplace object ID is correct.</p>
          </div>
        ) : listingsPending || listingObjectsPending ? (
          <p style={{marginTop: '2.5rem', color: 'var(--text-muted)'}}>Loading current listings from testnet...</p>
        ) : visibleListings.length === 0 ? (
          <div style={{marginTop: '2.5rem', padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px'}}>
            <p style={{color: 'var(--text-muted)'}}>No active listings found. List an NFT above to see it appear here.</p>
          </div>
        ) : (
          <div className="grid-container" style={{marginTop: '2.5rem'}}>
            {visibleListings.map((item) => (
              <LiveListingCard 
                key={item.listingId} 
                item={item} 
                currentAccountAddress={currentAccount?.address}
                currentAccountLabel={currentAccount?.label}
                cancelingId={cancelingId}
                onBuy={(nftId, price) => {
                  setNftIdToBuy(nftId);
                  setPriceToBuy(price);
                }} 
                onCancel={handleCancelListing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
