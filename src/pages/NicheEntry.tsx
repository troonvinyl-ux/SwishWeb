import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { getSpecialistIdsForNiche, normaliseNicheId, type SwishNicheId } from '@/lib/niche';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Info, CheckCircle2, Circle, Coins, Bike, Shirt, Wrench, Package, Search, ShieldCheck, Grid3X3, Construction, Gamepad2, Watch, Gem, Palette, Smartphone, Sparkles } from 'lucide-react';

type Niche = {
  id: string;
  name: string;
  tagline: string;
  colour: string;
  specialistCount: number;
  marketplaces: string[];
  acquisitionSources: string[];
  categories: string[];
  icon: typeof Coins;
};

const OWNER_EMAIL = 'troonvinyl@gmail.com';
const NICHES: Niche[] = [
  { id: 'coins', name: 'SWISH Coins', tagline: 'Identify, value and flip coins & collectibles', colour: '#F5C842', specialistCount: 8, marketplaces: ['eBay'], acquisitionSources: ['Auctions', 'Car boot sales', 'eBay'], categories: ['coins', 'islamic silver', 'banknotes', 'gold', '+4 more'], icon: Coins },
  { id: 'motocross', name: 'SWISH MX', tagline: 'Buy, prep and flip motocross & off-road bikes', colour: '#EF4444', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['eBay', 'Facebook Marketplace', 'Gumtree'], categories: ['motocross'], icon: Wrench },
  { id: 'bicycles', name: 'SWISH Bikes', tagline: 'Identify, value and flip bicycles', colour: '#22C55E', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Facebook Marketplace', 'eBay', 'Gumtree'], categories: ['bicycles'], icon: Bike },
  { id: 'clothing', name: 'Threads Flip', tagline: 'Turn fashion into opportunity.', colour: '#E91E8C', specialistCount: 2, marketplaces: ['eBay'], acquisitionSources: ['Charity shops', 'Car boot sales', 'eBay'], categories: ['Vintage', 'Designer', 'Streetwear', 'High Street', 'Sustainable', 'Trainers', 'Accessories', 'Sportswear'], icon: Shirt },
  { id: 'trading_cards', name: 'SWISH Cards', tagline: 'Grade, value and flip trading cards', colour: '#FACC15', specialistCount: 2, marketplaces: ['eBay'], acquisitionSources: ['Local shops', 'Collections', 'eBay'], categories: ['Pokémon', 'Sports', 'TCG', 'Condition'], icon: Gamepad2 },
  { id: 'antiques', name: 'SWISH Antiques', tagline: 'Identify, value and sell antiques & collectibles', colour: '#D8AD52', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Auctions', 'Estate sales', 'Antique shops'], categories: ['Ceramics', 'Furniture', 'Silver', 'Art'], icon: Watch },
  { id: 'fossils', name: 'SWISH Fossils', tagline: 'Identify, value and sell fossils & minerals', colour: '#8B5CF6', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Fossil shows', 'Rock shops', 'Collectors'], categories: ['Fossils', 'Minerals', 'Specimens', 'Provenance'], icon: Gem },
  { id: 'beauty', name: 'SWISH Beauty', tagline: 'Source and flip beauty products at scale', colour: '#F472B6', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Wholesale', 'Clearance sales', 'Returns'], categories: ['Fragrance', 'Skincare', 'Cosmetics', 'Batch codes'], icon: Palette },
  { id: 'tech', name: 'Tech Flipper', tagline: 'Identify, value and flip technology', colour: '#06B6D4', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Clearance stock', 'Auctions', 'Local listings'], categories: ['Phones', 'Consoles', 'Gadgets', 'Tested stock'], icon: Smartphone },
  { id: 'surplus_flip', name: 'Surplus Flip', tagline: 'Turn job lots and pallet manifests into eBay listings', colour: '#14B8A6', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Job lots', 'Pallets', 'Wholesale manifests'], categories: ['Job lots', 'Pallets', 'Wholesale', 'Returns'], icon: Package },
  { id: 'tunes_flip', name: 'Tunes Flip', tagline: 'Identify and sell music media with pressing evidence', colour: '#A855F7', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Record shops', 'Collections', 'Car boot sales'], categories: ['Vinyl', 'Singles', 'CDs', 'Pressings'], icon: Sparkles },
  { id: 'collectibles', name: 'Collectibles Flipper', tagline: 'Research and list toys, comics, games and memorabilia', colour: '#F97316', specialistCount: 1, marketplaces: ['eBay'], acquisitionSources: ['Collections', 'Clearance stock', 'Car boot sales'], categories: ['Toys', 'Comics', 'Games', 'Memorabilia'], icon: Package },
];

export default function NicheEntry() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const navigate = useNavigate();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(() => {
    const stored = normaliseNicheId(localStorage.getItem('swish_active_niche') || String(user?.user_metadata?.preferred_niche || 'coins')) || 'coins';
    return NICHES.some(n => n.id === stored) ? stored : 'coins';
  });
  const { data: activeSpecialists = [], isLoading: entitlementsLoading } = useQuery({
    queryKey: ['niche_entry_entitlements', tenantId],
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
  const enabled = useMemo(() => isOwner ? NICHES.map(n => n.id) : NICHES.filter(n => getSpecialistIdsForNiche(n.id as SwishNicheId).some(id => activeSpecialists.includes(id))).map(n => n.id), [isOwner, activeSpecialists]);
  const niches = useMemo(() => NICHES.filter(n => (n.name + ' ' + n.tagline + ' ' + n.categories.join(' ')).toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { if (!tenantLoading && !entitlementsLoading && enabled.length && !enabled.includes(activeId)) { const first = enabled[0]; setActiveId(first); localStorage.setItem('swish_active_niche', first); localStorage.setItem('swish_active_niche_name', NICHES.find(n => n.id === first)?.name || first); } }, [tenantLoading, entitlementsLoading, enabled, activeId]);

  const selectNiche = (niche: Niche) => {
    setActiveId(niche.id);
    localStorage.setItem('swish_active_niche', niche.id);
    localStorage.setItem('swish_active_niche_name', niche.name);
  };
  const toggleEnabled = (id: string) => {
    // Browser storage must never grant access to an unentitled niche.
    if (enabled.includes(id)) selectNiche(NICHES.find(n => n.id === id) || NICHES[0]);
  };
  const done = () => {
    if (tenantLoading || entitlementsLoading) return;
    const niche = NICHES.find(n => n.id === activeId && enabled.includes(n.id)) || NICHES.find(n => enabled.includes(n.id));
    if (!niche) return;
    localStorage.setItem('swish_active_niche', niche.id);
    localStorage.setItem('swish_active_niche_name', niche.name);
    document.documentElement.dataset.niche = niche.id;
    navigate('/workspace/' + niche.id);
  };

  return (
    <main className="vertical-page -m-4 sm:-m-6 min-h-screen">
      <header className="vertical-header">
        <button className="vertical-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        <div className="vertical-heading"><h1>SWISH Verticals</h1><p>Select your trading niche</p></div>
        {isOwner ? <button className="vertical-admin" onClick={() => navigate('/master-admin')} aria-label="Open Master Admin"><ShieldCheck className="w-6 h-6" /></button> : <span className="vertical-admin-placeholder" />}
      </header>
      <div className="vertical-info"><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>ONE SWISH ENGINE — switch between the niches included in your subscription. Your eBay connection is shared; inventory and workflows stay niche-scoped.</span></div>
      <section className="vertical-content" aria-label="Trading niches">
        <div className="vertical-search"><Search className="w-4 h-4" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search niches…" aria-label="Search niches" /></div>
        <div className="vertical-list">
          {niches.filter(niche => enabled.includes(niche.id)).map(niche => {
            const Icon = niche.icon;
            const active = activeId === niche.id;
            const isEnabled = enabled.includes(niche.id);
            return <article className={`vertical-card ${active ? 'is-active' : ''}`} key={niche.id} style={{ '--niche-color': niche.colour } as React.CSSProperties}>
              <button className="vertical-card-main" onClick={() => selectNiche(niche)} aria-label={`Select ${niche.name}`}>
                <span className="vertical-icon"><Icon className="w-7 h-7" /></span>
                <span className="vertical-card-copy"><strong>{niche.name}</strong><span>{niche.tagline}</span><span className="vertical-meta"><i>{niche.specialistCount} specialist{niche.specialistCount === 1 ? '' : 's'}</i><i>{niche.marketplaces.length} marketplaces</i></span></span>
                <span className="vertical-check" aria-hidden="true">{active || isEnabled ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}</span>
              </button>
              <div className="vertical-lower">
                <div className="vertical-chips">{niche.categories.slice(0, 4).map(item => <span key={item}>{item}</span>)}{niche.categories.length > 4 && <span>+{niche.categories.length - 4} more</span>}</div>
                <div className="vertical-sources"><Package className="w-3 h-3" />{niche.acquisitionSources.join(' · ')}</div>
              </div>
              <div className="vertical-card-actions"><button className="vertical-small-btn" onClick={() => toggleEnabled(niche.id)}>{isOwner ? '✓ Available' : '✓ Included'}</button>{active && <span className="vertical-active-tag">ACTIVE</span>}</div>
            </article>;
          })}
          {niches.length === 0 && <p className="py-8 text-center text-muted-foreground">No niches match that search.</p>}
        </div>
        <div className="vertical-coming"><Construction className="w-5 h-5 shrink-0" /><div><strong>More verticals coming</strong><p>Musical instruments · Sports equipment · Golf · Watches · Tools · Homeware</p></div></div>
        <div className="vertical-note"><Grid3X3 className="w-4 h-4 shrink-0" /><div><strong>ONE PLATFORM, MANY NICHES</strong><p>Your inventory, eBay integration, AI engine, valuation and orders share one platform. Switching niche changes the specialist context; existing backend access controls remain authoritative.</p></div></div>
      </section>
      <footer className="vertical-done"><button onClick={done} disabled={tenantLoading || entitlementsLoading || enabled.length === 0}><CheckCircle2 className="w-5 h-5" />Done — Using {NICHES.find(n => n.id === activeId)?.name || 'SWISH'}</button></footer>
    </main>
  );
}

