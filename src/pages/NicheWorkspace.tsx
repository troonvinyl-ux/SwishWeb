import { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, Bike, Camera, CheckCircle2, Coins, Gem, Grid2X2, ImagePlus,
  Package, Palette, ScanLine, Shirt, ShoppingCart, Smartphone, Sparkles,
  Store, Tag, Trophy, Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useCount } from '@/hooks/useSupabaseQuery';
import { getSpecialistIdsForNiche, type SwishNicheId } from '@/lib/niche';
import coinArtwork from '@/assets/niches/coin-flipper.webp';
import mxArtwork from '@/assets/niches/mx-flipper.webp';
import bikeArtwork from '@/assets/niches/bike-flipper.svg';
import threadsArtwork from '@/assets/niches/threads-flip.svg';
import cardArtwork from '@/assets/niches/card-flipper.svg';
import antiqueArtwork from '@/assets/niches/antique-flipper.svg';
import fossilArtwork from '@/assets/niches/fossil-flipper.webp';
import beautyArtwork from '@/assets/niches/beauty-flipper.webp';
import techArtwork from '@/assets/niches/tech-flipper.webp';

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
  const preferred = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const config = useMemo(() => CONFIGS[niche as SwishNicheId] || CONFIGS.coins, [niche]);
  const allowedNiche = CONFIGS[preferred as SwishNicheId] ? preferred : 'coins';
  const specialists = getSpecialistIdsForNiche(config.id);
  const queryReady = Boolean(tenantId) && specialists.length > 0;
  const inventory = useCount('items', { tenant_id: tenantId }, { specialist_id: specialists }, queryReady);
  const sold = useCount('items', { tenant_id: tenantId, status: 'sold' }, { specialist_id: specialists }, queryReady);
  const listed = useCount('items', { tenant_id: tenantId, status: 'listed' }, { specialist_id: specialists }, queryReady);
  const Icon = config.icon;
  const number = (value: number | undefined) => tenantLoading || !queryReady ? '—' : value ?? '—';

  useEffect(() => {
    if (isOwner || config.id === allowedNiche) activateWorkspace(config);
  }, [allowedNiche, config, isOwner]);

  if (!isOwner && config.id !== allowedNiche) return <Navigate to={`/workspace/${allowedNiche}`} replace />;

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
        <div><strong>{number(listed.data)}</strong><span>Live</span></div>
        <div><strong>{number(sold.data)}</strong><span>Sold</span></div>
      </section>

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

