import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

import LoginPage from '@/pages/LoginPage';
import NicheEntry from '@/pages/NicheEntry';
import NicheWorkspace from '@/pages/NicheWorkspace';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import InventoryItem from '@/pages/InventoryItem';
import InventoryNew from '@/pages/InventoryNew';
import Identify from '@/pages/Identify';
import NicheCapture from '@/pages/NicheCapture';
import Acquisitions from '@/pages/Acquisitions';
import Opportunities from '@/pages/Opportunities';
import ReviewRequired from '@/pages/ReviewRequired';
import Audit from '@/pages/Audit';
import Listings from '@/pages/Listings';
import ListingNew from '@/pages/ListingNew';
import ListingEditor from '@/pages/ListingEditor';
import Orders from '@/pages/Orders';
import Dispatch from '@/pages/Dispatch';
import Repricing from '@/pages/Repricing';
import Insights from '@/pages/Insights';
import Money from '@/pages/Money';
import Tasks from '@/pages/Tasks';
import CommandCentre from '@/pages/CommandCentre';
import EbayHub from '@/pages/EbayHub';
import EbayListings from '@/pages/EbayListings';
import EbayOrders from '@/pages/EbayOrders';
import EbayMessages from '@/pages/EbayMessages';
import EbayOffers from '@/pages/EbayOffers';
import EbayReturns from '@/pages/EbayReturns';
import EbayCases from '@/pages/EbayCases';
import EbayFinances from '@/pages/EbayFinances';
import EbayAnalytics from '@/pages/EbayAnalytics';
import EbayImport from '@/pages/EbayImport';
import EbayLogs from '@/pages/EbayLogs';
import Settings from '@/pages/Settings';
import MasterAdmin from '@/pages/MasterAdmin';
import ParityTools from '@/pages/ParityTools';
import SpecialistTools from '@/pages/SpecialistTools';
import StockCheck from '@/pages/StockCheck';
import NotFound from '@/pages/NotFound';
import SwishFlipHome from '@/pages/SwishFlipHome';
import { getHostProduct } from '@/lib/productContext';

