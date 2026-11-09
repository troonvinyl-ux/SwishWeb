import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, Bike, Camera, CheckCircle2, Coins, Gem, Grid2X2, ImagePlus,
  Package, Palette, ScanLine, Shirt, ShoppingCart, Smartphone, Sparkles,
  Store, Tag, Trophy, Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useCount, useTable } from '@/hooks/useSupabaseQuery';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { getSpecialistIdsForNiche, normaliseNicheId, type SwishNicheId } from '@/lib/niche';
import coinArtwork from '@/assets/niches/coin-flipper.webp';
import mxArtwork from '@/assets/niches/mx-flipper.webp';
import bikeArtwork from '@/assets/niches/bike-flipper.svg';
import threadsArtwork from '@/assets/niches/threads-flip.svg';
import cardArtwork from '@/assets/niches/card-flipper.svg';
import antiqueArtwork from '@/assets/niches/antique-flipper.svg';
import fossilArtwork from '@/assets/niches/fossil-flipper.webp';
import beautyArtwork from '@/assets/niches/beauty-flipper.webp';
import techArtwork from '@/assets/niches/tech-flipper.webp';
import swishHero from '@/assets/swish-hero.jpg';

type Action = { label: string; detail: string; icon: LucideIcon; to: string };
type WorkspaceConfig = {
  id: SwishNicheId;
  name: string;
  shortName: string;
  headline: string;
  detail: string;
  accent: string;
  artwork: string;
  icon: LucideIcon;
  scan: string;
  actions: Action[];
  guidance: string;
};

const standardActions = (scan: string, item: string, icon: LucideIcon): Action[] => [
  { label: scan, detail: `Capture and identify a ${item.toLowerCase()}.`, icon: ScanLine, to: '/identify' },
  { label: 'My Inventory', detail: `Review saved ${item.toLowerCase()}s and work in progress.`, icon: Package, to: '/inventory' },
  { label: 'eBay Hub', detail: 'Create drafts, publish listings and monitor sales.', icon: Store, to: '/ebay' },
  { label: 'Orders', detail: 'Track sold items and fulfilment.', icon: ShoppingCart, to: '/orders' },
  { label: 'List & Sell', detail: 'Prepare a listing with your specialist evidence.', icon: Tag, to: '/listings' },
  { label: 'Market insights', detail: 'Review opportunities, value and demand.', icon, to: '/insights' },
];

