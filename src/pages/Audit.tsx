import { useState } from 'react';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function Audit() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useTable('audit_log', {
    order: { column: 'created_at', ascending: false },
    limit: 100,
  });

  // fallback to inventory with all statuses
  const { data: invData } = useTable('inventory', {
    order: { column: 'updated_at', ascending: false },
    limit: 100,
    enabled: !data || (data as unknown[]).length === 0,
  });

  const useAuditLog = data && (data as unknown[]).length > 0;
  const items = (useAuditLog ? data : invData || []) as Record<string, unknown>[];

  const filtered = search ? items.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList className="w-5 h-5 swish-gold" />Audit</h1>
          <p className="page-subtitle">{useAuditLog ? 'Audit log' : 'Inventory audit'} · {filtered.length} records</p>
        </div>
        <button onClick={() => { qc.invalidateQueries({ queryKey: ['audit_log'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); }} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit records…" className="input-field pl-8" />
      </div>

      <div className="swish-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  {useAuditLog ? (
                    <><th>Action</th><th>Table</th><th>Record ID</th><th>User</th><th>Date</th></>
                  ) : (
                    <><th>Item</th><th>SKU</th><th>Status</th><th className="text-right">Value</th><th>Last Updated</th><th></th></>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id as string}>
                    {useAuditLog ? (
                      <>
                        <td className="text-xs font-medium capitalize">{(r.action || r.operation || '—') as string}</td>
                        <td className="text-xs font-mono text-muted-foreground">{(r.table_name || r.table || '—') as string}</td>
                        <td className="text-xs font-mono text-muted-foreground">{((r.record_id || r.row_id) as string || '—')}</td>
                        <td className="text-xs">{(r.user_id || r.user || '—') as string}</td>
                        <td className="text-xs text-muted-foreground">{formatDate(r.created_at as string)}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-xs font-medium">{(r.title || r.name || 'Untitled') as string}</td>
                        <td className="text-xs font-mono text-muted-foreground">{(r.sku || '—') as string}</td>
                        <td className="text-xs capitalize">{(r.status || '—') as string}</td>
                        <td className="text-right text-xs swish-gold">{formatCurrency((r.valuation || r.sale_price) as number)}</td>
                        <td className="text-xs text-muted-foreground">{formatDate((r.updated_at || r.created_at) as string)}</td>
                        <td><Link to={`/inventory/${r.id}`} className="btn-ghost py-1 px-2 text-xs">View</Link></td>
                      </>
                    )}
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
