import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// REQUIREMENT [Core Req 3 - Frontend Application]: navigation between the pages (React Router NavLink). Responsive sidebar / mobile menu for Core Req 4 - Frontend Design.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Today',
    items: [
      { to: '/app', label: 'Dashboard', icon: 'home', end: true },
      { to: '/app/sales/new', label: 'Record a sale', icon: 'cart' },
      { to: '/app/stock/new', label: 'Restock or write off', icon: 'swap' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { to: '/app/products', label: 'Products', icon: 'box' },
      { to: '/app/transactions', label: 'Stock ledger', icon: 'list' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { to: '/app/forecast', label: 'Forecast and reorder', icon: 'trend' },
      { to: '/app/orders', label: 'Purchase orders', icon: 'clipboard' },
      { to: '/app/reports', label: 'Sales reports', icon: 'chart' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { to: '/app/suppliers', label: 'Suppliers', icon: 'truck' },
      { to: '/app/categories', label: 'Categories', icon: 'tag' },
    ],
  },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {/* REQUIREMENT [Core Req 3 - Frontend Application]: list rendered with map() using a stable key (title / route), not the index. */}
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-xs font-medium text-white/45">{group.title}</p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-tag'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon name={item.icon} className="size-[18px]" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// The frame around every page inside /app: sidebar on desktop, slide-in menu on phones.
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto bg-ink px-3 py-5 lg:flex">
        <Link to="/" className="mb-7 px-3">
          <Logo light />
        </Link>
        <Navigation />
      </aside>

      {/* Phone top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <Link to="/">
          <Logo light />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10"
        >
          <Icon name="menu" />
        </button>
      </div>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] overflow-y-auto bg-ink px-3 py-4 shadow-pop">
            <div className="mb-5 flex items-center justify-between px-3">
              <span className="text-sm font-medium text-white/60">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10"
              >
                <Icon name="close" />
              </button>
            </div>
            <Navigation onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
