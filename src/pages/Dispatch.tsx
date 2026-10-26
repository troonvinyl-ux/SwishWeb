import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDate, truncate } from '@/lib/utils';
import { Truck, RefreshCw, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callEdgeFunction, getSupabaseClientAsync } from '@/lib/supabase';

export default function Dispatch() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const preferredNiche = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins').toLowerCase();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const activeNiche = String((isOwner ? localStorage.getItem('swish_active_niche') : preferredNiche) || preferredNiche).toLowerCase();
  const specialistIds: string[] =
    ['clothing', 'fashion', 'threads', 'threads_flip', 'trainers', 'trainers_sneakers'].includes(activeNiche) ? ['clothing', 'trainers_sneakers'] :
    ['bicycles', 'bikes', 'cycling', 'bike_flipper'].includes(activeNiche) ? ['bicycles', 'bikes'] :
    ['motocross', 'mx', 'flipper_mx'].includes(activeNiche) ? ['motocross', 'mx'] :
    ['surplus_flip', 'surplus-flip', 'surplus_trader', 'catalog_flip', 'catalog_surplus'].includes(activeNiche) ? ['surplus_trader', 'surplus_flip'] :
    ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic'].includes(activeNiche) ? ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic', 'curiosities_collectibles'] : [];
  const { data, isLoading, error } = useTable('orders', {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay', status: 'awaiting_dispatch' },
    inFilter: specialistIds.length ? { 'items.specialist_id': specialistIds } : undefined,
    enabled: Boolean(tenantId) && specialistIds.length > 0,
    order: { column: 'dispatch_by', ascending: true },
  });

  const items = (data || []) as Record<string, unknown>[];
  const [tracking, setTracking] = useState<Record<string, { number: string; carrier: string }>>({});

  const handleDispatch = async (orderDbId: string) => {
    const t = tracking[orderDbId] || { number: '', carrier: '' };
    if (!tenantId) { toast.error('Your SWISH workspace is not ready.'); return; }
    if (!t.number.trim() || !t.carrier.trim()) {
      toast.error('Enter the tracking number and carrier before dispatching.');
      return;
    }
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('Backend not connected.');
      const { error } = await callEdgeFunction('swish-ebay-post-order', {
        route: 'dispatch',
        tenantId,
        orderId: orderDbId,
        trackingNumber: t.number.trim(),
        carrier: t.carrier.trim(),
      }, sb);
      if (error) throw error;
      toast.success('eBay confirmed dispatch');
      await qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      // Never mark an order dispatched locally when eBay rejects or the
      // authoritative fulfilment endpoint fails.
      toast.error(error instanceof Error ? error.message : 'eBay dispatch failed. Order remains awaiting dispatch.');
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

      {isLoading || tenantLoading ? (
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
                      onClick={() => handleDispatch(o.id as string)}
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
