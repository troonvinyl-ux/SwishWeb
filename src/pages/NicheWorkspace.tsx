import { useEffect, useMemo } from 'react';
import { useCount } from '@/hooks/useSupabaseQuery';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getSpecialistIdsForNiche, type SwishNicheId } from '@/lib/niche';
import { ArrowLeft, Search, Camera, Package, Tag, ShoppingCart, BarChart3, Wrench, Sparkles, Coins, Bike, Shirt, Lightbulb, Store, ScanLine } from 'lucide-react';

type Action = { label: string; detail: string; icon: typeof Coins; to: string };
type WorkspaceConfig = {
  id: string; name: string; tagline: string; detail: string; accent: string;
  icon: typeof Coins; scan: string; actions: Action[];
};

const CONFIGS: Record<string, WorkspaceConfig> = {
  coins: { id: 'coins', name: 'SWISH Coins', tagline: 'Identify, value and flip coins & collectibles', detail: 'Ancient · Islamic silver · banknotes · gold', accent: '#F5C842', icon: Coins, scan: 'Scan Coin', actions: [
    { label: 'Scan Coin', detail: 'Identify a coin and check references', icon: Camera, to: '/identify' },
    { label: 'My Stock', detail: 'Review saved coins and references', icon: Package, to: '/inventory' },
    { label: 'Islamic Silver', detail: 'Process specialist silver and countermark batches', icon: Sparkles, to: '/tools/islamic-batch' },
    { label: 'Value Opportunities', detail: 'Review valuations and buying opportunities', icon: BarChart3, to: '/opportunities' },
    { label: 'List & Sell', detail: 'Prepare and manage coin listings', icon: Tag, to: '/listings' },
    { label: 'Orders & Dispatch', detail: 'Manage orders and fulfilment', icon: ShoppingCart, to: '/orders' },
  ] },
  motocross: { id: 'motocross', name: 'SWISH MX', tagline: 'Buy, prep and flip motocross & off-road bikes', detail: 'Motocross · enduro · trail bikes · parts', accent: '#EF4444', icon: Wrench, scan: 'Identify Bike', actions: [
    { label: 'Identify Bike', detail: 'Start a bike or parts assessment', icon: Camera, to: scanRoute },
    { label: 'Workshop Stock', detail: 'Review bikes, parts and projects', icon: Package, to: '/inventory' },
    { label: 'Acquisition Calculator', detail: 'Estimate prep costs and margin', icon: Wrench, to: '/opportunities' },
    { label: 'List & Sell', detail: 'Prepare listings for sale', icon: Tag, to: '/listings' },
    { label: 'Orders & Dispatch', detail: 'Track completed sales', icon: ShoppingCart, to: '/orders' },
  ] },
  bicycles: { id: 'bicycles', name: 'SWISH Bikes', tagline: 'Identify, value and flip bicycles', detail: 'Road · mountain · gravel · hybrid · BMX · e-bikes', accent: '#22C55E', icon: Bike, scan: 'Identify Bike', actions: [
    { label: 'Identify Bike', detail: 'Assess a bike, frame and components', icon: Camera, to: scanRoute },
    { label: 'My Bikes', detail: 'Review saved bikes and projects', icon: Package, to: '/inventory' },
    { label: 'Parts & Repairs', detail: 'Open bike-flipper specialist tools', icon: Wrench, to: '/tools/bike-flipper' },
    { label: 'Profit Opportunities', detail: 'Compare potential acquisitions', icon: BarChart3, to: '/opportunities' },
    { label: 'List & Sell', detail: 'Prepare listings and manage stock', icon: Tag, to: '/listings' },
    { label: 'Orders & Dispatch', detail: 'Track sales and fulfilment', icon: ShoppingCart, to: '/orders' },
  ] },
  clothing: { id: 'clothing', name: 'Threads Flip', tagline: 'Turn fashion into opportunity.', detail: 'Vintage · designer · streetwear · high street', accent: '#E91E8C', icon: Shirt, scan: 'Scan Item', actions: [
    { label: 'Scan Item', detail: 'Capture and identify clothing, brand and era', icon: Camera, to: scanRoute },
    { label: 'My Wardrobe', detail: 'Review your clothing inventory', icon: Package, to: '/inventory' },
    { label: 'Brands', detail: 'Explore brands and authentication checks', icon: Shirt, to: '/identify' },
    { label: 'List & Sell', detail: 'Prepare fashion listings', icon: Tag, to: '/listings' },
    { label: 'Profits', detail: 'Track margins and realised sales', icon: BarChart3, to: '/money' },
    { label: 'Insights', detail: 'Review market and style insights', icon: Lightbulb, to: '/insights' },
  ] },
  surplus_flip: { id: 'surplus_flip', name: 'Surplus Flip', tagline: 'Turn job lots and pallet manifests into eBay listings', detail: 'Job lots · pallets · wholesale · returns', accent: '#14B8A6', icon: Package, scan: 'Match Product', actions: [
    { label: 'Import Manifest', detail: 'Bring a supplier manifest into SWISH', icon: Package, to: '/tools' },
    { label: 'Match Product Photo', detail: 'Identify product and packaging', icon: Camera, to: '/identify' },
    { label: 'My Stock', detail: 'Check quantities and saved stock', icon: Package, to: '/inventory' },
    { label: 'Value Opportunities', detail: 'Review margin and buying opportunities', icon: BarChart3, to: '/opportunities' },
    { label: 'List & Sell', detail: 'Prepare marketplace listings', icon: Tag, to: '/listings' },
    { label: 'Orders & Dispatch', detail: 'Manage order fulfilment', icon: ShoppingCart, to: '/orders' },
  ] },
};

