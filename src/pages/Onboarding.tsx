import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { toast } from 'sonner';
import { ArrowRight, Check, Circle, Link2, Package, UserRound, Sparkles, Loader2, SkipForward } from 'lucide-react';
import { getHostProduct } from '@/lib/productContext';

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
  const { tenantId } = useCurrentTenantId();
  const hostProduct = getHostProduct();
  const productId = hostProduct?.id || String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins');
  const product = hostProduct ? { name: hostProduct.name, description: hostProduct.description } : (PRODUCTS[productId] || PRODUCTS.coins);
  const storageKey = user ? `swish_onboarding_steps_${user.id}` : 'swish_onboarding_steps';
  const initial = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{"profile":false,"ebay":false,"inventory":false}') as Record<string, boolean>; }
    catch { return { profile: false, ebay: false, inventory: false }; }
  }, [storageKey]);
  const [steps, setSteps] = useState<Record<string, boolean>>(initial);
  const [savingProfile, setSavingProfile] = useState(false);
  const [finishing, setFinishing] = useState(false);
  useEffect(() => { setSteps(initial); }, [initial]);
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !user || !tenantId) return;
    let active = true;
    sb.from('marketplace_connectors').select('status').eq('tenant_id', tenantId).eq('marketplace_id', 'ebay').maybeSingle().then(({ data, error }) => {
      if (!active || error) return;
      setSteps(current => {
        const next = { ...current, ebay: data?.status === 'connected' };
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    });
    return () => { active = false; };
  }, [storageKey, user, tenantId]);
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
      if (!sb) throw new Error('SWISH backend is not connected. No profile changes were saved.');
      const { data, error } = await sb.from('profiles').upsert({
        id: user.id,
        full_name: String(user.user_metadata?.full_name || user.email?.split('@')[0] || ''),
      }).select('id').single();
      if (error) throw error;
      if (data?.id !== user.id) throw new Error('SWISH did not confirm your profile update.');
      updateStep('profile');
      toast.success('Account profile checked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your profile');
    } finally { setSavingProfile(false); }
  };

  // Keep the confirmed subscriber OAuth contract and recovery in one screen.
  const connectEbay = () => navigate('/ebay');

  const finish = async () => {
    const sb = getSupabaseClient();
    if (!sb || !user || finishing) return;
    setFinishing(true);
    try {
      const { error } = await sb.auth.updateUser({ data: { onboarding_status: 'complete' } });
      if (error) throw error;
      localStorage.setItem(`swish_onboarding_complete_${user.id}`, 'true');
      localStorage.setItem('swish_active_niche', productId);
      localStorage.setItem('swish_active_niche_name', product.name);
      document.documentElement.dataset.niche = productId;
      navigate(`/workspace/${productId}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup completion was not saved. Please retry.');
    } finally { setFinishing(false); }
  };

  if (isOwner) {
    return <div className="max-w-2xl mx-auto swish-card p-8 space-y-4"><Sparkles className="w-8 h-8 swish-gold" /><h1 className="text-2xl font-bold">Master Admin access</h1><p className="text-sm text-muted-foreground">Owner accounts can manage product entry points and subscribers from the central admin area.</p><button className="btn-primary" onClick={() => navigate('/master-admin')}>Open Master Admin <ArrowRight className="w-4 h-4" /></button></div>;
  }

  const rows = [
    { id: 'profile', title: 'Confirm your account', detail: 'Check your account details.', icon: UserRound, action: saveProfile, label: 'Confirm profile', busy: savingProfile },
    { id: 'ebay', title: 'Connect eBay', detail: 'Connect your eBay seller account to publish listings and sync sales.', icon: Link2, action: connectEbay, label: 'Connect eBay', busy: false },
    { id: 'inventory', title: hostProduct?.id === 'clothing' ? 'Add your first clothing item' : hostProduct?.id === 'motocross' || hostProduct?.id === 'bicycles' ? 'Add your first bike or part' : 'Bring in your stock', detail: hostProduct?.id === 'clothing' ? 'Start with photos of a garment; you can import stock later.' : 'Import existing stock or start with your first item.', icon: Package, action: () => navigate(hostProduct?.id === 'clothing' ? '/identify' : '/ebay/import'), label: hostProduct?.id === 'clothing' ? 'Add clothing' : 'Open import tools', busy: false },
  ];

  return <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
    <header className="swish-card p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="text-xs uppercase tracking-[.2em] text-primary font-bold mb-3">Welcome to your workspace</div>
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
    <footer className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground flex items-center gap-2"><Circle className="w-3 h-3" />Your product access remains governed by existing subscription entitlements.</p><div className="flex gap-2"><button className="btn-secondary" disabled={finishing || !tenantId} onClick={() => void finish()}><SkipForward className="w-4 h-4" />Skip for now</button><button className="btn-primary" disabled={finishing || !tenantId} onClick={() => void finish()}>{finishing ? 'Saving setup…' : `Enter ${product.name}`}<ArrowRight className="w-4 h-4" /></button></div></footer>
  </div>;
}
