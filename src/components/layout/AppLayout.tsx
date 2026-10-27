import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Package, Store, UserRound, Menu, X, Tag } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getHostProduct } from '@/lib/productContext';

function StandaloneProductNav({ product, onClose }: { product: NonNullable<ReturnType<typeof getHostProduct>>; onClose?: () => void }) {
  const location = useLocation();
  const links = [
    { label: 'Home', to: `/workspace/${product.id}`, icon: Home },
    { label: product.captureLabel, to: '/identify', icon: Camera },
    { label: product.collectionLabel, to: '/inventory', icon: Package },
    { label: 'Listings', to: '/listings', icon: Tag },
    { label: 'eBay', to: '/ebay', icon: Store },
    { label: 'Account', to: '/settings', icon: UserRound },
  ];
  return <nav className="flex flex-wrap items-center gap-1" aria-label={product.name}>
    {links.map(({label,to,icon:Icon}) => {
      const active = location.pathname === to || (to === '/ebay' && location.pathname.startsWith('/ebay')) || (to === '/inventory' && location.pathname.startsWith('/inventory')) || (to === '/listings' && location.pathname.startsWith('/listings')) || (to === '/settings' && location.pathname.startsWith('/settings')) || (to.startsWith('/workspace') && location.pathname.startsWith('/workspace'));
      return <Link key={label} to={to} onClick={onClose} aria-current={active ? 'page' : undefined} className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><Icon className="h-4 w-4" /><span>{label}</span></Link>;
    })}
  </nav>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const product = getHostProduct();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const standalone = Boolean(product && !isOwner);
  const isAdminScreen = isOwner && (location.pathname.startsWith('/master-admin') || location.pathname === '/niches');

  useEffect(() => {
    if (product) document.documentElement.dataset.niche = product.id;
  }, [product, location.pathname]);

  if (standalone && product) {
    return <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link to={`/workspace/${product.id}`} className="flex min-w-0 items-center gap-3" aria-label={product.name + ' home'}>
            <span className="h-9 w-9 shrink-0 rounded-xl bg-primary" style={{backgroundColor: product.accent}} />
            <span className="truncate text-lg font-bold">{product.name}</span>
          </Link>
          <button className="rounded-lg p-2 hover:bg-secondary lg:hidden" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}>{sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <div className="hidden lg:block"><StandaloneProductNav product={product} /></div>
        </div>
        {sidebarOpen && <div className="border-t border-border px-3 py-3 lg:hidden"><StandaloneProductNav product={product} onClose={() => setSidebarOpen(false)} /></div>}
      </header>
      <main className="mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl p-3 sm:p-5 md:p-7">{children}</main>
    </div>;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0"><Sidebar /></aside>
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-50 flex"><div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} /><aside className="relative flex flex-col w-60 z-10"><Sidebar onClose={() => setSidebarOpen(false)} /></aside></div>}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={cn('flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 md:p-6 animate-fade-in', !isAdminScreen && 'pb-24 lg:pb-6')}>{children}</main>
      </div>
    </div>
  );
}
