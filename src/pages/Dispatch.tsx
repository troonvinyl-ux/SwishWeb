import { useState } from 'react';
import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { formatDate, truncate } from '@/lib/utils';
import { Truck, RefreshCw, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callEdgeFunction } from '@/lib/supabase';

export default function Dispatch() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTable('orders', {
    filter: { status: 'awaiting_dispatch' },
    order: { column: 'dispatch_by', ascending: true },
  });
  const update = useUpdate('orders');

  const items = (data || []) as Record<string, unknown>[];
  const [tracking, setTracking] = useState<Record<string, { number: string; carrier: string }>>({});

  const handleDispatch = async (orderId: string, orderDbId: string) => {
    const t = tracking[orderDbId] || {};
    const { error } = await callEdgeFunction('dispatch-order', {
      order_id: orderId,
      tracking_number: t.number,
      carrier: t.carrier,
    });
    if (error) {
      // fallback: update directly
      update.mutate({ id: orderDbId, updates: { status: 'dispatched', tracking_number: t.number, carrier: t.carrier, dispatched_at: new Date().toISOString() } }, {
        onSuccess: () => { toast.success('Marked as dispatched'); qc.invalidateQueries({ queryKey: ['orders'] }); },
        onError: e => toast.error(e.message),
      });
    } else {
      toast.success('Dispatched via backend');
      qc.invalidateQueries({ queryKey: ['orders'] });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dispatch</h1>
          <p className="page-subtitle">{items.length} orders awaiting dispatch</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['orders'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : error ? (
        <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
      ) : items.length === 0 ? (
        <div className="swish-card p-12 text-center">
          <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No orders awaiting dispatch</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(o => {
            const t = tracking[o.id as string] || { number: '', carrier: '' };
            const isLate = o.dispatch_by && new Date(o.dispatch_by as string) < new Date();
            return (
              <div key={o.id as string} className="swish-card p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{truncate((o.item_title || o.external_order_id || 'Order') as string, 40)}</span>
                      {isLate && <span className="status-error">LATE</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(o.buyer_name || o.buyer_username || 'Buyer') as string} · {(o.platform || '') as string}
                      {o.dispatch_by && ` · Dispatch by ${formatDate(o.dispatch_by as string)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={t.number}
                      onChange={e => setTracking(p => ({ ...p, [o.id as string]: { ...t, number: e.target.value } }))}
                      placeholder="Tracking number"
                      className="input-field w-40 text-xs"
                    />
                    <select
                      value={t.carrier}
                      onChange={e => setTracking(p => ({ ...p, [o.id as string]: { ...t, carrier: e.target.value } }))}
                      className="input-field w-28 text-xs"
                    >
                      <option value="">Carrier…</option>
                      <option value="Royal Mail">Royal Mail</option>
                      <option value="Evri">Evri</option>
                      <option value="DPD">DPD</option>
                      <option value="Parcelforce">Parcelforce</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                    </select>
                    <button
                      onClick={() => handleDispatch((o.external_order_id || o.order_id || o.id) as string, o.id as string)}
                      className="btn-primary"
                    >
                      <Truck className="w-3.5 h-3.5" />Mark Dispatched
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
