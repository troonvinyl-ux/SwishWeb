import { useTable } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';
import { getSupabaseClientAsync } from '@/lib/supabase';

export default function EbayCases() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const { data, isLoading, error } = useTable('ebay_cases', {
    order: { column: 'created_at', ascending: false },
    filter: { tenant_id: tenantId },
    enabled: Boolean(tenantId),
  });
  const items = (data || []) as Record<string, unknown>[];

  const syncCases = async () => {
    if (!tenantId) {
      toast.error('Your SWISH workspace is not ready. Please retry after signing in.');
      return;
    }
    setSyncing(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('Backend not connected.');
      const { error } = await callEdgeFunction('swish-ebay-post-order', {
        route: 'sync_cases',
        tenantId,
      }, sb);
      if (error) throw error;
      toast.success('eBay cases synced');
      await qc.invalidateQueries({ queryKey: ['ebay_cases'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay cases');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Cases</h1>
          <p className="page-subtitle">{tenantLoading ? 'Loading workspace…' : `${items.length} cases`}</p>
          <p className="text-xs text-muted-foreground mt-1">Case responses are not supported by the current shared backend. Use eBay Seller Hub to respond; SWISH will not report a response as submitted.</p>
        </div>
        <button onClick={syncCases} disabled={syncing || !tenantId} className="btn-ghost">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync cases'}
        </button>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading cases…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No cases open</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Case ID</th><th>Type</th><th>Item</th><th>Buyer</th>
                <th>Status</th><th className="text-right">Amount</th><th>Date</th><th></th>
              </tr></thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id as string}>
                    <td><span className="text-xs font-mono text-muted-foreground">{(c.case_id || (c.id as string).slice(0, 8)) as string}</span></td>
                    <td className="text-xs capitalize">{(c.type || '—') as string}</td>
                    <td className="text-xs">{truncate((c.item_title || '—') as string, 30)}</td>
                    <td className="text-xs">{(c.buyer_username || c.buyer_name || '—') as string}</td>
                    <td>{c.status ? <span className={statusVariant(c.status as string)}>{c.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency(c.amount as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(c.created_at as string)}</td>
                    <td>
                      <span className="text-xs text-muted-foreground" title="The authoritative SWISH backend does not currently expose a case-response route.">
                        Respond in eBay
                      </span>
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
