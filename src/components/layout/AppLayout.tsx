import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Package, Store, UserRound } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const VALID_NICHES = ['coins', 'motocross', 'bicycles', 'clothing', 'surplus_flip'];
const PRODUCT_NAMES: Record<string, string> = {
  coins: 'SWISH Coins',
  motocross: 'SWISH MX',
  bicycles: 'SWISH Bikes',
  clothing: 'Threads Flip',
  surplus_flip: 'Surplus Flip',
};

function MobileAppNav({ niche }: { niche: string }) {
  const location = useLocation();
  const links = [
    { label: 'Home', to: `/workspace/${niche}`, icon: Home },
    { label: 'Capture', to: niche === 'surplus_flip' ? '/ebay/import' : '/identify', icon: Camera, primary: true },
    { label: 'Stock', to: '/inventory', icon: Package },
    { label: 'eBay', to: '/ebay', icon: Store },
    { label: 'Account', to: '/settings', icon: UserRound },
  ];
  return (
    <nav className="swish-mobile-nav lg:hidden" aria-label={PRODUCT_NAMES[niche] || 'Product'}>
      {links.map(({ label, to, icon: Icon, primary }) => {
        const active = location.pathname === to || (label === 'Home' && location.pathname === `/workspace/${niche}`) || (label === 'Stock' && location.pathname.startsWith('/inventory')) || (label === 'eBay' && location.pathname.startsWith('/ebay')) || (label === 'Account' && location.pathname.startsWith('/settings'));
        return (
          <Link key={label} to={to} aria-label={label} aria-current={active ? 'page' : undefined} className={cn('swish-mobile-nav-item', active && 'is-active', primary && 'is-primary')}>
            <span className="swish-mobile-nav-icon"><Icon aria-hidden="true" /></span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const preferred = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const niche = VALID_NICHES.includes(preferred) ? preferred : 'coins';
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const isClothingWorkspace = niche === 'clothing' && location.pathname.startsWith('/workspace/clothing');
  const isAdminScreen = isOwner && (location.pathname.startsWith('/master-admin') || location.pathname === '/niches');

  useEffect(() => {
    document.documentElement.dataset.niche = niche;
  }, [niche, location.pathname]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-60 z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main app area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={cn('flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 md:p-6 animate-fade-in', !isClothingWorkspace && !isAdminScreen && 'pb-24 lg:pb-6')}>
          {children}
        </main>
        {!isAdminScreen && !isClothingWorkspace && <MobileAppNav niche={niche} />}
      </div>
    </div>
  );
}
