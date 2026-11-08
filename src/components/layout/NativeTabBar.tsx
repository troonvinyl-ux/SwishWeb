import { Home, Menu, Package, ScanLine, Tag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getActiveNicheId } from '@/lib/niche';
import type { ProductContext } from '@/lib/productContext';
import { cn } from '@/lib/utils';
import './nativeAppShell.css';

type NativeTabBarProps = {
  product?: ProductContext | null;
};

/**
 * The native app is organised around five persistent destinations.  Keeping
 * this navigation in the web shell (rather than duplicating it in individual
 * screens) makes every specialist workspace behave like the mobile app.
 */
export default function NativeTabBar({ product }: NativeTabBarProps) {
  const location = useLocation();
  const niche = product?.id || getActiveNicheId();
  const home = `/workspace/${niche}`;
  const tabs = [
    { label: 'Home', to: home, icon: Home, active: location.pathname === home || location.pathname === '/' },
    { label: 'Inventory', to: '/inventory', icon: Package, active: location.pathname.startsWith('/inventory') },
    { label: 'Identify', to: '/identify', icon: ScanLine, active: location.pathname === '/identify' || location.pathname.startsWith('/identify/') || location.pathname.startsWith('/scan/') },
    { label: 'Listings', to: '/listings', icon: Tag, active: location.pathname.startsWith('/listings') },
    { label: 'More', to: '/settings', icon: Menu, active: location.pathname.startsWith('/settings') || location.pathname.startsWith('/ebay') || location.pathname.startsWith('/orders') },
  ];

  return (
    <nav className="swish-mobile-nav" aria-label="Primary navigation">
      {tabs.map(({ label, to, icon: Icon, active }, index) => (
        <Link
          key={label}
          to={to}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'swish-mobile-nav-item',
            active && 'is-active',
            index === 2 && 'is-primary',
          )}
        >
          <span className="swish-mobile-nav-icon"><Icon /></span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

