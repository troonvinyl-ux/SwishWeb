import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Package, Store, UserRound } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { getSpecialistIdsForNiche, type SwishNicheId } from '@/lib/niche';

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
  const captureRoute = niche === 'coins' ? '/identify/coins' : niche === 'surplus_flip' ? '/scan/surplus_flip' : `/scan/${niche === 'bicycles' ? 'bikes' : niche === 'motocross' ? 'mx' : niche}`;
  const links = [
    { label: 'Home', to: `/workspace/${niche}`, icon: Home },
    { label: 'Capture', to: captureRoute, icon: Camera, primary: true },
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
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [selectedNiche, setSelectedNiche] = useState(() => {
    const saved = localStorage.getItem('swish_active_niche') || user?.user_metadata?.preferred_niche || 'coins';
    return VALID_NICHES.includes(saved) ? saved : 'coins';
  });
  const { data: activeSpecialists = [], isLoading: entitlementsLoading } = useQuery({
    queryKey: ['app_shell_niche_entitlements', tenantId],
    enabled: Boolean(tenantId) && !isOwner,
    staleTime: 60_000,
    queryFn: async () => {
      const sb = getSupabaseClient() || await getSupabaseClientAsync();
      if (!sb || !tenantId) return [] as string[];
      const { data, error } = await sb.from('tenants').select('active_specialists').eq('id', tenantId).maybeSingle();
      if (error) throw error;
      const raw = data?.active_specialists;
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }
      return [] as string[];
    },
  });
  const entitledNiches = useMemo(() => isOwner ? VALID_NICHES : VALID_NICHES.filter(id => getSpecialistIdsForNiche(id as SwishNicheId).some(specialist => activeSpecialists.includes(specialist))), [isOwner, activeSpecialists]);
  const niche = selectedNiche;
  const isClothingWorkspace = niche === 'clothing' && location.pathname.startsWith('/workspace/clothing');
  const isAdminScreen = isOwner && (location.pathname.startsWith('/master-admin') || location.pathname === '/niches');

  useEffect(() => {
    const saved = localStorage.getItem('swish_active_niche') || user?.user_metadata?.preferred_niche || 'coins';
    if (VALID_NICHES.includes(saved)) setSelectedNiche(saved);
  }, [location.pathname, user?.user_metadata?.preferred_niche]);

  useEffect(() => {
    if (isOwner || tenantLoading || entitlementsLoading) return;
    if (!entitledNiches.length) return;
    if (!entitledNiches.includes(selectedNiche)) {
      const preferred = String(user?.user_metadata?.preferred_niche || '');
      const replacement = entitledNiches.includes(preferred) ? preferred : entitledNiches[0];
      localStorage.setItem('swish_active_niche', replacement);
      localStorage.setItem('swish_active_niche_name', PRODUCT_NAMES[replacement] || replacement);
      setSelectedNiche(replacement);
    }
  }, [isOwner, tenantLoading, entitlementsLoading, entitledNiches, selectedNiche, user?.user_metadata?.preferred_niche]);

  useEffect(() => {
    document.documentElement.dataset.niche = niche;
    document.title = `${PRODUCT_NAMES[niche] || 'SWISH'} | SWISH`;
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', niche === 'coins' ? '#0D0B10' : niche === 'motocross' ? '#160D10' : niche === 'bicycles' ? '#0D1712' : niche === 'clothing' ? '#0C080C' : '#0D1716');
  }, [niche, location.pathname]);

  if (!isOwner && (tenantLoading || entitlementsLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading your SWISH workspace…</div>;
  }
  if (!isOwner && !entitledNiches.length) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-6 text-center"><h1 className="text-xl font-bold">No niche access is configured</h1><p className="text-sm text-muted-foreground">Your workspace does not currently have an active specialist entitlement. Please contact the SWISH owner.</p></div>;
  }

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
