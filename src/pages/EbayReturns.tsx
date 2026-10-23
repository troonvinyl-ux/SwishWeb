import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';

export default function EbayReturns() {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const { data, isLoading, error } = useTable('ebay_returns', { order: { column: 'created_at', ascending: false } });
  const items = (data || []) as Record<string, unknown>[];

  const handle = async (returnId: string, action: string) => {
    setProcessing(returnId);
    const { error } = await callEdgeFunction('ebay-return-action', { return_id: returnId, action });
    if (error) toast.error(error.message);
    else { toast.success(`Return ${action}`); qc.invalidateQueries({ queryKey: ['ebay_returns'] }); }
    setProcessing(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Returns</h1>
          <p className="page-subtitle">{items.length} return requests</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['ebay_returns'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading ? (
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
                        <button onClick={() => handle(r.id as string, 'accept')} disabled={processing === r.id} className="btn-ghost py-1 px-2 text-xs text-success">Accept</button>
                        <button onClick={() => handle(r.id as string, 'decline')} disabled={processing === r.id} className="btn-ghost py-1 px-2 text-xs text-destructive">Decline</button>
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
