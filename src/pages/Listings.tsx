import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { Tag, Plus, RefreshCw, Search, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';

export default function Listings() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const specialistIds = getSpecialistIdsForNiche(getActiveNicheId());

  const { data, isLoading, error } = useTable('listings', {
    select: '*, items!inner(specialist_id)',
    order: { column: 'created_at', ascending: false },
    search: search ? { column: 'title', query: search } : undefined,
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: { 'items.specialist_id': specialistIds },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });

  const items = (data || []) as Record<string, unknown>[];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Listings</h1>
          <p className="page-subtitle">{items.length} listings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['listings'] })} className="btn-ghost"><RefreshCw className="w-3.5 h-3.5" /></button>
          <Link to="/listings/new" className="btn-primary"><Plus className="w-3.5 h-3.5" />New Listing</Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…" className="input-field pl-8" />
        </div>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading listings…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No listings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Title</th><th>Platform</th><th>Status</th>
                <th className="text-right">Price</th><th>Views</th><th>Watchers</th>
                <th>Listed</th><th></th>
              </tr></thead>
              <tbody>
                {items.map(l => (
                  <tr key={l.id as string}>
                    <td>
                      <div className="font-medium text-xs">{truncate((l.title || 'Untitled') as string, 45)}</div>
                      {l.external_id && <div className="text-xs text-muted-foreground font-mono">{l.external_id as string}</div>}
                    </td>
                    <td className="text-xs capitalize">eBay</td>
                    <td>{l.status ? <span className={statusVariant(l.status as string)}>{l.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency(l.price as number)}</td>
                    <td className="text-xs text-muted-foreground">{(l.views ?? '—') as number}</td>
                    <td className="text-xs text-muted-foreground">{(l.watchers ?? '—') as number}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(l.created_at as string)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/listings/${l.id}`} className="btn-ghost py-1 px-2 text-xs">Edit</Link>
                        {l.url && <a href={l.url as string} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 px-2"><ExternalLink className="w-3 h-3" /></a>}
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
