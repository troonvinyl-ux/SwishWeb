import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import { Lightbulb, RefreshCw, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Opportunities() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTable('opportunities', { order: { column: 'created_at', ascending: false } });
  const items = (data || []) as Record<string, unknown>[];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Opportunities</h1>
          <p className="page-subtitle">Buying and sourcing opportunities</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['opportunities'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading opportunities…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No opportunities found</p>
            <p className="text-xs text-muted-foreground mt-1">Opportunities are discovered automatically based on your inventory and market data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Item</th><th>Platform</th><th>Status</th>
                <th className="text-right">Buy Price</th><th className="text-right">Est. Sell</th>
                <th className="text-right">Margin</th><th>Date</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((o: Record<string, unknown>) => {
                  const buy = (o.buy_price || o.cost || o.price) as number;
                  const sell = (o.sell_price || o.estimated_value || o.value) as number;
                  const margin = buy && sell ? ((sell - buy) / buy * 100) : null;
                  return (
                    <tr key={o.id as string}>
                      <td>
                        <div className="font-medium text-xs">{truncate((o.title || o.name || 'Opportunity') as string, 45)}</div>
                        {o.brand && <div className="text-xs text-muted-foreground">{o.brand as string}</div>}
                      </td>
                      <td className="text-xs">{(o.platform || o.source || '—') as string}</td>
                      <td className="text-xs">{(o.status || '—') as string}</td>
                      <td className="text-right text-xs">{formatCurrency(buy)}</td>
                      <td className="text-right text-xs font-medium swish-gold">{formatCurrency(sell)}</td>
                      <td className="text-right text-xs">
                        {margin !== null ? (
                          <span className={margin > 0 ? 'text-success' : 'text-destructive'}>{margin.toFixed(0)}%</span>
                        ) : '—'}
                      </td>
                      <td className="text-xs text-muted-foreground">{formatDate(o.created_at as string)}</td>
                      <td>
                        {o.url && (
                          <a href={o.url as string} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 px-2 text-xs">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