const CLOTHING_CATEGORIES = [
  { label: 'Vintage', detail: 'Pre-1995 · Deadstock' },
  { label: 'Designer', detail: 'Luxury · Authentication' },
  { label: 'Streetwear', detail: 'Supreme · Nike · Brands' },
  { label: 'High Street', detail: 'M&S · Zara · Next' },
  { label: 'Sustainable', detail: 'Pre-loved · Circular' },
  { label: 'Trainers', detail: 'Sneakers · Deadstock · Auth' },
  { label: 'Accessories', detail: 'Bags · Belts · Hats' },
  { label: 'Sportswear', detail: 'Activewear · Athleisure' },
];
const BRAND_NAMES = ["Levi's", 'Nike', 'Carhartt', 'Ralph Lauren', 'Stone Island', 'The North Face', 'Adidas', 'Burberry', 'Prada', 'Supreme'];

function setActiveNiche(config: WorkspaceConfig) {
  localStorage.setItem('swish_active_niche', config.id);
  localStorage.setItem('swish_active_niche_name', config.name);
  document.documentElement.dataset.niche = config.id;
}

export default function NicheWorkspace() {
  const { niche = 'coins' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const preferred = String((isOwner ? localStorage.getItem('swish_active_niche') : user?.user_metadata?.preferred_niche) || user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const allowedNiche = ['coins', 'motocross', 'bicycles', 'clothing', 'surplus_flip'].includes(preferred) ? preferred : 'coins';
  const config = useMemo(() => CONFIGS[niche] || CONFIGS.coins, [niche]);
  const BrandIcon = config.icon;
  const scanRoute = config.id === 'coins' ? '/identify/coins' : `/scan/${config.id === 'bicycles' ? 'bikes' : config.id === 'motocross' ? 'mx' : config.id}`;
  const { tenantId } = useCurrentTenantId();
  const specialistIds = getSpecialistIdsForNiche((CONFIGS[niche] ? niche : 'coins') as SwishNicheId);
  const { data: inventoryCount } = useCount('items', { tenant_id: tenantId }, { specialist_id: specialistIds }, Boolean(tenantId));
  useEffect(() => {
    if (isOwner || niche === allowedNiche) setActiveNiche(config);
    else navigate(`/workspace/${allowedNiche}`, { replace: true });
  }, [config, isOwner, niche, allowedNiche, navigate]);

  if (!isOwner && niche !== allowedNiche) return <Navigate to={`/workspace/${allowedNiche}`} replace />;

  if (config.id === 'clothing') {
    const route = (to: string) => navigate(to);
    return <div className="threads-page">
      <header className="threads-header">
        <button className="threads-hanger" onClick={() => navigate('/workspace/clothing')} aria-label="Threads Flip home"><Shirt /></button>
        <div className="threads-brand"><div><span>Threads</span> <b>Flip</b> <i>PRO</i></div><small>IDENTIFY - VALUE - STYLE - SELL</small></div>
        <button className="threads-hanger threads-account" onClick={() => navigate('/settings')} aria-label="Account settings"><Shirt /></button>
      </header>
      <nav className="threads-tabs" aria-label="Threads Flip sections">
        {[{ label: 'Identify', icon: Search, to: '/identify' }, { label: 'Value', icon: BarChart3, to: '/opportunities' }, { label: 'Style', icon: Sparkles, to: '/insights' }, { label: 'Sell', icon: Tag, to: '/listings' }, { label: 'Insights', icon: Lightbulb, to: '/insights' }].map(tab => { const Icon = tab.icon; return <button key={tab.label} onClick={() => route(tab.to)}><Icon />{tab.label}</button>; })}
      </nav>
      <div className="threads-content">
        <section className="threads-hero">
          <div className="threads-hero-icon"><Shirt /></div>
          <div className="threads-hero-copy"><div className="threads-title">Threads <b>Flip</b></div><p>Turn fashion into opportunity.</p><small>IDENTIFY - VALUE - STYLE - SELL</small><div className="threads-hero-chips">{CLOTHING_CATEGORIES.slice(0, 3).map(c => <span key={c.label}>{c.label}</span>)}</div></div>
          <span className="threads-pro">PRO</span>
        </section>
        <section className="threads-stats" aria-label="Threads Flip summary">
          <div><strong>{inventoryCount ?? '—'}</strong><span>ITEMS IN STOCK</span></div><div><strong>8</strong><span>CATEGORIES</span></div><div><strong className="threads-green">Yes</strong><span>AI POWERED</span></div>
        </section>
        <h2 className="threads-section-title">TOOLS</h2>
        <section className="threads-tools">
          {[
            { label: 'Scan Item', icon: Camera, to: scanRoute },
            { label: 'My Wardrobe', icon: Package, to: '/inventory' },
            { label: 'Brands', icon: Shirt, to: '/identify' },
            { label: 'List & Sell', icon: Tag, to: '/listings' },
            { label: 'Profits', icon: BarChart3, to: '/money' },
            { label: 'Insights', icon: Lightbulb, to: '/insights' },
          ].map(tool => { const Icon = tool.icon; return <button key={tool.label} className="threads-tool" onClick={() => route(tool.to)}><span><Icon /></span><strong>{tool.label}</strong></button>; })}
        </section>
        <h2 className="threads-section-title threads-categories-title">CATEGORIES</h2>
        <section className="threads-categories">{CLOTHING_CATEGORIES.map(c => <button key={c.label} onClick={() => route('/identify')}><strong>{c.label}</strong><span>{c.detail}</span></button>)}</section>
        <section className="threads-brands"><div><h2>Top brands</h2><p>Quick access to fashion brand research</p></div><div className="threads-brand-chips">{BRAND_NAMES.map(brand => <button key={brand} onClick={() => route('/identify')}>{brand}</button>)}</div></section>
      </div>
      <nav className="threads-bottom-nav" aria-label="SWISH navigation">
        <button onClick={() => navigate('/workspace/clothing')}><Shirt /><span>Fashion</span></button>
        <button className="threads-scan" onClick={() => route('/identify')} aria-label="Scan item"><ScanLine /></button>
        <button onClick={() => route('/inventory')}><Package /><span>Stock</span></button>
        <button onClick={() => route('/ebay')}><Store /><span>eBay</span></button>
        <button onClick={() => navigate('/settings')} aria-label="Settings"><span className="threads-down">▾</span></button>
      </nav>
    </div>;
  }

  const route = (to: string) => navigate(to);
  return <div className="niche-workspace space-y-6" style={{ '--workspace-accent': config.accent } as React.CSSProperties}>
    <div className="flex items-center justify-between gap-3"><Link to={`/workspace/${config.id}`} className="btn-ghost"><ArrowLeft className="w-4 h-4" />Home</Link><span className="text-xs text-muted-foreground">Specialist workspace</span></div>
    <section className="workspace-hero">
      <div className="workspace-heading-icon"><BrandIcon className="w-5 h-5" /></div>
      <span className="workspace-eyebrow">SWISH SPECIALIST</span>
      <p className="text-xs uppercase tracking-[.2em] text-muted-foreground mb-2 mt-5">{config.detail}</p><h1 className="text-3xl sm:text-5xl font-extrabold">{config.name}</h1><p className="text-lg sm:text-xl mt-3 text-white/80">{config.tagline}</p>
      <div className="workspace-quick-actions mt-6">
        <button className="workspace-primary" onClick={() => route(scanRoute)}><Camera className="w-4 h-4" />{config.scan}<span>↗</span></button>
        <Link className="workspace-import" to="/ebay/import"><Package className="w-4 h-4" />Import from eBay</Link>
      </div>
    </section>
    <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Your workflow</h2><p className="text-sm text-muted-foreground mt-1">Choose what you want to do next.</p></div><span className="text-xs rounded-full px-3 py-1 border" style={{ borderColor: config.accent, color: config.accent }}>{config.name}</span></div>
    <section className="workspace-actions">{config.actions.map(action => { const Icon = action.icon; return <Link key={action.label} to={action.to === '/identify' && /scan|identify/i.test(action.label) ? scanRoute : action.to} className="workspace-action" style={{ '--workspace-accent': config.accent } as React.CSSProperties}><span className="workspace-action-icon"><Icon className="w-5 h-5" /></span><span className="font-semibold">{action.label}<span className="workspace-open-arrow"> ↗</span></span><span className="text-xs text-muted-foreground">{action.detail}</span></Link>; })}</section>
    <div className="swish-card p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-sm">Your standalone workspace</div><p className="text-xs text-muted-foreground mt-1">Your product workspace stays separate from other SWISH products.</p></div><Link to="/settings" className="btn-secondary">Account settings</Link></div>
  </div>;
}