const currentHostname = window.location.hostname.toLowerCase().replace(/^www\./, '').split(':')[0];
const isSwishFlipMarketingHost = currentHostname === 'swishflip.co.uk';
function NicheComingSoon() {
  const label = currentHostname.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <main className="min-h-screen bg-[#080b12] text-white flex items-center justify-center p-6"><section className="max-w-xl rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center"><div className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">SWISHFLIP niche</div><h1 className="mt-4 text-4xl font-black">{label}</h1><p className="mt-4 leading-7 text-slate-300">This specialist entry point is reserved in the SWISHFLIP directory, but this niche workspace has not been activated yet.</p><a href="https://swishflip.co.uk/#explore" className="mt-7 inline-flex rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950">Explore available niches</a></section></main>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { connectionStatus, loading, user } = useAuth();
  const location = useLocation();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const hostProduct = getHostProduct();
  if (isSwishFlipMarketingHost && window.location.pathname === '/') return <SwishFlipHome />;
  if (currentHostname.endsWith('.swishflip.co.uk') && !hostProduct) return <NicheComingSoon />;
  const preferredNiche = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const routeProduct = {
    '/coins': 'coins',
    '/mx': 'motocross',
    '/bikes': 'bicycles',
    '/clothes': 'clothing',
    '/threads': 'clothing',
    '/surplus': 'surplus_flip',
  }[location.pathname as '/coins' | '/mx' | '/bikes' | '/clothes' | '/threads' | '/surplus'];
  const safeNiche = hostProduct?.id || routeProduct || (['coins', 'motocross', 'bicycles', 'clothing', 'surplus_flip'].includes(preferredNiche) ? preferredNiche : 'coins');
  const needsOnboarding = !isOwner && user?.user_metadata?.onboarding_status === 'started';
  const entryWorkspace = needsOnboarding ? '/onboarding' : `/workspace/${safeNiche}`;

  // Establishing backend connection
  if (connectionStatus === 'initialising') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Connecting to SWISH backend…</span>
      </div>
    );
  }

  // Auth session loading (connection established, checking existing session)
  if (loading && connectionStatus === 'connected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in — login page is branded from the current product domain.
  if (!user) return <LoginPage />;

  // Product hostname selects the workspace entry point; account access is handled by
  // the existing workspace/tenant entitlement rules, not a single preferred_niche field.

  if (hostProduct && !isOwner) {
    const path = location.pathname;
    const commonAllowed = path === '/' || path === '/onboarding' || path.startsWith('/workspace/') || path === '/identify' || path.startsWith('/identify/') || path.startsWith('/scan/') || path.startsWith('/inventory') || path.startsWith('/listings') || path.startsWith('/orders') || path.startsWith('/dispatch') || path.startsWith('/repricing') || path.startsWith('/insights') || path.startsWith('/money') || path.startsWith('/ebay') || path.startsWith('/settings') || path === '/404';
    const coinOnly = path.startsWith('/acquisitions') || path.startsWith('/opportunities') || path.startsWith('/review-required') || path.startsWith('/audit') || path.startsWith('/tools') || path.startsWith('/command-centre') || path.startsWith('/dashboard') || path.startsWith('/tasks');
    const nonCoin = hostProduct.id !== 'coins';
    if (!commonAllowed || (nonCoin && coinOnly)) return <Navigate to={`/workspace/${hostProduct.id}`} replace />;
  }

  return (
    <AppLayout>
      <ErrorBoundary name="router">
        <Routes>
          <Route path="/" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${safeNiche}`} replace />} />
          {/* The marketing directory lives on swishflip.co.uk; these permanent paths open
              the matching workspace in this same app instance and use the existing backend. */}
          <Route path="/coins" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/mx" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/bikes" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/threads" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/clothes" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/surplus" element={<Navigate to={entryWorkspace} replace />} />
          <Route path="/electronics" element={<Navigate to={needsOnboarding ? "/onboarding" : "/workspace/coins"} replace />} />
          <Route path="/games" element={<Navigate to={needsOnboarding ? "/onboarding" : "/workspace/coins"} replace />} />
          <Route path="/home" element={<Navigate to={needsOnboarding ? "/onboarding" : "/workspace/coins"} replace />} />
          <Route path="/workspace/:niche" element={<NicheWorkspace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/niches" element={<NicheEntry />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/command-centre" element={<CommandCentre />} />

          {/* Inventory — /inventory/new BEFORE /inventory/:id to avoid "new" being treated as UUID */}
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/stock-check" element={<StockCheck />} />
          <Route path="/inventory/new" element={<InventoryNew />} />
          <Route path="/inventory/:id" element={<InventoryItem />} />

          <Route path="/identify" element={<Navigate to={(() => { const active = isOwner ? (localStorage.getItem('swish_active_niche') || safeNiche) : safeNiche; return active === 'coins' ? '/identify/coins' : `/scan/${active === 'bicycles' ? 'bikes' : active === 'motocross' ? 'mx' : active}`; })()} replace />} />
          <Route path="/identify/coins" element={<Identify />} />
          <Route path="/scan/:niche" element={<NicheCapture />} />
          <Route path="/acquisitions" element={<Acquisitions />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/review-required" element={<ReviewRequired />} />
          <Route path="/audit" element={<Audit />} />

          {/* Selling — /listings/new BEFORE /listings/:id */}
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/new" element={<ListingNew />} />
          <Route path="/listings/:id" element={<ListingEditor />} />

          <Route path="/orders" element={<Orders />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/repricing" element={<Repricing />} />

          {/* Analytics */}
          <Route path="/insights" element={<Insights />} />
          <Route path="/money" element={<Money />} />

          {/* Tasks */}
          <Route path="/tasks" element={<Tasks />} />

          {/* eBay */}
          <Route path="/ebay" element={<EbayHub />} />
          <Route path="/ebay/listings" element={<EbayListings />} />
          <Route path="/ebay/orders" element={<EbayOrders />} />
          <Route path="/ebay/messages" element={<EbayMessages />} />
          <Route path="/ebay/offers" element={<EbayOffers />} />
          <Route path="/ebay/returns" element={<EbayReturns />} />
          <Route path="/ebay/cases" element={<EbayCases />} />
          <Route path="/ebay/finances" element={<EbayFinances />} />
          <Route path="/ebay/analytics" element={<EbayAnalytics />} />
          <Route path="/ebay/import" element={<EbayImport />} />
          <Route path="/ebay/logs" element={<EbayLogs />} />

          {/* Current app specialist tools / parity */}
          <Route path="/tools" element={<ParityTools />} />
          <Route path="/tools/islamic-batch" element={<SpecialistTools />} />
          <Route path="/tools/silver-batch" element={<SpecialistTools />} />
          <Route path="/tools/bike-flipper" element={<Navigate to="/scan/bikes" replace />} />
          <Route path="/tools/listing-preflight" element={<Listings />} />

          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/master-admin" element={<MasterAdmin />} />
          {/* Accept an explicit trailing slash as well on hosts that preserve it. */}
          <Route path="/master-admin/" element={<MasterAdmin />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" />
      <BrowserRouter>
        <ErrorBoundary name="app">
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
