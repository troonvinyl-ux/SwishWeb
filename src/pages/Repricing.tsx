import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';
import { formatCurrency, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError, getSupabaseClientAsync } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Repricing() {
  const qc = useQueryClient();
  const [repricing, setRepricing] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Record<string, unknown>>>({});
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const specialistIds = getSpecialistIdsForNiche(getActiveNicheId());

  const { data, isLoading, error } = useTable('listings', {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay', status: 'active' },
    inFilter: { 'items.specialist_id': specialistIds },
    order: { column: 'updated_at', ascending: true },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });

  const items = (data || []) as Record<string, unknown>[];

  const handleReprice = async (listingId: string) => {
    if (!tenantId) { toast.error('Your SWISH workspace is not ready.'); return; }
    setRepricing(listingId);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('Backend not connected.');
      const { data, error } = await callEdgeFunction<Record<string, unknown>>('swish-reprice', {
        listing_id: listingId,
        tenant_id: tenantId,
      }, sb);
      if (error) throw error;
      const result = (data?.result || data) as Record<string, unknown>;
      setSuggestions(current => ({ ...current, [listingId]: result }));
      const suggestedPrice = Number(result?.suggested_price);
      toast.success(Number.isFinite(suggestedPrice) ? `Suggested price: ${formatCurrency(suggestedPrice)} — review before changing the listing.` : 'Repricing recommendation generated.');
    } catch (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'Could not generate a repricing suggestion.';
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
          <p className="page-subtitle">{items.length} active listing{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['listings'] })} className="btn-ghost" disabled={isLoading || tenantLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
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
                  const suggestion = suggestions[l.id as string];
                  const suggested = (suggestion?.suggested_price || l.suggested_price || l.recommended_price) as number | undefined;
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
                          disabled={repricing === l.id || !tenantId}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          {repricing === l.id ? 'Analysing…' : 'Suggest'}
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
