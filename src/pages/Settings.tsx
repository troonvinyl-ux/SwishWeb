import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { Settings as SettingsIcon, User, Bell, Shield, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
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

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
