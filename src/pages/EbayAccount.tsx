import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDateTime } from '@/lib/utils';
import EbayCapabilities from '@/components/features/EbayCapabilities';
import type { EbayConnector } from '@/types/marketplace';

export default function EbayAccount() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useCurrentTenantId();
  const query = useTable('marketplace_connectors', {
    select: 'status,seller_account_id,access_token_expires_at,connected_at,last_sync_at,can_list,can_publish,can_reprice,can_read_orders,can_fulfil',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' }, enabled: Boolean(tenantId), limit: 1,
  });
  const connector = (query.data?.[0] as EbayConnector | undefined) ?? null;
  const error = tenantError || query.error;
  const loading = tenantLoading || (Boolean(tenantId) && query.isLoading);
  const expired = Boolean(connector?.access_token_expires_at && new Date(connector.access_token_expires_at) <= new Date());
  const connected = connector?.status === 'connected';
  const date = (value: string | null | undefined) => value ? formatDateTime(value) : 'Not recorded';
  return <div className="max-w-6xl space-y-6">
    <header className="swish-card flex flex-wrap items-center justify-between gap-4 border-primary/30 p-6"><div><div className="mb-2 flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /><span className="text-sm font-semibold">SWISH / SHARED MARKETPLACE</span></div><h1 className="page-title">eBay account</h1><p className="mt-2 text-muted-foreground">Connection health and seller capabilities from your existing workspace.</p></div><Link to="/ebay" className="btn-primary min-h-11">{connected ? 'Manage connection' : 'Connect eBay'}</Link></header>
    {error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/40 p-4 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error.message}</span></div>}
    {loading ? <p role="status" className="p-6 text-muted-foreground">Loading account health…</p> : !tenantId ? <p className="swish-card p-6">Your workspace has not been resolved. No account data has been requested.</p> : !error && <div className="grid gap-6 lg:grid-cols-2">
      <section className="swish-card space-y-4 p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{connected ? 'eBay connected' : 'Not connected'}</h2><button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh account health" className="btn-secondary min-h-11 min-w-11 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button></div><dl className="space-y-4">{[
        ['Seller account', connector?.seller_account_id || 'Not connected'], ['Token status', expired ? 'Expired — re-authorise required' : connected ? 'Connected' : 'Not obtained'],
        ['Access token expiry', date(connector?.access_token_expires_at)], ['Connected', date(connector?.connected_at)], ['Last sync', date(connector?.last_sync_at)],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><p className="text-sm leading-6 text-muted-foreground">The browser never reads marketplace tokens or encrypted credentials.</p></section>
      <EbayCapabilities connector={connector} />
    </div>}
    <aside className="swish-card space-y-3 p-6"><h2 className="text-lg font-semibold">Policies and partner access</h2><p className="leading-7 text-muted-foreground">Simple Delivery remains the default. Manage account policies in eBay Seller Hub. Purchasing, bidding, offers, promotions and finance access require the applicable eBay approval; SWISH does not infer that access from a connected account.</p><a href="https://www.ebay.co.uk/sh/ovw" target="_blank" rel="noreferrer" className="btn-secondary min-h-11"><ExternalLink className="h-4 w-4" />Open eBay Seller Hub</a></aside>
  </div>;
}
