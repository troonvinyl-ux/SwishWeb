import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useEbayHubActions } from '@/hooks/useEbayHubActions';
import { formatDateTime } from '@/lib/utils';
import type { EbayConnector } from '@/types/marketplace';

const QUICK_LINKS = [
  { to: '/ebay/account', label: 'Account health' }, { to: '/ebay/listings', label: 'Listings' },
  { to: '/ebay/orders', label: 'Orders' }, { to: '/ebay/messages', label: 'Messages' },
  { to: '/ebay/offers', label: 'Offers' }, { to: '/ebay/returns', label: 'Returns' },
  { to: '/ebay/cases', label: 'Cases' }, { to: '/ebay/finances', label: 'Finances' },
  { to: '/ebay/analytics', label: 'Analytics' }, { to: '/ebay/import', label: 'Import / Export' },
  { to: '/ebay/logs', label: 'Logs' },
];
export default function EbayHub() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useCurrentTenantId();
  const query = useTable('marketplace_connectors', {
    select: 'status,seller_account_id,access_token_expires_at,connected_at,last_sync_at',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' }, enabled: Boolean(tenantId), limit: 1,
  });
  const { connect, sync, connecting, syncing, syncError } = useEbayHubActions(tenantId);
  const account = (query.data?.[0] as EbayConnector | undefined) ?? null;
  const isConnected = account?.status === 'connected';
  const tokenExpiry = account?.access_token_expires_at;
  const tokenExpired = Boolean(tokenExpiry && new Date(tokenExpiry) <= new Date());
  const error = tenantError || query.error;
  const loading = tenantLoading || (Boolean(tenantId) && query.isLoading);
  return <div className="max-w-6xl space-y-6">
    <header className="swish-card border-primary/30 p-6"><p className="text-sm font-semibold uppercase tracking-widest text-primary">SWISH / SHARED MARKETPLACE</p><h1 className="page-title mt-2">eBay Hub</h1><p className="mt-3 leading-7 text-muted-foreground">Manage your existing shared eBay seller connection. After eBay confirms authorisation, return to this web tab or reopen this page. SWISH checks the connector; it does not assume consent or automatically repeat your request.</p></header>
    {error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/40 p-4 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error.message}</span></div>}
    <section className="swish-card p-6">{loading ? <p role="status" className="text-muted-foreground">Loading account…</p> : <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">{isConnected && !tokenExpired ? <CheckCircle2 className="h-6 w-6 text-success" /> : <AlertCircle className="h-6 w-6 text-muted-foreground" />}<div><h2 className="text-lg font-semibold">{error ? 'Connection status unavailable' : account?.seller_account_id || (tenantId ? 'No eBay account connected' : 'Workspace not ready')}</h2><p className="mt-1 text-sm text-muted-foreground">{error ? 'Refresh account health before reconnecting.' : tokenExpired ? 'Access token expired — re-authorise required' : isConnected ? tokenExpiry ? `Token valid until ${formatDateTime(tokenExpiry)}` : 'Connected' : 'Connect your existing seller account to enable marketplace features.'}</p></div></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void query.refetch()} disabled={!tenantId || query.isFetching || connecting || syncing} className="btn-secondary min-h-11 disabled:opacity-50">Refresh status</button>{isConnected && !tokenExpired && <button type="button" onClick={() => void sync()} disabled={syncing || connecting || !tenantId} className="btn-secondary min-h-11 disabled:opacity-50"><RefreshCw className="h-4 w-4" />{syncing ? 'Syncing…' : 'Sync now'}</button>}<button type="button" onClick={() => void connect()} disabled={connecting || syncing || tenantLoading || !tenantId} className="btn-primary min-h-11 disabled:opacity-50"><Link2 className="h-4 w-4" />{connecting ? 'Checking authorisation…' : isConnected ? 'Re-authorise' : 'Connect eBay'}</button></div>
    </div>}{syncError && <p role="alert" className="mt-4 border-t border-border pt-4 text-destructive">{syncError}</p>}</section>
    <section><h2 className="mb-4 text-lg font-semibold">Seller workspace</h2><nav aria-label="eBay sections" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{QUICK_LINKS.map(link => <Link key={link.to} to={link.to} className="swish-card flex min-h-14 items-center p-4 font-medium hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{link.label}</Link>)}</nav></section>
    {account && !error && <aside className="swish-card p-6"><h2 className="text-lg font-semibold">Account details</h2><dl className="mt-4 grid gap-4 sm:grid-cols-3">{[['Status', account.status], ['Connected', account.connected_at ? formatDateTime(account.connected_at) : 'Not recorded'], ['Last sync', account.last_sync_at ? formatDateTime(account.last_sync_at) : 'Not recorded']].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl></aside>}
  </div>;
}
