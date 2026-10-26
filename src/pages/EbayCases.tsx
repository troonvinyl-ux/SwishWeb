import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';

export default function EbayCases() {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const { data, isLoading, error } = useTable('ebay_cases', { order: { column: 'created_at', ascending: false } });
  const items = (data || []) as Record<string, unknown>[];

  const respond = async (caseId: string) => {
    setProcessing(caseId);
    const { error } = await callEdgeFunction('ebay-case-respond', { case_id: caseId });
    if (error) toast.error(error.message);
    else toast.success('Response submitted');
    setProcessing(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Cases</h1>
          <p className="page-subtitle">{items.length} cases</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['ebay_cases'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
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
                      <button onClick={() => respond(c.id as string)} disabled={processing === c.id} className="btn-ghost py-1 px-2 text-xs">
                        {processing === c.id ? 'Sending…' : 'Respond'}
                      </button>
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