const CONFIGS: Record<SwishNicheId, WorkspaceConfig> = {
  coins: {
    id: 'coins', name: 'SWISH Coins', shortName: 'Coins', headline: 'Know what you hold before you list it.',
    detail: 'Ancient · Islamic silver · world · banknotes · gold', accent: '#F5C842', artwork: coinArtwork, icon: Coins, scan: 'Scan Coin',
    actions: [
      { label: 'Scan Coin', detail: 'Capture a coin and check specialist references.', icon: ScanLine, to: '/identify' },
      { label: 'My Coin Inventory', detail: 'Review saved coins and references.', icon: Package, to: '/inventory' },
      { label: 'Islamic Silver', detail: 'Process silver and countermark batches.', icon: Sparkles, to: '/tools/islamic-batch' },
      { label: 'eBay Hub', detail: 'Create, publish and monitor listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Manage sales and dispatch.', icon: ShoppingCart, to: '/orders' },
      { label: 'List & Sell', detail: 'Prepare a listing with evidence.', icon: Tag, to: '/listings' },
    ],
    guidance: 'Photograph obverse and reverse, then add any visible date, mint, inscription or edge detail.',
  },
  motocross: {
    id: 'motocross', name: 'SWISH MX', shortName: 'MX', headline: 'Buy smarter. Prep with confidence. Flip faster.',
    detail: 'Motocross · enduro · trail bikes · parts · riding gear', accent: '#EF4444', artwork: mxArtwork, icon: Wrench, scan: 'Identify Bike',
    actions: [
      { label: 'Identify Bike', detail: 'Start a bike or parts assessment.', icon: ScanLine, to: '/identify' },
      { label: 'Workshop Stock', detail: 'Review bikes, parts and projects.', icon: Package, to: '/inventory' },
      { label: 'Acquisition Calculator', detail: 'Estimate prep costs and potential margin.', icon: Wrench, to: '/opportunities' },
      { label: 'eBay Hub', detail: 'Create and manage marketplace listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Track completed sales and fulfilment.', icon: ShoppingCart, to: '/orders' },
      { label: 'List & Sell', detail: 'Prepare an honest, evidence-led listing.', icon: Tag, to: '/listings' },
    ],
    guidance: 'Start with a full side profile, then capture the VIN, engine, frame badge and any damage or wear.',
  },
  bicycles: {
    id: 'bicycles', name: 'SWISH Bikes', shortName: 'Bikes', headline: 'See the build. Know the value. Make the flip.',
    detail: 'Road · mountain · gravel · hybrid · BMX · e-bikes', accent: '#22C55E', artwork: bikeArtwork, icon: Bike, scan: 'Identify Bike',
    actions: [
      { label: 'Identify Bike', detail: 'Assess a bike, frame and components.', icon: ScanLine, to: '/identify' },
      { label: 'My Bikes', detail: 'Review bikes, parts and projects.', icon: Package, to: '/inventory' },
      { label: 'Parts & Repairs', detail: 'Open the bike-flipper specialist flow.', icon: Wrench, to: '/tools/bike-flipper' },
      { label: 'eBay Hub', detail: 'Create, publish and manage listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Track sales and fulfilment.', icon: ShoppingCart, to: '/orders' },
      { label: 'List & Sell', detail: 'Prepare a bike listing with evidence.', icon: Tag, to: '/listings' },
    ],
    guidance: 'Photograph both sides, frame badge, groupset and any wear before you value or list a bike.',
  },
  clothing: {
    id: 'clothing', name: 'SWISH Clothing', shortName: 'Clothing', headline: 'Turn fashion knowledge into opportunity.',
    detail: 'Vintage · designer · streetwear · trainers · pre-loved', accent: '#EC4899', artwork: threadsArtwork, icon: Shirt, scan: 'Identify Item',
    actions: standardActions('Identify Item', 'clothing item', Shirt),
    guidance: 'Capture front, back, every label and any flaw. Clear provenance helps buyers trust the listing.',
  },
  trading_cards: {
    id: 'trading_cards', name: 'SWISH Cards', shortName: 'Cards', headline: 'Identify the card. Protect the grade. Price with confidence.',
    detail: 'Pokémon · sports · TCG · sets · rarity · condition', accent: '#FACC15', artwork: cardArtwork, icon: Trophy, scan: 'Scan Card',
    actions: standardActions('Scan Card', 'card', Trophy),
    guidance: 'Capture the front, back, corners and surface under even light before you estimate condition.',
  },
  antiques: {
    id: 'antiques', name: 'SWISH Antiques', shortName: 'Antiques', headline: 'Find the story. Establish the value. Sell with proof.',
    detail: 'Ceramics · furniture · silver · art · decorative arts', accent: '#D8AD52', artwork: antiqueArtwork, icon: Grid2X2, scan: 'Identify Item',
    actions: standardActions('Identify Item', 'antique', Grid2X2),
    guidance: 'Photograph the whole piece, reverse or underside, maker marks and every point of restoration or damage.',
  },
  fossils: {
    id: 'fossils', name: 'SWISH Fossils', shortName: 'Fossils', headline: 'Put a name, period and value to every specimen.',
    detail: 'Fossils · minerals · specimens · provenance · scale', accent: '#8B5CF6', artwork: fossilArtwork, icon: Gem, scan: 'Identify Fossil',
    actions: standardActions('Identify Fossil', 'specimen', Gem),
    guidance: 'Use a clear main view, show the matrix and include a scale reference with any provenance label.',
  },
  beauty: {
    id: 'beauty', name: 'SWISH Beauty', shortName: 'Beauty', headline: 'Source safely. Check details. Sell with clarity.',
    detail: 'Fragrance · skincare · cosmetics · batch codes · seals', accent: '#F472B6', artwork: beautyArtwork, icon: Palette, scan: 'Identify Product',
    actions: standardActions('Identify Product', 'beauty product', Palette),
    guidance: 'Capture front and back labels, batch code, expiry detail and every seal or packaging condition.',
  },
  tech: {
    id: 'tech', name: 'Tech Flipper', shortName: 'Tech', headline: 'Know the model, condition and resale potential before you flip.',
    detail: 'Phones · consoles · gadgets · accessories · tested stock', accent: '#06B6D4', artwork: techArtwork, icon: Smartphone, scan: 'Identify Device',
    actions: standardActions('Identify Device', 'device', Smartphone),
    guidance: 'Photograph the model label, ports, supplied accessories and a powered-on screen without exposing private data.',
  },
  surplus_flip: {
    id: 'surplus_flip', name: 'Surplus Flip', shortName: 'Surplus', headline: 'Turn a job lot into a structured, sellable catalogue.',
    detail: 'Job lots · pallets · wholesale · returns · manifests', accent: '#14B8A6', artwork: techArtwork, icon: Package, scan: 'Match Product',
    actions: [
      { label: 'Import Manifest', detail: 'Bring supplier lines into SWISH.', icon: ImagePlus, to: '/tools' },
      { label: 'Match Product Photo', detail: 'Identify product and packaging.', icon: ScanLine, to: '/identify' },
      { label: 'My Stock', detail: 'Check quantities and saved stock.', icon: Package, to: '/inventory' },
      { label: 'eBay Hub', detail: 'Create and manage marketplace listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Manage order fulfilment.', icon: ShoppingCart, to: '/orders' },
      { label: 'List & Sell', detail: 'Prepare marketplace listings.', icon: Tag, to: '/listings' },
    ],
    guidance: 'Select the manifest line first, then capture barcode, packaging, condition and sellable quantity.',
  },
  tunes_flip: {
    id: 'tunes_flip', name: 'Tunes Flip', shortName: 'Music', headline: 'Find the exact pressing. Describe it with confidence. Sell the right release.',
    detail: 'Vinyl · singles · CDs · cassettes · box sets · pressings', accent: '#A855F7', artwork: swishHero, icon: Sparkles, scan: 'Identify Music',
    actions: [
      { label: 'Identify Music', detail: 'Capture a release, labels and its catalogue detail.', icon: ScanLine, to: '/identify' },
      { label: 'Music Research', detail: 'Review market signals and opportunity context.', icon: Sparkles, to: '/insights' },
      { label: 'My Collection', detail: 'Review saved releases and condition evidence.', icon: Package, to: '/inventory' },
      { label: 'eBay Hub', detail: 'Create, publish and monitor music listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Track sales and dispatch.', icon: ShoppingCart, to: '/orders' },
      { label: 'List & Sell', detail: 'Prepare a release listing with evidence.', icon: Tag, to: '/listings' },
    ],
    guidance: 'Photograph front and rear packaging, labels or disc face, barcode and catalogue number. Capture matrix or runout detail where applicable, record media and sleeve condition separately, and show inserts, marks, warps, seam splits or missing parts. Confirm the exact pressing where possible; photos alone do not prove playback quality.',
  },
  collectibles: {
    id: 'collectibles', name: 'Collectibles Flipper', shortName: 'Collectibles', headline: 'Capture the details collectors care about before you price the find.',
    detail: 'Toys · comics · games · memorabilia · vintage finds', accent: '#F97316', artwork: swishHero, icon: Package, scan: 'Scan Barcode',
    actions: [
      { label: 'Quick List', detail: 'Capture an item and start a practical resale record.', icon: Camera, to: '/identify' },
      { label: 'Scan Barcode', detail: 'Scan packaging or labels where a barcode is available.', icon: ScanLine, to: '/identify' },
      { label: 'Inventory', detail: 'Review collectibles, accessories and condition evidence.', icon: Package, to: '/inventory' },
      { label: 'Research', detail: 'Review market signals and opportunity context.', icon: Sparkles, to: '/insights' },
      { label: 'eBay Hub', detail: 'Create, publish and monitor listings.', icon: Store, to: '/ebay' },
      { label: 'Orders', detail: 'Track sold collectibles and dispatch.', icon: ShoppingCart, to: '/orders' },
    ],
    guidance: 'Photograph the complete item, packaging, edition numbers, labels, stamps and maker marks. Show accessories, completeness and missing parts; record damage, repairs, wear or restoration. Include dimensions or scale where useful, and retain provenance or collection information when available.',
  },
};

