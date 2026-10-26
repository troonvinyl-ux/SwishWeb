import { useTable } from '@/hooks/useSupabaseQuery';
import { useState } from 'react';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { callEdgeFunction, EdgeFunctionError, getSupabaseClientAsync } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function EbayOrders() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const { data, isLoading } = useTable('ebay_orders', {
    filter: { tenant_id: tenantId },
    order: { column: 'created_at', ascending: false },
    enabled: Boolean(tenantId),
  });
  const { data: fallback } = useTable('orders', {
    filter: { tenant_id: tenantId, platform: 'ebay' },
    order: { column: 'created_at', ascending: false },
    enabled: Boolean(tenantId) && (!data || (data as unknown[]).length === 0),
  });

  const items = ((data && (data as unknown[]).length > 0 ? data : fallback) || []) as Record<string, unknown>[];

  const syncOrders = async () => {
    if (!tenantId) { toast.error('Your SWISH workspace is not ready.'); return; }
    setSyncing(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected.');
      const { error } = await callEdgeFunction('swish-ebay-orders', {
        tenantId,
        daysBack: 90,
        mode: 'both',
      }, sb);
      if (error) throw error;
      toast.success('eBay orders sync completed');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ebay_orders'] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
      ]);
    } catch (error) {
      toast.error(error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'Could not sync eBay orders');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Orders</h1>
          <p className="page-subtitle">{tenantLoading ? 'Loading workspace…' : `${items.length} orders`}</p>
        </div>
        <button onClick={syncOrders} disabled={syncing || !tenantId} className="btn-ghost">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync orders'}
        </button>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading eBay orders…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No eBay orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Order ID</th><th>Buyer</th><th>Item</th><th>Status</th>
                <th className="text-right">Total</th><th>Date</th>
              </tr></thead>
              <tbody>
                {items.map(o => (
                  <tr key={o.id as string}>
                    <td><span className="text-xs font-mono text-muted-foreground">{(o.external_order_id || o.order_id || (o.id as string).slice(0, 8)) as string}</span></td>
                    <td className="text-xs">{(o.buyer_name || o.buyer_username || '—') as string}</td>
                    <td className="text-xs">{truncate((o.item_title || '—') as string, 35)}</td>
                    <td>{o.status ? <span className={statusVariant(o.status as string)}>{o.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((o.total_amount || o.sale_price) as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(o.created_at as string)}</td>
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
