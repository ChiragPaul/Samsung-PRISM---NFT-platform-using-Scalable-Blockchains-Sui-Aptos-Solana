import { NavLink } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '../wallet/WalletButton';
import { ThemeToggle } from '../ThemeToggle';
import { useAdminActions } from '../../hooks/useAdminActions';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', label: 'Browse', end: true },
  { to: '/mint', label: 'Create' },
  { to: '/analytics', label: 'Stats' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/favorites', label: 'Favorites' },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-brand-400/10 text-brand-400'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function Header() {
  const { connected } = useWallet();
  const { isAuthority } = useAdminActions();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-accent text-sm font-black text-white">
              S
            </span>
            <span className="hidden text-base font-extrabold sm:inline">Solana NFT Market</span>
          </NavLink>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            {/* Admin tab appears only for the on-chain marketplace authority. */}
            {connected && isAuthority && <NavItem to="/admin" label="Admin" />}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
