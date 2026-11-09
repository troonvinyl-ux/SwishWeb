import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getSupabaseClient } from '@/lib/supabase';
import { Settings as SettingsIcon, User, Bell, Shield, Save, Bot, Radio, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const LOCAL_VECTOR_PAIRING_URL = 'http://127.0.0.1:8788/v1/pair';

export default function Settings() {
  const { user, session, signOut } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [pairingVector, setPairingVector] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !user) return;
    sb.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setProfile(data as Record<string, unknown>);
    });
  }, [user]);

  const saveProfile = async () => {
    const sb = getSupabaseClient();
    if (!sb || !user) return;
    setSaving(true);
    const { error } = await sb.from('profiles').upsert({ ...profile, id: user.id });
    if (error) toast.error(error.message);
    else toast.success('Profile saved');
    setSaving(false);
  };

  const pairVectorOnThisComputer = async () => {
    if (!session?.access_token || !tenantId) {
      toast.error('Your SWISH workspace is still loading. Please try again in a moment.');
      return;
    }
    setPairingVector(true);
    try {
      // This only contacts the loopback bridge running on this exact PC. The
      // bridge accepts this request solely from swishflip.co.uk, validates the
      // ordinary user JWT (never a service role), and never returns it here.
      const response = await fetch(LOCAL_VECTOR_PAIRING_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token, tenantId }),
        // Chromium's Local Network Access model may ask the user to permit
        // this deliberate loopback connection. Older browsers ignore it.
        targetAddressSpace: 'loopback',
      } as RequestInit & { targetAddressSpace: 'loopback' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(typeof result?.error === 'string' ? result.error : 'The local Vector bridge did not accept pairing.');
      }
      toast.success('This computer is paired. Vector can now give safe SWISH updates.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reach the local Vector bridge.');
    } finally {
      setPairingVector(false);
    }
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'vector', label: 'Vector', icon: Bot },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and application settings</p>
      </div>

      <div className="flex gap-1 border-b border-border pb-0 -mb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="swish-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Profile Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input value={user?.email || ''} disabled className="input-field mt-0.5 opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Full Name</label>
              <input
                value={(profile.full_name as string) || ''}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                className="input-field mt-0.5"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <input
                value={(profile.phone as string) || ''}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="input-field mt-0.5"
                placeholder="+44..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Timezone</label>
              <select value={(profile.timezone as string) || 'Europe/London'} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="input-field mt-0.5">
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      )}

      {tab === 'business' && (
        <div className="swish-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Business Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            {['business_name', 'vat_number', 'default_currency', 'default_marketplace'].map(key => (
              <div key={key}>
                <label className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</label>
                <input
                  value={(profile[key] as string) || ''}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  className="input-field mt-0.5"
                />
              </div>
            ))}
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save Business Settings'}
          </button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="swish-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Notification Preferences</h3>
          {[
            { key: 'notify_orders', label: 'New Orders' },
            { key: 'notify_messages', label: 'eBay Messages' },
            { key: 'notify_returns', label: 'Returns & Cases' },
            { key: 'notify_low_stock', label: 'Low Stock Alerts' },
            { key: 'notify_repricing', label: 'Repricing Events' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <button
                onClick={() => setProfile(p => ({ ...p, [key]: !p[key] }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${profile[key] ? 'bg-primary' : 'bg-secondary'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${profile[key] ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          <button onClick={saveProfile} disabled={saving} className="btn-primary mt-2">
            <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      )}

      {tab === 'vector' && (
        <div className="space-y-4">
          <div className="swish-card overflow-hidden">
            <div className="border-b border-border bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/15 p-2.5 text-primary"><Bot className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">SWISH Vector Companion</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Turn a WirePod-connected Vector into a private desk companion for safe SWISH updates and aggregate workspace status.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5 text-sm">
              <div className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-muted-foreground">
                <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p><strong className="text-foreground">Runs locally, not in this browser.</strong> The companion bridge runs on a private computer that can reach WirePod. SwishWeb never attempts to control a robot directly from an HTTPS browser session.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-3"><span className="text-xs font-semibold text-foreground">Alerts</span><p className="mt-1 text-xs leading-5 text-muted-foreground">Announce new orders and optional inventory additions without customer or item details.</p></div>
                <div className="rounded-xl border border-border p-3"><span className="text-xs font-semibold text-foreground">Status</span><p className="mt-1 text-xs leading-5 text-muted-foreground">Speak only aggregate inventory, live-listing, and order counts.</p></div>
                <div className="rounded-xl border border-border p-3"><span className="text-xs font-semibold text-foreground">Safety</span><p className="mt-1 text-xs leading-5 text-muted-foreground">No movement, camera, buyer data, eBay secrets, or service-role access.</p></div>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground marker:text-primary">
                <li>Finish WirePod setup and confirm Vector is visible on your local network.</li>
                <li>Copy <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">vector-bridge/.env.example</code> to <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">vector-bridge/.env</code> on the companion computer.</li>
                <li>Start <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">npm run vector:bridge</code> on that same computer. It waits safely until you pair it below.</li>
                <li>Select <strong className="text-foreground">Pair this PC</strong>. The bridge receives only your current RLS-scoped session and workspace scope over loopback; it rejects service-role credentials and never sends your session back to the browser.</li>
              </ol>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Pair this PC</div>
                    <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Use this only on the computer running the local bridge. Your browser may ask to allow this site to access its local companion service; allow it only when you have started the SWISH bridge yourself.</p>
                  </div>
                  <button
                    type="button"
                    onClick={pairVectorOnThisComputer}
                    disabled={pairingVector || tenantLoading || !tenantId || !session?.access_token}
                    className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    {pairingVector ? 'Pairing…' : tenantLoading ? 'Loading workspace…' : 'Pair this PC'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://github.com/troonvinyl-ux/SwishWeb/blob/main/vector-bridge/README.md" target="_blank" rel="noreferrer" className="btn-primary">
                  <ExternalLink className="h-3.5 w-3.5" />Open Vector setup guide
                </a>
                <Link to="/orders" className="btn-secondary">Review Orders</Link>
              </div>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Connection status is intentionally shown by the local bridge, not guessed here. The bridge verifies the exact configured tenant and WirePod endpoint before it announces anything.</p>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="swish-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Account</h3>
            <div className="text-xs text-muted-foreground">Signed in as <strong className="text-foreground">{user?.email}</strong></div>
            <div className="text-xs text-muted-foreground">User ID: <code className="bg-secondary px-1 py-0.5 rounded">{user?.id}</code></div>
          </div>
          <div className="swish-card p-5">
            <h3 className="text-sm font-semibold mb-3">Session</h3>
            <button onClick={signOut} className="btn-danger">Sign Out of All Devices</button>
          </div>
        </div>
      )}
    </div>
  );
}

