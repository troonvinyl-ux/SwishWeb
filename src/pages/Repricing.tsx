import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatCurrency, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Repricing() {
  const qc = useQueryClient();
  const [repricing, setRepricing] = useState<string | null>(null);
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();

  const { data, isLoading, error } = useTable('listings', {
    filter: { tenant_id: tenantId, status: 'active' },
    enabled: Boolean(tenantId),
    order: { column: 'updated_at', ascending: true },
  });

  const items = (data || []) as Record<string, unknown>[];

  const handleReprice = async (listingId: string) => {
    if (!tenantId) { toast.error('Your SWISH workspace is not ready.'); return; }
    setRepricing(listingId);
    try {
      const { data, error } = await callEdgeFunction('swish-reprice', {
        listing_id: listingId,
        tenant_id: tenantId,
      });
      if (error) throw error;
      const payload = data as Record<string, unknown>;
      const result = (payload?.result || {}) as Record<string, unknown>;
      const suggested = Number(result.suggested_price);
      if (!Number.isFinite(suggested) || suggested <= 0) throw new Error('The repricing service returned no valid suggestion.');
      // swish-reprice returns a recommendation; it does not apply a new eBay price.
      qc.setQueriesData({ queryKey: ['listings'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map(row => row && typeof row === 'object' && (row as Record<string, unknown>).id === listingId
          ? { ...(row as Record<string, unknown>), suggested_price: suggested, reprice_rationale: result.rationale }
          : row);
      });
      toast.success(`Suggested price: ${formatCurrency(suggested)}. No price was changed.`);
    } catch (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'Could not generate a repricing suggestion';
      toast.error(msg);
    } finally {
      setRepricing(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Repricing</h1>
          <p className="page-subtitle">{tenantLoading ? 'Loading workspace…' : `${items.length} active listing${items.length !== 1 ? 's' : ''}`}</p>
          <p className="text-xs text-muted-foreground mt-1">Suggestions only: SWISH does not change eBay prices automatically.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['listings'] })} className="btn-ghost" disabled={isLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button disabled title="Bulk repricing is not supported by the current shared backend." className="btn-secondary opacity-60 cursor-not-allowed">
            Reprice All unavailable
          </button>
        </div>
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading listings…</div>
        ) : error ? (
          <div className="p-6 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No active listings — publish a listing first to enable repricing
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Platform</th>
                  <th className="text-right">Current Price</th>
                  <th className="text-right">Suggested</th>
                  <th>Trend</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(l => {
                  const current   = l.price as number;
                  const suggested = (l.suggested_price || l.recommended_price) as number | undefined;
                  const diff      = suggested != null && current != null ? suggested - current : null;
                  return (
                    <tr key={l.id as string}>
                      <td>
                        <span className="text-xs font-medium">{truncate((l.title || 'Listing') as string, 40)}</span>
                        {l.external_id && <div className="text-xs text-muted-foreground font-mono">{l.external_id as string}</div>}
                      </td>
                      <td className="text-xs capitalize">{(l.platform || '—') as string}</td>
                      <td className="text-right text-xs font-semibold swish-gold">{formatCurrency(current)}</td>
                      <td className="text-right text-xs">{suggested ? formatCurrency(suggested) : '—'}</td>
                      <td>
                        {diff !== null ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${
                            diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {diff > 0
                              ? <TrendingUp className="w-3 h-3" />
                              : diff < 0
                                ? <TrendingDown className="w-3 h-3" />
                                : <Minus className="w-3 h-3" />}
                            {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatCurrency(diff)}` : 'No change'}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => handleReprice(l.id as string)}
                          disabled={repricing === l.id}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          {repricing === l.id ? 'Repricing…' : 'Reprice'}
                        </button>
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
