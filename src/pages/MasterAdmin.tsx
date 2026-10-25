import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/supabase';
import { BadgeCheck, Crown, ExternalLink, RefreshCw, ShieldAlert, Coins, Bike, Shirt, Wrench, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Subscription = {
  subscribed?: boolean;
  product_id?: string | null;
  price_id?: string | null;
  subscription_end?: string | null;
  niche_entitlements?: string[];
};

const OWNER_EMAIL = 'troonvinyl@gmail.com';
const NICHES = [
  { id: 'coins', name: 'SWISH Coins', tagline: 'Identify, value and flip coins & collectibles', colour: '#F5C842', icon: Coins },
  { id: 'motocross', name: 'SWISH MX', tagline: 'Buy, prep and flip motocross & off-road bikes', colour: '#EF4444', icon: Wrench },
  { id: 'bicycles', name: 'SWISH Bikes', tagline: 'Identify, value and flip bicycles', colour: '#22C55E', icon: Bike },
  { id: 'clothing', name: 'Threads Flip', tagline: 'Turn fashion into opportunity.', colour: '#E91E8C', icon: Shirt },
  { id: 'surplus_flip', name: 'Surplus Flip', tagline: 'Turn job lots and pallet manifests into eBay listings', colour: '#14B8A6', icon: Package },
];

export default function MasterAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const activeNiche = localStorage.getItem('swish_active_niche') || 'coins';

  const switchNiche = (niche: typeof NICHES[number]) => {
    localStorage.setItem('swish_active_niche', niche.id);
    localStorage.setItem('swish_active_niche_name', niche.name);
    document.documentElement.dataset.niche = niche.id;
    navigate('/workspace/' + niche.id);
  };

  const refresh = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    const result = await callEdgeFunction<Subscription>('swish-check-subscription', {});
    setLoading(false);
    setCheckedAt(new Date().toISOString());
    if (result.error) {
      setSubscription(null);
      toast.error('Could not check subscription: ' + result.error.message);
      return;
    }
    setSubscription(result.data ?? null);
  }, [isOwner]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!isOwner) {
    return <div className="max-w-xl mx-auto mt-12 swish-card p-8 text-center space-y-3"><ShieldAlert className="w-10 h-10 mx-auto text-destructive" /><h1 className="text-xl font-bold">Owner access only</h1><p className="text-sm text-muted-foreground">The SWISH master administration dashboard is restricted to the owner account.</p></div>;
  }

  const entitlements = subscription?.niche_entitlements ?? [];
  const subscriptionEnd = subscription?.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString('en-GB') : '—';

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Crown className="w-6 h-6 swish-gold" /><h1 className="page-title">Master Admin</h1></div><p className="page-subtitle">Owner control centre · all production niches</p></div>
      <button onClick={() => void refresh()} disabled={loading} className="btn-secondary"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh status</button>
    </div>

    <section className="swish-card p-5 space-y-4">
      <div className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 swish-gold" /><h2 className="font-semibold">Master workspace switcher</h2></div>
      <p className="text-sm text-muted-foreground">As master admin, open any registered production niche. Stock and workflows remain context-specific, just like the app.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NICHES.map(niche => { const Icon = niche.icon; const active = activeNiche === niche.id; return <button key={niche.id} onClick={() => switchNiche(niche)} className={`master-niche-card ${active ? 'is-active' : ''}`} style={{ '--niche-color': niche.colour } as React.CSSProperties}>
          <span className="master-niche-icon"><Icon className="w-6 h-6" /></span><span className="master-niche-copy"><strong>{niche.name}</strong><small>{niche.tagline}</small></span>{active ? <span className="master-niche-active"><CheckCircle2 className="w-4 h-4" />ACTIVE</span> : <span className="master-niche-arrow">›</span>}
        </button>; })}
      </div>
    </section>

    <section className="swish-card p-5 space-y-4">
      <div className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 swish-gold" /><h2 className="font-semibold">Current owner subscription</h2></div>
      {loading && !subscription ? <p className="text-sm text-muted-foreground">Checking subscription service…</p> : subscription ? <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card"><div className="text-xs text-muted-foreground">Stripe subscription</div><div className="text-xl font-bold mt-1">{subscription.subscribed ? 'Active' : 'Not active'}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground">Entitled niches</div><div className="text-xl font-bold mt-1">{entitlements.length}</div><div className="text-xs text-muted-foreground mt-1">{entitlements.length ? entitlements.join(', ') : 'No Stripe niche entitlement returned'}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground">Subscription period ends</div><div className="text-lg font-bold mt-1">{subscriptionEnd}</div></div>
        </div>
        <p className="text-xs text-muted-foreground">Last checked: {checkedAt ? new Date(checkedAt).toLocaleString('en-GB') : '—'}. This is the authenticated owner account’s result, not a list of all subscribers.</p>
      </> : <p className="text-sm text-muted-foreground">No subscription status is available. Refresh to try again.</p>}
    </section>

    <section className="swish-card p-5 space-y-3">
      <h2 className="font-semibold">Subscriber management and free trials</h2>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
        <p className="font-medium">Admin grants are not supported by the existing backend</p>
        <p className="text-sm text-muted-foreground">The previous page called a non-existent `swish-admin-membership` function, causing the 404. The verified functions cannot grant premium, list all subscribers, or persist trial expiries. This page therefore does not fake a membership change in browser storage. A real grant/trial workflow requires server-side authorisation and expiry handling.</p>
      </div>
      <a className="inline-flex items-center gap-2 text-sm text-primary hover:underline" href="https://github.com/troonvinyl-ux/SWISH/tree/main/supabase/functions" target="_blank" rel="noreferrer">Review SWISH Edge Functions <ExternalLink className="w-3.5 h-3.5" /></a>
    </section>
    <div><Link to="/niches" className="btn-secondary">Back to SWISH Verticals</Link></div>
  </div>;
}
