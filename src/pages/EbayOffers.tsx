import { useState } from 'react';
import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw, CheckCircle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EbayOffers() {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);

  const { data, isLoading, error } = useTable('ebay_offers', { order: { column: 'created_at', ascending: false } });
  const items = (data || []) as Record<string, unknown>[];

  const handle = async (offerId: string, action: 'accept' | 'decline' | 'counter', counterPrice?: number) => {
    setProcessing(offerId);
    const { error } = await callEdgeFunction('ebay-offer-action', {
      offer_id: offerId,
      action,
      counter_price: counterPrice,
    });
    if (error) toast.error(error.message);
    else { toast.success(`Offer ${action}ed`); qc.invalidateQueries({ queryKey: ['ebay_offers'] }); }
    setProcessing(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Offers</h1>
          <p className="page-subtitle">{items.filter(o => o.status === 'pending').length} pending · {items.length} total</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['ebay_offers'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading offers…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No offers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Item</th><th>Buyer</th><th>Status</th>
                <th className="text-right">Listed</th><th className="text-right">Offer</th>
                <th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {items.map(o => (
                  <tr key={o.id as string}>
                    <td className="text-xs">{truncate((o.item_title || '—') as string, 35)}</td>
                    <td className="text-xs">{(o.buyer_username || o.buyer_name || '—') as string}</td>
                    <td>{o.status ? <span className={statusVariant(o.status as string)}>{o.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs">{formatCurrency((o.listed_price || o.original_price) as number)}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((o.offer_price || o.price) as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(o.created_at as string)}</td>
                    <td>
                      {o.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handle(o.id as string, 'accept')} disabled={processing === o.id} className="btn-ghost py-1 px-2 text-xs text-success">
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => handle(o.id as string, 'decline')} disabled={processing === o.id} className="btn-ghost py-1 px-2 text-xs text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
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
