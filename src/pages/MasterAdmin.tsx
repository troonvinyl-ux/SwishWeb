import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/supabase';
import { BadgeCheck, Crown, Gift, RefreshCw, Search, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';

type Member = {
  user_id?: string;
  email?: string;
  plan?: string;
  status?: string;
  trial_ends_at?: string | null;
  premium_until?: string | null;
  updated_at?: string;
};

const OWNER_EMAIL = 'troonvinyl@gmail.com';
const ADMIN_FUNCTION = 'swish-admin-membership';

export default function MasterAdmin() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [action, setAction] = useState<'premium' | 'trial' | 'revoke'>('premium');
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');

  const loadMembers = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    const result = await callEdgeFunction<{ members?: Member[] }>(ADMIN_FUNCTION, { action: 'list' });
    if (result.error) {
      setMembers([]);
      toast.error('Admin membership service is not available: ' + result.error.message);
    } else {
      setMembers(Array.isArray(result.data?.members) ? result.data.members : []);
    }
    setLoading(false);
  }, [isOwner]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const applyMembership = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner || !email.trim()) return;
    setBusy(true);
    const result = await callEdgeFunction(ADMIN_FUNCTION, {
      action,
      email: email.trim().toLowerCase(),
      duration_days: action === 'revoke' ? 0 : days,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (result.error) {
      toast.error('Membership change failed: ' + result.error.message);
      return;
    }
    toast.success(action === 'premium' ? 'Premium membership granted' : action === 'trial' ? 'Free trial granted' : 'Premium access revoked');
    setEmail('');
    setNote('');
    await loadMembers();
  };

  if (!isOwner) {
    return <div className="max-w-xl mx-auto mt-12 swish-card p-8 text-center space-y-3"><ShieldAlert className="w-10 h-10 mx-auto text-destructive" /><h1 className="text-xl font-bold">Owner access only</h1><p className="text-sm text-muted-foreground">The SWISH master administration dashboard is restricted to the owner account.</p></div>;
  }

  const filtered = members.filter(m => [m.email, m.plan, m.status].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())));

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Crown className="w-6 h-6 swish-gold" /><h1 className="page-title">Master Admin</h1></div><p className="page-subtitle">Owner controls · subscriber access · premium grants · free trials</p></div>
      <button onClick={() => void loadMembers()} disabled={loading} className="btn-secondary"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="stat-card"><Users className="w-5 h-5 swish-gold mb-2" /><div className="text-2xl font-bold">{members.length}</div><div className="text-xs text-muted-foreground">Subscribers returned by membership service</div></div>
      <div className="stat-card"><BadgeCheck className="w-5 h-5 swish-gold mb-2" /><div className="text-2xl font-bold">{members.filter(m => /premium|active/i.test(`${m.plan || ''} ${m.status || ''}`)).length}</div><div className="text-xs text-muted-foreground">Premium / active access</div></div>
      <div className="stat-card"><Gift className="w-5 h-5 swish-gold mb-2" /><div className="text-2xl font-bold">{members.filter(m => /trial/i.test(`${m.plan || ''} ${m.status || ''}`)).length}</div><div className="text-xs text-muted-foreground">Free trials</div></div>
    </div>

    <form onSubmit={applyMembership} className="swish-card p-5 space-y-4">
      <div><h2 className="font-semibold">Grant or change membership</h2><p className="text-xs text-muted-foreground mt-1">Changes must be validated and written by the server-side admin function. Never grant access by editing client-side profile fields.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className="text-xs text-muted-foreground">Subscriber email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-field mt-1" placeholder="subscriber@example.com" /></div>
        <div><label className="text-xs text-muted-foreground">Action</label><select value={action} onChange={e => setAction(e.target.value as typeof action)} className="input-field mt-1"><option value="premium">Grant Premium</option><option value="trial">Grant Free Trial</option><option value="revoke">Revoke manual Premium / Trial</option></select></div>
        {action !== 'revoke' && <div><label className="text-xs text-muted-foreground">Duration</label><select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field mt-1"><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option><option value={36500}>Lifetime / no practical expiry</option></select></div>}
        <div><label className="text-xs text-muted-foreground">Admin note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} className="input-field mt-1" placeholder="Reason / support reference" /></div>
      </div>
      <button disabled={busy || !email.trim()} className="btn-primary" type="submit">{busy ? 'Applying…' : action === 'premium' ? 'Grant Premium Membership' : action === 'trial' ? 'Grant Free Trial' : 'Revoke Manual Access'}</button>
    </form>

    <section className="swish-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Subscriber register</h2><p className="text-xs text-muted-foreground">Membership records supplied by the server-side admin service.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search subscribers" /></div></div>
      {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading subscribers…</p> : filtered.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-3 pr-4">Subscriber</th><th className="py-3 pr-4">Plan</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Trial ends</th><th className="py-3">Premium until</th></tr></thead><tbody>{filtered.map((m,i) => <tr key={m.user_id || m.email || i} className="border-b border-border/60"><td className="py-3 pr-4">{m.email || 'Unknown email'}</td><td className="py-3 pr-4">{m.plan || '—'}</td><td className="py-3 pr-4"><span className="rounded-full bg-secondary px-2 py-1 text-xs">{m.status || 'Unknown'}</span></td><td className="py-3 pr-4">{m.trial_ends_at ? new Date(m.trial_ends_at).toLocaleDateString() : '—'}</td><td className="py-3">{m.premium_until ? new Date(m.premium_until).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <div className="py-8 text-center"><Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm font-medium">No subscriber records available</p><p className="text-xs text-muted-foreground mt-1">If the admin function is not deployed, this register will remain empty and membership actions will fail safely.</p></div>}
    </section>
  </div>;
}
