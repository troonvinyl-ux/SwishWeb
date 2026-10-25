import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction, getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowRight, Check, Circle, Link2, Package, UserRound, Sparkles, Loader2, SkipForward } from 'lucide-react';

const PRODUCTS: Record<string, { name: string; description: string }> = {
  coins: { name: 'SWISH Coins', description: 'Coin identification, references, valuation and selling.' },
  motocross: { name: 'SWISH MX', description: 'Motocross and off-road bike inventory, prep and selling.' },
  bicycles: { name: 'SWISH Bikes', description: 'Bicycle identification, components, valuation and selling.' },
  clothing: { name: 'Threads Flip', description: 'Fashion identification, brand research, pricing and selling.' },
  surplus_flip: { name: 'Surplus Flip', description: 'Supplier manifests, job lots, product matching and resale.' },
};
const OWNER_EMAIL = 'troonvinyl@gmail.com';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const productId = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const product = PRODUCTS[productId] || PRODUCTS.coins;
  const storageKey = user ? `swish_onboarding_steps_${user.id}` : 'swish_onboarding_steps';
  const initial = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{"profile":false,"ebay":false,"inventory":false}') as Record<string, boolean>; }
    catch { return { profile: false, ebay: false, inventory: false }; }
  }, [storageKey]);
  const [steps, setSteps] = useState<Record<string, boolean>>(initial);
  const [savingProfile, setSavingProfile] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const completed = Object.values(steps).filter(Boolean).length;
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  const updateStep = (step: string) => {
    const next = { ...steps, [step]: true };
    setSteps(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const sb = getSupabaseClient();
      if (sb) {
        const { error } = await sb.from('profiles').upsert({
          id: user.id,
          full_name: String(user.user_metadata?.full_name || user.email?.split('@')[0] || ''),
        });
        if (error) throw error;
      }
      updateStep('profile');
      toast.success('Account profile checked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your profile');
    } finally { setSavingProfile(false); }
  };

  const connectEbay = async () => {
    setConnecting(true);
    try {
      const { data, error } = await callEdgeFunction<Record<string, unknown>>('ebay-auth-url', {});
      if (error) throw error;
      const url = data?.url || data?.auth_url || data?.authorization_url;
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('The existing eBay connection service did not return a valid authorisation link.');
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start eBay connection');
      setConnecting(false);
    }
  };

  const finish = async () => {
    localStorage.setItem(`swish_onboarding_complete_${user?.id || 'unknown'}`, 'true');
    const sb = getSupabaseClient();
    if (sb && user) {
      try { await sb.auth.updateUser({ data: { onboarding_status: 'complete' } }); } catch { /* local completion remains as a fallback */ }
    }
    localStorage.setItem('swish_active_niche', productId);
    localStorage.setItem('swish_active_niche_name', product.name);
    document.documentElement.dataset.niche = productId;
    navigate(`/workspace/${productId}`, { replace: true });
  };

  if (isOwner) {
    return <div className="max-w-2xl mx-auto swish-card p-8 space-y-4"><Sparkles className="w-8 h-8 swish-gold" /><h1 className="text-2xl font-bold">Master Admin access</h1><p className="text-sm text-muted-foreground">Owner accounts can manage product entry points and subscribers from the central admin area.</p><button className="btn-primary" onClick={() => navigate('/master-admin')}>Open Master Admin <ArrowRight className="w-4 h-4" /></button></div>;
  }

  const rows = [
    { id: 'profile', title: 'Confirm your account', detail: 'Use your account name to initialise your SWISH profile.', icon: UserRound, action: saveProfile, label: 'Confirm profile', busy: savingProfile },
    { id: 'ebay', title: 'Connect eBay', detail: 'Authorise the existing eBay integration to sync listings and orders.', icon: Link2, action: connectEbay, label: 'Connect eBay', busy: connecting },
    { id: 'inventory', title: 'Bring in your stock', detail: 'Import an existing eBay CSV or start with an empty inventory.', icon: Package, action: () => { updateStep('inventory'); navigate('/ebay/import'); }, label: 'Open import tools', busy: false },
  ];

  return <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
    <header className="swish-card p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="text-xs uppercase tracking-[.2em] text-primary font-bold mb-3">Welcome to your standalone workspace</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{product.name}</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">{product.description} Complete these setup steps to get your workspace ready. You can skip any step and return later.</p>
        <div className="mt-6 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${(completed / 3) * 100}%` }} /></div>
        <p className="text-xs text-muted-foreground mt-2">{completed} of 3 setup steps completed</p>
      </div>
    </header>
    <section className="space-y-3">
      {rows.map((row, index) => {
        const Icon = row.icon;
        const done = Boolean(steps[row.id]);
        return <article key={row.id} className="swish-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/15 text-emerald-500' : 'bg-primary/10 text-primary'}`}>{done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}</div>
          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">STEP {index + 1}</span>{done && <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">Complete</span>}</div><h2 className="font-semibold mt-1">{row.title}</h2><p className="text-sm text-muted-foreground mt-1">{row.detail}</p></div>
          <button onClick={row.action} disabled={row.busy || done} className={done ? 'btn-secondary opacity-70' : 'btn-primary shrink-0'}>{row.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}{row.busy ? 'Working…' : done ? 'Done' : row.label}</button>
        </article>;
      })}
    </section>
    <footer className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground flex items-center gap-2"><Circle className="w-3 h-3" />Your product access remains governed by existing subscription entitlements.</p><div className="flex gap-2"><button className="btn-secondary" onClick={finish}><SkipForward className="w-4 h-4" />Skip for now</button><button className="btn-primary" onClick={finish}>Enter {product.name}<ArrowRight className="w-4 h-4" /></button></div></footer>
  </div>;
}
