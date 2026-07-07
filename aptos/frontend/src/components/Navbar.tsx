import WalletButton from "./WalletButton"
import { NavLink } from "react-router-dom"

export default function Navbar() {
  const baseStyle = "text-zinc-400 transition hover:text-white"
  const activeStyle = "border-b border-fuchsia-300 pb-1 text-fuchsia-200"

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/6 bg-[#07070b]/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-10">
          <NavLink to="/" className="text-xl font-semibold tracking-tight text-fuchsia-100">
            Luminescent Curator
          </NavLink>

          <div className="hidden gap-6 text-sm md:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? activeStyle : baseStyle)}
            >
              Home
            </NavLink>

            <NavLink
              to="/marketplace"
              className={({ isActive }) => (isActive ? activeStyle : baseStyle)}
            >
              Marketplace
            </NavLink>

            <NavLink
              to="/create"
              className={({ isActive }) => (isActive ? activeStyle : baseStyle)}
            >
              Create
            </NavLink>

            <NavLink
              to="/activity"
              className={({ isActive }) => (isActive ? activeStyle : baseStyle)}
            >
              Activity
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-300 lg:inline-flex">
            Testnet
          </span>

          <div className="rounded-full border border-white/8 bg-white/[0.04] px-1.5 py-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
