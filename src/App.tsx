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
import EbayAccount from '@/pages/EbayAccount';
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
import NicheComingSoon from '@/components/features/NicheComingSoon';
import { getHostProduct, getRouteProduct } from '@/lib/productContext';
import { normaliseNicheId } from '@/lib/niche';

const currentHostname = window.location.hostname.toLowerCase().replace(/^www\./, '').split(':')[0];
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false }, mutations: { retry: 0 } } });
const ENTRY_PATHS = ['/coins', '/mx', '/bikes', '/threads', '/clothes', '/surplus', '/cards', '/games', '/antiques', '/home', '/fossils', '/beauty', '/tech', '/electronics', '/tunes', '/tunes-flip', '/tunes_flip', '/music', '/vinyl_records', '/collectibles', '/collectibles-flipper', '/collectibles_flipper'];

function AppRoutes() {
  const { connectionStatus, loading, user } = useAuth();
  const location = useLocation();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const hostProduct = getHostProduct();
  if (currentHostname === 'swishflip.co.uk' && location.pathname === '/') return <SwishFlipHome />;
  if (currentHostname.endsWith('.swishflip.co.uk') && !hostProduct) return <NicheComingSoon />;
  const preferredNiche = String(localStorage.getItem('swish_active_niche') || user?.user_metadata?.preferred_niche || 'coins');
  const workspaceNiche = normaliseNicheId(location.pathname.match(/^\/workspace\/([^/]+)/)?.[1]);
  const safeNiche = hostProduct?.id || workspaceNiche || getRouteProduct(location.pathname)?.id || normaliseNicheId(preferredNiche) || 'coins';
  const needsOnboarding = !isOwner && user?.user_metadata?.onboarding_status === 'started';
  const entryWorkspace = needsOnboarding ? '/onboarding' : `/workspace/${safeNiche}`;
  if (connectionStatus === 'initialising' || (loading && connectionStatus === 'connected')) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background"><Loader2 className="h-7 w-7 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Connecting to SWISH…</span></div>;
  if (!user) return <LoginPage />;
  // Hostnames select presentation, never grant backend authorization.
  if (hostProduct && !isOwner) {
    const path = location.pathname;
    const commonAllowed = path === '/' || path === '/onboarding' || path.startsWith('/workspace/') || path === '/identify' || path.startsWith('/identify/') || path.startsWith('/scan/') || path.startsWith('/inventory') || path.startsWith('/listings') || path.startsWith('/orders') || path.startsWith('/dispatch') || path.startsWith('/repricing') || path.startsWith('/insights') || path.startsWith('/money') || path.startsWith('/ebay') || path.startsWith('/settings') || path === '/404';
    const coinOnly = path.startsWith('/acquisitions') || path.startsWith('/opportunities') || path.startsWith('/review-required') || path.startsWith('/audit') || path.startsWith('/tools') || path.startsWith('/command-centre') || path.startsWith('/dashboard') || path.startsWith('/tasks');
    if (!commonAllowed || (hostProduct.id !== 'coins' && coinOnly)) return <Navigate to={`/workspace/${hostProduct.id}`} replace />;
  }
  return <AppLayout key={`${user.id}:${safeNiche}`}><ErrorBoundary name="router"><Routes>
    <Route path="/" element={<Navigate to={entryWorkspace} replace />} />
    {ENTRY_PATHS.map(path => <Route key={path} path={path} element={<Navigate to={entryWorkspace} replace />} />)}
    <Route path="/workspace/:niche" element={<NicheWorkspace />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/niches" element={<NicheEntry />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/command-centre" element={<CommandCentre />} />
    <Route path="/inventory" element={<Inventory />} />
    <Route path="/stock-check" element={<StockCheck />} />
    <Route path="/inventory/new" element={<InventoryNew />} />
    <Route path="/inventory/:id" element={<InventoryItem />} />
    <Route path="/identify" element={<Navigate to={safeNiche === 'coins' ? '/identify/coins' : `/scan/${safeNiche === 'bicycles' ? 'bikes' : safeNiche === 'motocross' ? 'mx' : safeNiche}`} replace />} />
    <Route path="/identify/coins" element={<Identify />} />
    <Route path="/scan/:niche" element={<NicheCapture />} />
    <Route path="/acquisitions" element={<Acquisitions />} />
    <Route path="/opportunities" element={<Opportunities />} />
    <Route path="/review-required" element={<ReviewRequired />} />
    <Route path="/audit" element={<Audit />} />
    <Route path="/listings" element={<Listings />} />
    <Route path="/listings/new" element={<ListingNew />} />
    <Route path="/listings/:id" element={<ListingEditor />} />
    <Route path="/orders" element={<Orders />} />
    <Route path="/dispatch" element={<Dispatch />} />
    <Route path="/repricing" element={<Repricing />} />
    <Route path="/insights" element={<Insights />} />
    <Route path="/money" element={<Money />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/ebay" element={<EbayHub />} />
    <Route path="/ebay/account" element={<EbayAccount />} />
    <Route path="/ebay/admin" element={<MasterAdmin />} />
    <Route path="/ebay/categories" element={<EbayHub />} />
    <Route path="/ebay/csv" element={<EbayImport />} />
    <Route path="/ebay/draft-sync-test" element={<EbayLogs />} />
    <Route path="/stock-listing/:id" element={<InventoryItem />} />
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
    <Route path="/tools" element={<ParityTools />} />
    <Route path="/tools/islamic-batch" element={<SpecialistTools />} />
    <Route path="/tools/silver-batch" element={<SpecialistTools />} />
    <Route path="/tools/bike-flipper" element={<Navigate to="/scan/bikes" replace />} />
    <Route path="/tools/listing-preflight" element={<Listings />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/master-admin" element={<MasterAdmin />} />
    <Route path="/master-admin/" element={<MasterAdmin />} />
    <Route path="*" element={<NotFound />} />
  </Routes></ErrorBoundary></AppLayout>;
}

const App = () => <QueryClientProvider client={queryClient}><TooltipProvider><Toaster /><Sonner position="bottom-right" /><BrowserRouter><ErrorBoundary name="app"><AuthProvider><AppRoutes /></AuthProvider></ErrorBoundary></BrowserRouter></TooltipProvider></QueryClientProvider>;
export default App;
