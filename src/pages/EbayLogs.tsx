import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDateTime, statusVariant } from '@/lib/utils';
import { RefreshCw, Terminal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';

export default function EbayLogs() {
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [level, setLevel] = useState('');

  const { data, isLoading, error } = useTable('ebay_logs', {
    order: { column: 'created_at', ascending: false },
    limit: 100,
    filter: { tenant_id: tenantId, ...(level ? { level } : {}) },
    enabled: Boolean(tenantId),
  });

  // fallback to generic logs table
  const { data: fallback } = useTable('logs', {
    order: { column: 'created_at', ascending: false },
    limit: 100,
    filter: { tenant_id: tenantId, source: 'ebay' },
    enabled: Boolean(tenantId) && (!data || (data as unknown[]).length === 0),
  });

  const items = ((data && (data as unknown[]).length > 0 ? data : fallback) || []) as Record<string, unknown>[];

  const levelColor = (l: string) => {
    if (l === 'error') return 'text-destructive';
    if (l === 'warn' || l === 'warning') return 'text-warning';
    if (l === 'info') return 'text-info';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Terminal className="w-4 h-4 swish-gold" />eBay Logs</h1>
          <p className="page-subtitle">{items.length} log entries</p>
        </div>
        <div className="flex gap-2">
          <select value={level} onChange={e => setLevel(e.target.value)} className="input-field w-auto min-w-28">
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
          <button onClick={() => { qc.invalidateQueries({ queryKey: ['ebay_logs'] }); qc.invalidateQueries({ queryKey: ['logs'] }); }} className="btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="swish-card font-mono text-xs">
        {isLoading || tenantLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading logs…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No logs found</div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {items.map(l => (
              <div key={l.id as string} className="flex gap-3 p-2.5 hover:bg-secondary/20">
                <span className="text-muted-foreground shrink-0 text-[11px]">{formatDateTime(l.created_at as string)}</span>
                <span className={`shrink-0 w-12 ${levelColor((l.level || l.severity || 'info') as string)}`}>
                  {((l.level || l.severity || 'info') as string).toUpperCase()}
                </span>
                <span className="flex-1 text-foreground/80 break-all">
                  {(l.message || l.description || JSON.stringify(l)) as string}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