const OWNER_EMAIL = 'troonvinyl@gmail.com';

function activateWorkspace(config: WorkspaceConfig) {
  localStorage.setItem('swish_active_niche', config.id);
  localStorage.setItem('swish_active_niche_name', config.name);
  document.documentElement.dataset.niche = config.id;
}

export default function NicheWorkspace() {
  const { niche = 'coins' } = useParams();
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const canonicalRouteNiche = normaliseNicheId(niche);
  // An unknown route must never borrow the Coins dashboard. It is surfaced
  // explicitly through the niche selector rather than misrepresenting data.
  const config = useMemo(() => canonicalRouteNiche ? CONFIGS[canonicalRouteNiche] : undefined, [canonicalRouteNiche]);
  const specialists = config ? getSpecialistIdsForNiche(config.id) : [];
  const { data: activeSpecialists = [], isLoading: entitlementsLoading, error: entitlementsError, refetch: refetchEntitlements } = useQuery({
    queryKey: ['workspace_niche_entitlements', tenantId],
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
  const firstEntitledNiche = useMemo(() => (Object.keys(CONFIGS) as SwishNicheId[]).find(candidate =>
    getSpecialistIdsForNiche(candidate).some(specialist => activeSpecialists.includes(specialist)),
  ), [activeSpecialists]);
  const nicheAllowed = Boolean(config) && (isOwner || specialists.some(specialist => activeSpecialists.includes(specialist)));
  // Tenant, niche and entitlement resolution all complete before a data query
  // starts. Browser storage remains a visual preference, never authorisation.
  const queryReady = Boolean(tenantId) && nicheAllowed && specialists.length > 0;
  const inventory = useCount('items', { tenant_id: tenantId }, { specialist_id: specialists }, queryReady);
  const sold = useCount('items', { tenant_id: tenantId, status: 'sold' }, { specialist_id: specialists }, queryReady);
  const liveListings = useTable('listings', {
    select: 'id, status, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: { 'items.specialist_id': specialists },
    enabled: queryReady,
  });
  const live = ((liveListings.data || []) as Record<string, unknown>[]).filter(listing =>
    ['active', 'live'].includes(String(listing.status || '').toLowerCase()),
  ).length;
  const metricsLoading = tenantLoading || (!isOwner && entitlementsLoading) || inventory.isLoading || sold.isLoading || liveListings.isLoading;
  const metricsError = liveListings.error;
  const Icon = config?.icon || Package;
  const number = (value: number | undefined) => metricsError ? 'Unavailable' : metricsLoading || !queryReady ? '—' : value ?? '—';

  useEffect(() => {
    if (config && nicheAllowed) activateWorkspace(config);
  }, [config, nicheAllowed]);

  if (!config) return <Navigate to="/niches" replace />;
  if (!isOwner && !tenantLoading && !entitlementsLoading && entitlementsError) {
    return <div role="alert" className="swish-card max-w-xl p-6"><h1 className="text-xl font-bold">Workspace access could not be verified</h1><p className="mt-2 text-sm text-muted-foreground">We have not loaded any specialist data. Check your connection and retry before opening this workspace.</p><button type="button" className="btn-secondary mt-4" onClick={() => void refetchEntitlements()}>Retry access check</button></div>;
  }
  if (!isOwner && !tenantLoading && !entitlementsLoading && !nicheAllowed) {
    if (firstEntitledNiche) return <Navigate to={`/workspace/${firstEntitledNiche}`} replace />;
    return <div className="swish-card max-w-xl p-6"><h1 className="text-xl font-bold">No specialist workspace is available</h1><p className="mt-2 text-sm text-muted-foreground">Your tenant does not currently include access to this specialist workspace. Ask the workspace owner to assign a specialist before trying again.</p><Link to="/settings" className="btn-secondary mt-4">Account settings</Link></div>;
  }

  return (
    <div className="native-workspace" style={{ '--workspace-accent': config.accent } as React.CSSProperties}>
      <Link to="/identify" className="native-workspace-quick-list">
        <span className="native-workspace-quick-icon"><Camera /></span>
        <span className="min-w-0 flex-1"><strong>Quick List · {config.scan}</strong><small>Capture to eBay from one workspace</small></span>
        <ArrowRight className="native-workspace-quick-arrow" />
      </Link>

      <header className="native-workspace-heading">
        <span className="native-workspace-heading-icon"><Icon /></span>
        <span className="min-w-0">
          <small>SWISH / SPECIALIST WORKSPACE</small>
          <h1>{config.name}</h1>
        </span>
        <Link to="/niches" className="native-workspace-switch">Switch <span>↗</span></Link>
      </header>

      <section className="native-workspace-banner">
        <img src={config.artwork} alt="" aria-hidden="true" />
        <div className="native-workspace-banner-overlay" />
        <div className="native-workspace-banner-copy">
          <p>{config.headline}</p>
          <span>{config.detail}</span>
        </div>
      </section>

      <section className="native-workspace-metrics" aria-label={`${config.shortName} workspace summary`}>
        <div><strong>{number(inventory.data)}</strong><span>Inventory</span></div>
        <div><strong>{number(live)}</strong><span>Live</span></div>
        <div><strong>{number(sold.data)}</strong><span>Sold</span></div>
      </section>
      {metricsError && <div role="alert" className="native-workspace-guidance"><CheckCircle2 /><span><strong>Workspace totals are temporarily unavailable</strong><small>{metricsError instanceof Error ? metricsError.message : 'We could not load live marketplace data.'} <button type="button" onClick={() => void liveListings.refetch()} className="underline">Retry</button></small></span></div>}

      <div className="native-workspace-section-heading">
        <span>YOUR {config.shortName.toUpperCase()} WORKSPACE</span>
        <p>Choose what you want to do next.</p>
      </div>

      <section className="native-workspace-actions" aria-label={`${config.shortName} tools`}>
        {config.actions.map(action => {
          const ActionIcon = action.icon;
          return <Link key={action.label} to={action.to} className="native-workspace-action">
            <span className="native-workspace-action-icon"><ActionIcon /></span>
            <span className="native-workspace-action-copy"><strong>{action.label}</strong><small>{action.detail}</small></span>
            <ArrowRight className="native-workspace-action-arrow" />
          </Link>;
        })}
      </section>

      <aside className="native-workspace-guidance">
        <CheckCircle2 />
        <span><strong>Capture with confidence</strong><small>{config.guidance}</small></span>
      </aside>
    </div>
  );
}

