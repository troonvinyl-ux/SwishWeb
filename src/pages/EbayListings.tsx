import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw, Search, ExternalLink, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { callEdgeFunction, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function EbayListings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const preferredNiche = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins').toLowerCase();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const activeNiche = String((isOwner ? localStorage.getItem('swish_active_niche') : preferredNiche) || preferredNiche).toLowerCase();
  const specialistIds: string[] =
    ['clothing', 'fashion', 'threads', 'threads_flip', 'trainers', 'trainers_sneakers'].includes(activeNiche)
      ? ['clothing', 'trainers_sneakers']
      : ['bicycles', 'bikes', 'cycling', 'bike_flipper'].includes(activeNiche)
        ? ['bicycles', 'bikes']
        : ['motocross', 'mx', 'flipper_mx'].includes(activeNiche)
          ? ['motocross', 'mx']
          : ['surplus_flip', 'surplus-flip', 'surplus_trader', 'catalog_flip', 'catalog_surplus'].includes(activeNiche)
            ? ['surplus_trader', 'surplus_flip']
            : ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic'].includes(activeNiche)
              ? ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic', 'curiosities_collectibles']
              : [];

  const { data, isLoading, error } = useTable('listings', {
    select: '*, items!inner(specialist_id)',
    order: { column: 'created_at', ascending: false },
    search: search ? { column: 'title', query: search } : undefined,
    filter: { marketplace_id: 'ebay', ...(status ? { status } : {}) },
    inFilter: specialistIds.length ? { 'items.specialist_id': specialistIds } : undefined,
    enabled: specialistIds.length > 0,
  });

  const items = (data || []) as Record<string, unknown>[];

  const syncListings = async () => {
    setSyncing(true);
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before syncing listings.');
      const { data: membership, error: membershipError } = await sb
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready.');
      const { error } = await callEdgeFunction('swish-ebay-sync', {
        tenantId: membership.tenant_id, mode: 'full',
      }, sb);
      if (error) throw error;
      await Promise.all([
        'marketplace_connectors', 'items', 'listings', 'orders', 'sales',
      ].map(table => qc.invalidateQueries({ queryKey: [table] })));
      toast.success('eBay listings synced');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay listings.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">eBay Listings</h1>
          <p className="page-subtitle">{items.length} listings</p>
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
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading eBay listings…</div>
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
