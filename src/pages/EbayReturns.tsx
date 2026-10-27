import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

export default function EbayReturns() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [syncing, setSyncing] = useState(false);
  const { data, isLoading, error } = useTable('ebay_returns', {
    filter: { tenant_id: tenantId },
    order: { column: 'created_at', ascending: false },
    enabled: Boolean(tenantId),
  });
  const items = (data || []) as Record<string, unknown>[];

  const syncReturns = async () => {
    setSyncing(true);
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before syncing returns.');
      if (!tenantId || tenantLoading) throw new Error('Your SWISH workspace is not ready.');
      const { error } = await callEdgeFunction('swish-ebay-post-order', { tenantId, route: 'sync_returns' }, sb);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['ebay_returns'] });
      toast.success('eBay returns synced');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay returns.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Returns</h1>
          <p className="page-subtitle">{items.length} return requests</p>
        </div>
        <button onClick={() => void syncReturns()} disabled={syncing} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync from eBay'}
        </button>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">Return records can be synced from eBay. Accept/decline actions are not exposed by the existing secure backend, so SWISH will not report those actions as completed.</div>
      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading returns…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No return requests</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Return ID</th><th>Item</th><th>Buyer</th><th>Reason</th>
                <th>Status</th><th className="text-right">Amount</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id as string}>
                    <td><span className="text-xs font-mono text-muted-foreground">{(r.return_id || (r.id as string).slice(0, 8)) as string}</span></td>
                    <td><span className="text-xs">{truncate((r.item_title || '—') as string, 30)}</span></td>
                    <td className="text-xs">{(r.buyer_username || r.buyer_name || '—') as string}</td>
                    <td className="text-xs">{truncate((r.reason || '—') as string, 25)}</td>
                    <td>{r.status ? <span className={statusVariant(r.status as string)}>{r.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency(r.amount as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(r.created_at as string)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button disabled title="Return actions are not available through the current secure backend" className="btn-ghost py-1 px-2 text-xs opacity-50">Unavailable</button>
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
