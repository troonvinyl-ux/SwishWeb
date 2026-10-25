import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/supabase';
import { BadgeCheck, Crown, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

type Subscription = {
  subscribed?: boolean;
  product_id?: string | null;
  price_id?: string | null;
  subscription_end?: string | null;
  niche_entitlements?: string[];
};

const OWNER_EMAIL = 'troonvinyl@gmail.com';

export default function MasterAdmin() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    // Existing deployed function: checks the authenticated user's Stripe subscription.
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
  const subscriptionEnd = subscription?.subscription_end
    ? new Date(subscription.subscription_end).toLocaleDateString('en-GB')
    : '—';

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Crown className="w-6 h-6 swish-gold" /><h1 className="page-title">Master Admin</h1></div><p className="page-subtitle">Owner controls · subscription overview · platform access</p></div>
      <button onClick={() => void refresh()} disabled={loading} className="btn-secondary"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh status</button>
    </div>

    <section className="swish-card p-5 space-y-4">
      <div className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 swish-gold" /><h2 className="font-semibold">Current owner subscription</h2></div>
      {loading && !subscription ? <p className="text-sm text-muted-foreground">Checking the existing SWISH subscription service…</p> : subscription ? <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card"><div className="text-xs text-muted-foreground">Stripe subscription</div><div className="text-xl font-bold mt-1">{subscription.subscribed ? 'Active' : 'Not active'}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground">Entitled niches</div><div className="text-xl font-bold mt-1">{entitlements.length}</div><div className="text-xs text-muted-foreground mt-1">{entitlements.length ? entitlements.join(', ') : 'No Stripe niche entitlement returned'}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground">Subscription period ends</div><div className="text-lg font-bold mt-1">{subscriptionEnd}</div></div>
        </div>
        <p className="text-xs text-muted-foreground">Last checked: {checkedAt ? new Date(checkedAt).toLocaleString('en-GB') : '—'}. This is the authenticated owner account’s result, not a list of all subscribers.</p>
      </> : <p className="text-sm text-muted-foreground">No subscription status is available. Refresh to try again.</p>}
    </section>

    <section className="swish-card p-5 space-y-3">
      <h2 className="font-semibold">Existing subscription functions</h2>
      <p className="text-sm text-muted-foreground">These are the verified functions in SWISH’s current backend. They are used for subscription status, paid checkout, and the signed-in customer’s billing portal.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-4"><div className="font-medium">Check subscription</div><code className="text-xs text-muted-foreground">swish-check-subscription</code><div className="text-xs text-muted-foreground mt-2">Connected above</div></div>
        <div className="rounded-lg border border-border p-4"><div className="font-medium">Paid checkout</div><code className="text-xs text-muted-foreground">swish-create-checkout</code><div className="text-xs text-muted-foreground mt-2">Authenticated customer only</div></div>
        <div className="rounded-lg border border-border p-4"><div className="font-medium">Billing portal</div><code className="text-xs text-muted-foreground">swish-customer-portal</code><div className="text-xs text-muted-foreground mt-2">Authenticated customer only</div></div>
      </div>
    </section>

    <section className="swish-card p-5 space-y-3">
      <h2 className="font-semibold">Subscriber management and free trials</h2>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
        <p className="font-medium">Admin grants are not supported by the existing backend</p>
        <p className="text-sm text-muted-foreground">The previous page called a non-existent `swish-admin-membership` function, causing the 404. That call and the misleading grant/revoke controls have been removed. The verified subscription functions cannot list or change other users, grant premium, or persist a trial expiry. I have not substituted insecure client-side database edits.</p>
      </div>
      <p className="text-sm text-muted-foreground">The existing entitlement model recognises tenant tiers such as professional, business, enterprise and lifetime. A real trial/grant workflow must be authorised server-side and must include expiry handling before it can safely be offered here.</p>
      <a className="inline-flex items-center gap-2 text-sm text-primary hover:underline" href="https://github.com/troonvinyl-ux/SWISH/tree/main/supabase/functions" target="_blank" rel="noreferrer">Review verified SWISH Edge Functions <ExternalLink className="w-3.5 h-3.5" /></a>
    </section>
  </div>;
}
