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
import NotFound from '@/pages/NotFound';
import { getHostProduct } from '@/lib/productContext';

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
  const preferredNiche = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const safeNiche = hostProduct?.id || (['coins', 'motocross', 'bicycles', 'clothing', 'surplus_flip'].includes(preferredNiche) ? preferredNiche : 'coins');
  const needsOnboarding = !isOwner && user?.user_metadata?.onboarding_status === 'started';

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

  // A product domain cannot be used to silently switch an account's niche.
  // Existing backend entitlement metadata must agree with the requested product.
  if (hostProduct && !isOwner && String(user.user_metadata?.preferred_niche || '') !== hostProduct.id) {
    return <main className="min-h-screen flex items-center justify-center bg-background p-6"><section className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-2xl font-bold">Product access needs attention</h1><p className="mt-3 text-sm text-muted-foreground">This account is not currently assigned to {hostProduct.name}. Please contact support to correct the existing product entitlement. No other product workspace has been opened.</p></section></main>;
  }

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
          <Route path="/coins" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'coins' : safeNiche}`} replace />} />
          <Route path="/mx" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'motocross' : safeNiche}`} replace />} />
          <Route path="/bikes" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'bicycles' : safeNiche}`} replace />} />
          <Route path="/threads" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'clothing' : safeNiche}`} replace />} />
          <Route path="/clothes" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'clothing' : safeNiche}`} replace />} />
          <Route path="/surplus" element={<Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${isOwner ? 'surplus_flip' : safeNiche}`} replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/niches" element={isOwner ? <NicheEntry /> : <Navigate to={needsOnboarding ? "/onboarding" : `/workspace/${safeNiche}`} replace />} />
          <Route path="/workspace/:niche" element={<NicheWorkspace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/command-centre" element={<CommandCentre />} />

          {/* Inventory — /inventory/new BEFORE /inventory/:id to avoid "new" being treated as UUID */}
          <Route path="/inventory" element={<Inventory />} />
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
          <Route path="/tools/islamic-batch" element={<ParityTools />} />
          <Route path="/tools/silver-batch" element={<ParityTools />} />
          <Route path="/tools/bike-flipper" element={<ParityTools />} />
          <Route path="/tools/listing-preflight" element={<ParityTools />} />

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
