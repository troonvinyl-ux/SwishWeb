import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

export default function EbayCases() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const { data, isLoading, error } = useTable('ebay_cases', { order: { column: 'created_at', ascending: false } });
  const items = (data || []) as Record<string, unknown>[];

  const syncCases = async () => {
    setSyncing(true);
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before syncing cases.');
      const { data: membership, error: membershipError } = await sb.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready.');
      const { error } = await callEdgeFunction('swish-ebay-post-order', { tenantId: membership.tenant_id, route: 'sync_cases' }, sb);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['ebay_cases'] });
      toast.success('eBay cases synced');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay cases.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Cases</h1>
          <p className="page-subtitle">{items.length} cases</p>
        </div>
        <button onClick={() => void syncCases()} disabled={syncing} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync from eBay'}
        </button>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">Case records can be synced from eBay. Responding to cases is not exposed by the existing secure backend, so SWISH will not report a response as submitted.</div>
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
                      <button disabled title="Case responses are not available through the current secure backend" className="btn-ghost py-1 px-2 text-xs opacity-50">Unavailable</button>
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
