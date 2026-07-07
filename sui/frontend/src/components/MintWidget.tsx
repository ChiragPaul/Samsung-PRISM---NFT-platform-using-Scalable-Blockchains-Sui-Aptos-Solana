import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Assuming the package ID of our deployed contract is known or from env.
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x_MINT_PACKAGE_ID';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
  }
  return url;
}

type MintWidgetProps = {
  onMinted?: (nftId: string) => void;
};

export default function MintWidget({ onMinted }: MintWidgetProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [royaltyBps, setRoyaltyBps] = useState(500); // default 5%
  const [loading, setLoading] = useState(false);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    setLoading(true);
    try {
      const tx = new Transaction();

      // Argument types: name: vector<u8>, description: vector<u8>, url: vector<u8>, royalty_bps: u64
      tx.moveCall({
        target: `${PACKAGE_ID}::nft::mint_nft`,
        arguments: [
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(url),
          tx.pure.u64(royaltyBps),
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result: any) => {
            console.log('Minted successfully', result);
            let mintedNftId: string | null = null;

            try {
              const txn = await suiClient.getTransactionBlock({
                digest: result.digest,
                options: { showObjectChanges: true },
              });

              const createdNft = txn.objectChanges?.find(
                (change: any) =>
                  change.type === 'created' &&
                  typeof change.objectType === 'string' &&
                  change.objectType.includes(`${PACKAGE_ID}::nft::NFT`),
              ) as { objectId?: string } | undefined;

              mintedNftId = createdNft?.objectId ?? null;
            } catch (fetchError) {
              console.error('Unable to resolve minted NFT object from transaction:', fetchError);
            }

            alert(
              mintedNftId
                ? `NFT Minted! Ready to list: ${mintedNftId}`
                : 'NFT Minted! Check your wallet for the new object ID.',
            );

            if (mintedNftId) {
              onMinted?.(mintedNftId);
            }

            setName('');
            setDescription('');
            setUrl('');
            setRoyaltyBps(500); // reset to default
          },
          onError: (error) => {
            console.error('Minting failed', error);
            alert('Failed to mint NFT. See console for details.');
          },
          onSettled: () => {
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="mint-container" style={{animation: 'fadeIn 0.5s'}}>
      <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2.5rem'}}>
        <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 800}}>Create New NFT</h2>
        <p className="subtitle" style={{color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0, fontSize: '1.05rem'}}>
          Mint your exclusive digital asset onto the Sui network.
        </p>
      </div>

      <div style={{display: 'flex', gap: '3rem', flexWrap: 'wrap'}}>
        <div style={{flex: '1 1 400px'}}>
          <form onSubmit={handleMint}>
            <div className="input-group">
              <label>Name</label>
              <input
                type="text"
                className="form-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Cosmic Artifact #001"
              />
            </div>

            <div className="input-group">
              <label>Description</label>
              <textarea
                className="form-input"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your NFT..."
                style={{resize: 'vertical'}}
              />
            </div>

            <div className="input-group">
              <label>Image URL (IPFS or HTTPS)</label>
              <input
                type="url"
                className="form-input"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="input-group">
              <label style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Royalty Percentage</span>
                <span style={{color: 'var(--primary)', fontWeight: 700}}>{royaltyBps / 100}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={royaltyBps / 100}
                step="0.1"
                style={{
                  width: '100%',
                  accentColor: 'var(--primary)',
                  height: '6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)'
                }}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setRoyaltyBps(Math.round(val * 100)); // convert to basis points
                  }
                }}
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{marginTop: '1.5rem', padding: '1.25rem'}}>
              {loading ? 'Minting to Blockchain...' : 'Mint NFT Asset'}
            </button>
          </form>
        </div>

        {/* Live Preview Pane */}
        <div style={{flex: '1 1 300px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Live Preview</h3>
          <div className="nft-card" style={{flex: 1}}>
            <div className="nft-card-image-container">
              {url ? (
                <img 
                  src={resolveImageUrl(url)} 
                  alt="Preview" 
                  className="nft-card-image"
                />
              ) : (
                <div className="nft-card-image" style={{border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <span style={{color: 'var(--text-muted)'}}>Image Preview</span>
                </div>
              )}
            </div>
            
            <div className="nft-card-content">
              <h3 className="nft-card-title" style={{color: name ? 'var(--text-light)' : 'var(--text-muted)'}}>
                {name || 'Untitled NFT'}
              </h3>
              <p className="nft-card-subtitle" style={{marginTop: '0.5rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'}}>
                {description || 'No description provided.'}
              </p>
              <div className="nft-card-footer" style={{paddingBottom: 0}}>
                <span className="nft-card-price-label">Royalty</span>
                <span className="nft-card-price-value" style={{fontSize: '1.2rem'}}>{royaltyBps / 100}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}