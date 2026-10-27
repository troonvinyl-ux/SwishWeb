import { useState } from 'react';
import { useTable, useInsert } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant } from '@/lib/utils';
import { ShoppingBag, Plus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';

export default function Acquisitions() {
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const { data, isLoading, error } = useTable('acquisitions', { filter: { tenant_id: tenantId }, order: { column: 'created_at', ascending: false }, enabled: Boolean(tenantId) });
  const insert = useInsert('acquisitions', tenantId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: '', platform: '', cost: '', item_count: '', notes: '', status: 'pending' });

  const items = (data || []) as Record<string, unknown>[];

  const handleSubmit = () => {
    insert.mutate({
      source: form.source,
      platform: form.platform,
      cost: parseFloat(form.cost) || 0,
      item_count: parseInt(form.item_count) || 0,
      notes: form.notes,
      status: form.status,
    }, {
      onSuccess: () => { toast.success('Acquisition added'); setShowForm(false); setForm({ source: '', platform: '', cost: '', item_count: '', notes: '', status: 'pending' }); },
      onError: e => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Acquisitions</h1>
          <p className="page-subtitle">{items.length} acquisition records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['acquisitions'] })} className="btn-ghost"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-3.5 h-3.5" />New Acquisition</button>
        </div>
      </div>

      {showForm && (
        <div className="swish-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New Acquisition</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Source</label>
              <input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} className="input-field mt-0.5" placeholder="e.g. eBay, Car Boot" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Platform</label>
              <input value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} className="input-field mt-0.5" placeholder="e.g. eBay" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Total Cost (£)</label>
              <input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} className="input-field mt-0.5" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Item Count</label>
              <input type="number" value={form.item_count} onChange={e => setForm(p => ({ ...p, item_count: e.target.value }))} className="input-field mt-0.5" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input-field mt-0.5">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input-field mt-0.5" placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSubmit} disabled={insert.isPending || tenantLoading || !tenantId} className="btn-primary">{insert.isPending ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="swish-card overflow-hidden">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading acquisitions…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No acquisitions recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Source</th><th>Platform</th><th>Status</th>
                <th className="text-right">Items</th><th className="text-right">Cost</th><th>Date</th>
              </tr></thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id as string}>
                    <td className="font-medium text-xs">{(a.source || '—') as string}</td>
                    <td className="text-xs">{(a.platform || '—') as string}</td>
                    <td>{a.status ? <span className={statusVariant(a.status as string)}>{a.status as string}</span> : '—'}</td>
                    <td className="text-right text-xs">{(a.item_count ?? '—') as number}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((a.cost || a.total_cost) as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(a.created_at as string)}</td>
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
