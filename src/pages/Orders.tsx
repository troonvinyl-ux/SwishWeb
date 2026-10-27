import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, formatDateTime, statusVariant, truncate } from '@/lib/utils';
import { ShoppingCart, RefreshCw, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';

export default function Orders() {
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const activeNiche = getActiveNicheId();
  const specialistIds = getSpecialistIdsForNiche(activeNiche);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useTable('orders', {
    select: '*, items(specialist_id)',
    order: { column: 'created_at', ascending: false },
    filter: { tenant_id: tenantId, marketplace_id: 'ebay', ...(status ? { status } : {}) },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
    search: search ? { column: 'buyer_name', query: search } : undefined,
  });

  const items = ((data || []) as Record<string, unknown>[]).filter(order => {
    const linked = order.items as Record<string, unknown> | Record<string, unknown>[] | null;
    const linkedItems = Array.isArray(linked) ? linked : linked ? [linked] : [];
    return linkedItems.some(item => specialistIds.includes(String(item.specialist_id || '')));
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{items.length} orders</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['orders'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buyer…" className="input-field pl-8" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field w-auto min-w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="awaiting_dispatch">Awaiting Dispatch</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading orders…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Order</th><th>Buyer</th><th>Item</th><th>Platform</th>
                <th>Status</th><th className="text-right">Total</th>
                <th>Dispatch By</th><th>Date</th>
              </tr></thead>
              <tbody>
                {items.map(o => (
                  <tr key={o.id as string}>
                    <td><span className="text-xs font-mono text-muted-foreground">{(o.external_order_id || o.order_id || (o.id as string).slice(0, 8)) as string}</span></td>
                    <td className="text-xs">{(o.buyer_name || o.buyer_username || '—') as string}</td>
                    <td className="text-xs">{truncate((o.item_title || '—') as string, 35)}</td>
                    <td className="text-xs capitalize">{(o.platform || '—') as string}</td>
                    <td>{o.status ? <span className={statusVariant(o.status as string)}>{o.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((o.total_amount || o.sale_price) as number)}</td>
                    <td className="text-xs">{o.dispatch_by ? <span className={new Date(o.dispatch_by as string) < new Date() ? 'text-destructive' : 'text-warning'}>{formatDate(o.dispatch_by as string)}</span> : '—'}</td>
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
