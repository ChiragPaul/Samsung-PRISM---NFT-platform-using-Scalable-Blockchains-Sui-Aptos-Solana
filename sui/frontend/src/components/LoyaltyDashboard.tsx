import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x_PACKAGE_ID';
const FALLBACK_LOYALTY_ID = import.meta.env.VITE_LOYALTY_ID || '0x_LOYALTY_ID';

export default function LoyaltyDashboard() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [creating, setCreating] = useState(false);

  const { data: loyaltyOwnedObjects, isPending: ownedPending, refetch: refetchOwned } = useSuiClientQuery(
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

  const loyaltyId = String(loyaltyOwnedObjects?.data?.[0]?.data?.objectId ?? FALLBACK_LOYALTY_ID);

  const { data: loyaltyObj, isPending, error } = useSuiClientQuery(
    'getObject',
    {
      id: loyaltyId,
      options: { showContent: true },
    },
    {
      enabled: !!loyaltyId && loyaltyId !== '0x_LOYALTY_ID',
    }
  );

  const handleCreateProfile = async () => {
    if (!currentAccount) return;
    setCreating(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::loyalty::create_profile`,
        arguments: [],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            refetchOwned();
            alert('Loyalty profile created! The dashboard will refresh for the active wallet.');
          },
          onError: (err) => alert('Failed: ' + err),
          onSettled: () => setCreating(false)
        }
      );
    } catch(err) {
      console.error(err);
      setCreating(false);
    }
  };

  const content: any = loyaltyObj?.data?.content;
  const points = content?.fields?.points || 0;
  const tier = content?.fields?.tier || 1;

  return (
    <div className="loyalty-container" style={{animation: 'fadeIn 0.5s'}}>
      <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2.5rem'}}>
        <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 800}}>VIP Rewards</h2>
        <p className="subtitle" style={{color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0, fontSize: '1.05rem'}}>
          Track your loyalty points and exclusive status.
        </p>
      </div>
      
      {!loyaltyId || loyaltyId === '0x_LOYALTY_ID' ? (
        <div style={{textAlign: 'center', margin: '4rem auto', maxWidth: '600px', padding: '3rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-color)'}}>
          <div style={{width: '64px', height: '64px', margin: '0 auto 1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <span style={{fontSize: '2rem'}}>⭐</span>
          </div>
          <h3 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Unlock Rewards</h3>
          <p style={{color: 'var(--text-muted)', lineHeight: '1.6'}}>
            No loyalty profile was found for the connected wallet.
            Create one below to start earning points for every SUI spent on the marketplace.
          </p>
          <button className="primary-btn" style={{marginTop: '2rem'}} onClick={handleCreateProfile} disabled={creating}>
            {creating ? 'Creating Profile...' : 'Initialize Loyalty Profile'}
          </button>
        </div>
      ) : ownedPending || isPending ? (
        <div style={{textAlign: 'center', padding: '5rem 0'}}>
          <div style={{width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem'}}></div>
          <p style={{color: 'var(--text-muted)'}}>Loading loyalty data from Sui testnet...</p>
        </div>
      ) : error ? (
        <div style={{textAlign: 'center', margin: '4rem auto', maxWidth: '500px', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
          <p style={{color: '#fca5a5', margin: 0}}>Error loading profile for the connected wallet.</p>
        </div>
      ) : (
        <div className="grid-container" style={{marginTop: '2rem', gap: '2.5rem'}}>
          <div className="nft-card" style={{padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)', position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'}}></div>
            <p style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, position: 'relative'}}>Total Points</p>
            <h1 style={{fontSize: '6rem', color: 'var(--text-light)', margin: '1rem 0', fontWeight: 800, textShadow: '0 0 40px rgba(139, 92, 246, 0.5)', position: 'relative'}}>{points}</h1>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, position: 'relative'}}>
              Earned automatically via marketplace purchases.
            </p>
          </div>

          <div className="nft-card" style={{padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.15) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(6, 182, 212, 0.3)', position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 50%)'}}></div>
            <p style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, position: 'relative'}}>VIP Status</p>
            <h1 style={{fontSize: '5rem', color: 'var(--secondary)', margin: '1rem 0', fontWeight: 800, textShadow: '0 0 40px rgba(6, 182, 212, 0.5)', position: 'relative'}}>Tier {tier}</h1>
            <div style={{position: 'relative', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
              {tier === 1 && <p style={{color: 'var(--text-light)', fontSize: '0.95rem', margin: 0}}>Reach 101 points to upgrade to Tier 2!</p>}
              {tier === 2 && <p style={{color: 'var(--text-light)', fontSize: '0.95rem', margin: 0}}>Reach 501 points to upgrade to VIP Tier 3!</p>}
              {tier === 3 && <p style={{color: 'var(--text-light)', fontSize: '0.95rem', margin: 0}}>Max Tier reached. Excellent!</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
