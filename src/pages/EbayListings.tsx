import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw, Search, ExternalLink, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';
import { Link } from 'react-router-dom';
import { callEdgeFunction, getSupabaseClientAsync } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EbayListings() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const activeNiche = getActiveNicheId();
  const specialistIds = getSpecialistIdsForNiche(activeNiche);

  const { data, isLoading, error } = useTable('listings', {
    select: '*, items!inner(specialist_id)',
    order: { column: 'created_at', ascending: false },
    search: search ? { column: 'title', query: search } : undefined,
    filter: { tenant_id: tenantId, marketplace_id: 'ebay', ...(status ? { status } : {}) },
    inFilter: { 'items.specialist_id': specialistIds },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });

  const items = (data || []) as Record<string, unknown>[];

  const syncListings = async () => {
    if (!tenantId) {
      toast.error('Your SWISH workspace is not ready. Please retry after signing in.');
      return;
    }
    setSyncing(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('Backend not connected.');
      // Use the existing authoritative sync function and its tenant-scoped contract.
      const { error } = await callEdgeFunction('swish-ebay-sync', { tenantId, mode: 'full' }, sb);
      if (error) throw error;

      // Reuse the Main App's server-side image pipeline after listing sync.
      // It downloads the complete eBay gallery into permanent item-images storage.
      const { error: imageError } = await callEdgeFunction(
        'swish-image-download',
        { tenantId, fixTitles: false },
        sb,
      );

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['listings'] }),
        qc.invalidateQueries({ queryKey: ['items'] }),
      ]);

      if (imageError) {
        toast.warning('Listings synced, but image download did not complete: ' + imageError.message);
      } else {
        toast.success('eBay listings and image sync completed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay listings');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">eBay Listings</h1>
          <p className="page-subtitle">{tenantLoading ? 'Loading workspace…' : `${items.length} listings`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncListings} disabled={syncing} className="btn-secondary">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync'}
          </button>
          <Link to="/listings/new" className="btn-primary"><Plus className="w-3.5 h-3.5" />New Listing</Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…" className="input-field pl-8" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field w-auto min-w-32">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading eBay listings…</div>
        ) : !tenantId ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Your SWISH workspace could not be found. Complete setup and try again.</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No eBay listings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Title</th><th>eBay ID</th><th>Status</th>
                <th className="text-right">Price</th><th>Views</th><th>Watchers</th>
                <th>End Date</th><th></th>
              </tr></thead>
              <tbody>
                {items.map(l => (
                  <tr key={l.id as string}>
                    <td><span className="text-xs font-medium">{truncate((l.title || 'Untitled') as string, 40)}</span></td>
                    <td><span className="text-xs font-mono text-muted-foreground">{(l.ebay_listing_id || l.external_id || '—') as string}</span></td>
                    <td>{l.status ? <span className={statusVariant(l.status as string)}>{l.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((l.price || l.listed_price) as number)}</td>
                    <td className="text-xs text-muted-foreground">{(l.views ?? '—') as number}</td>
                    <td className="text-xs text-muted-foreground">{(l.watchers ?? '—') as number}</td>
                    <td className="text-xs text-muted-foreground">{(l.end_time || l.end_date) ? formatDate((l.end_time || l.end_date) as string) : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/listings/${l.id}`} className="btn-ghost py-1 px-2 text-xs">Edit</Link>
                        {l.url && <a href={l.url as string} className="btn-ghost py-1 px-2" aria-label="Open eBay listing in this tab" title="Open eBay listing (use browser Back to return)"><ExternalLink className="w-3 h-3" /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
