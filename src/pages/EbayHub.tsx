import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDate, formatDateTime } from '@/lib/utils';
import { RefreshCw, CheckCircle, AlertCircle, Link2, Link2Off, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function EbayHub() {
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const connectedNoticeShown = useRef(false);
  const qc = useQueryClient();

  const { data: accounts, isLoading } = useTable('ebay_accounts', { limit: 1 });

  useEffect(() => {
    if (accounts && accounts.length > 0) setAccount(accounts[0] as Record<string, unknown>);
  }, [accounts]);

  // The OAuth callback is completed server-side. Mirror the mobile app by
  // watching the canonical tenant marketplace connector until it becomes connected.
  useEffect(() => {
    if (!tenantId || !connecting) return;
    const sb = getSupabaseClient();
    if (!sb) return;
    let stopped = false;
    let attempts = 0;
    const refreshConnection = async () => {
      if (stopped) return;
      attempts += 1;
      const { data, error } = await sb
        .from('marketplace_connectors')
        .select('status, seller_account_id, access_token_expires_at, last_sync_at')
        .eq('tenant_id', tenantId)
        .eq('marketplace_id', 'ebay')
        .maybeSingle();
      if (stopped) return;
      if (!error && data?.status === 'connected') {
        setAccount(previous => ({
          ...(previous || {}),
          status: 'active',
          username: data.seller_account_id || previous?.username || 'eBay Account',
          token_expires_at: data.access_token_expires_at || previous?.token_expires_at,
        }));
        setConnecting(false);
        await Promise.all([
          'ebay_accounts', 'marketplace_connectors', 'items', 'listings',
          'ebay_listings', 'orders', 'ebay_orders', 'sales', 'fees', 'payouts', 'messages',
        ].map(table => qc.invalidateQueries({ queryKey: [table] })));
        if (!connectedNoticeShown.current) {
          connectedNoticeShown.current = true;
          toast.success('eBay connected successfully');
        }
      } else if (attempts >= 200) {
        setConnecting(false);
        toast.message('Still waiting for eBay authorisation. If you completed it, refresh the connection status or reconnect.');
      }
    };
    void refreshConnection();
    const timer = window.setInterval(() => { void refreshConnection(); }, 3000);
    const onFocus = () => { void refreshConnection(); };
    window.addEventListener('focus', onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [tenantId, connecting, qc]);

  const handleConnect = async () => {
    setConnecting(true);
    connectedNoticeShown.current = false;
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before connecting eBay.');
      const membershipResult = await sb
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      let membership = membershipResult.data;
      if (membershipResult.error) throw membershipResult.error;

      // Web signup may finish before the tenant provisioning trigger has run.
      // Use the same existing provisioning RPC as the mobile app; never invent
      // a tenant id or bypass the tenant-membership security boundary.
      if (!membership?.tenant_id) {
        const storeName = String(
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'My',
        ).trim() + "'s Store";
        const slugBase = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'swish-store';
        const slug = `${slugBase}-${Date.now().toString(36)}`;
        const { data: provisionedTenantId, error: provisionError } = await sb.rpc('swish_provision_tenant', {
          p_user_id: user.id,
          p_tenant_name: storeName,
          p_slug: slug,
        });
        if (provisionError) throw new Error(`Could not initialise your SWISH workspace: ${provisionError.message}`);
        const { data: refreshedMembership, error: refreshedMembershipError } = await sb
          .from('tenant_memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (refreshedMembershipError) throw refreshedMembershipError;
        membership = refreshedMembership?.tenant_id
          ? refreshedMembership
          : provisionedTenantId
            ? { tenant_id: String(provisionedTenantId) }
            : null;
      }
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace could not be initialised. Please complete setup or contact support.');
      setTenantId(membership.tenant_id);
      const { data, error } = await callEdgeFunction<Record<string, unknown>>('swish-ebay-oauth', {
        action: 'start_subscriber_authorization',
        tenantId: membership.tenant_id,
      }, sb);
      if (error) throw error;
      const url = data?.consentUrl;
      if (typeof url !== 'string' || !url.startsWith('https://auth.ebay.com/')) {
        throw new Error('The existing eBay authorisation service did not return a valid eBay consent URL.');
      }
      // Use same-tab OAuth on the web. eBay's consent page necessarily opens on
      // eBay, then its configured callback returns the user to this SWISH app.
      // Avoid pop-up/new-tab behaviour, especially on mobile Safari.
      window.location.assign(url);
    } catch (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'Could not start eBay connection';
      toast.error(msg);
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    const { data, error } = await callEdgeFunction('ebay-sync', {});
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      setSyncError(msg);
      toast.error(msg);
    } else {
      const result = data as Record<string, unknown>;
      const msg = result?.message as string || 'eBay sync complete';
      await Promise.all(['ebay_accounts', 'items', 'listings', 'ebay_listings', 'orders', 'ebay_orders', 'sales', 'fees', 'payouts', 'messages'].map(table => qc.invalidateQueries({ queryKey: [table] })));
      toast.success(msg);
    }
    setSyncing(false);
  };

  const isConnected = account?.status === 'active';
  const tokenExpiry = account?.token_expires_at as string | undefined;
  const tokenExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;

  const QUICK_LINKS = [
    { to: '/ebay/listings', label: 'Listings' },
    { to: '/ebay/orders', label: 'Orders' },
    { to: '/ebay/messages', label: 'Messages' },
    { to: '/ebay/offers', label: 'Offers' },
    { to: '/ebay/returns', label: 'Returns' },
    { to: '/ebay/cases', label: 'Cases' },
    { to: '/ebay/finances', label: 'Finances' },
    { to: '/ebay/analytics', label: 'Analytics' },
    { to: '/ebay/import', label: 'Import / Export' },
    { to: '/ebay/logs', label: 'Logs' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <span className="text-sm font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">eB</span>
          eBay Hub
        </h1>
        <p className="page-subtitle">Manage your eBay account integration</p>
      </div>

      {/* Account status card */}
      <div className="swish-card p-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading account…</p>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected && !tokenExpired ? 'bg-green-500/15' : 'bg-destructive/15'}`}>
                {isConnected && !tokenExpired
                  ? <CheckCircle className="w-5 h-5 text-success" />
                  : <AlertCircle className="w-5 h-5 text-destructive" />}
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {account ? ((account.username || account.ebay_username || 'eBay Account') as string) : 'No eBay Account Connected'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isConnected
                    ? tokenExpired
                      ? '⚠ Token expired — reconnect to restore access'
                      : tokenExpiry
                        ? `Token valid until ${formatDateTime(tokenExpiry)}`
                        : 'Connected'
                    : 'Connect your eBay account to enable marketplace features'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected && !tokenExpired && (
                <button onClick={handleSync} disabled={syncing} className="btn-secondary">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
              )}
              <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                {isConnected
                  ? <Link2 className="w-3.5 h-3.5" />
                  : <Link2Off className="w-3.5 h-3.5" />}
                {connecting ? 'Opening…' : isConnected ? (tokenExpired ? 'Reconnect' : 'Re-authorise') : 'Connect eBay'}
              </button>
            </div>
          </div>
        )}
        {syncError && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-destructive">{syncError}</p>
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div>
        <h3 className="text-sm font-semibold mb-3">eBay Sections</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="swish-card p-4 text-center text-sm font-medium hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Account details — safe display, no credentials */}
      {account && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3">Account Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Username', value: (account.username || account.ebay_username || '—') as string },
              { label: 'Status', value: (account.status || '—') as string },
              { label: 'Connected', value: account.connected_at ? formatDate(account.connected_at as string) : '—' },
              { label: 'Token expires', value: tokenExpiry ? formatDateTime(tokenExpiry) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm mt-0.5 ${label === 'Status' && value === 'active' ? 'text-success font-medium' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
