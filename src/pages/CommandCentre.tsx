import { useEffect, useState } from 'react';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { useTable, useCount } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatRelative } from '@/lib/utils';
import { Terminal, RefreshCw, Zap, Package, Tag, ShoppingCart, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface ActionResult {
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  data?: unknown;
}

export default function CommandCentre() {
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();

  const { data: recentActivity, isLoading: activityLoading } = useTable('activity_log', {
    filter: { tenant_id: tenantId },
    order: { column: 'created_at', ascending: false },
    limit: 20,
    enabled: Boolean(tenantId),
  });
  const { data: invCount } = useCount('inventory', { tenant_id: tenantId }, undefined, Boolean(tenantId));
  const { data: orderCount } = useCount('orders', { tenant_id: tenantId, status: 'awaiting_dispatch' }, undefined, Boolean(tenantId));
  const { data: reviewCount } = useCount('inventory', { tenant_id: tenantId, status: 'review' }, undefined, Boolean(tenantId));

  const runFunction = async (actionId: string) => {
    if (!tenantId) {
      toast.error('Your SWISH workspace is not ready.');
      return;
    }
    const action = actionId === 'ebay-sync'
      ? { edgeFunction: 'swish-ebay-sync', payload: { tenantId, mode: 'full' } }
      : actionId === 'sync-orders'
        ? { edgeFunction: 'swish-ebay-orders', payload: { tenantId, daysBack: 90, mode: 'both' } }
        : null;

    if (!action) {
      const message = 'This action is not supported by the current shared backend. No request was sent.';
      setActionResults(p => ({ ...p, [actionId]: { status: 'error', message } }));
      toast.message(message);
      return;
    }

    setActionResults(p => ({ ...p, [actionId]: { status: 'running' } }));
    const { data, error } = await callEdgeFunction(action.edgeFunction, action.payload);
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      setActionResults(p => ({ ...p, [actionId]: { status: 'error', message: msg } }));
      toast.error(msg);
      return;
    }

    let message = 'Completed successfully';
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (d.records_imported) message = `Imported: ${d.records_imported}`;
      else if (d.updated) message = `Updated: ${d.updated}`;
      else if (d.synced) message = `Synced: ${d.synced}`;
      else if (d.message) message = d.message as string;
    }
    setActionResults(p => ({ ...p, [actionId]: { status: 'success', message, data } }));
    toast.success(`${actionId}: ${message}`);
  };

  const QUICK_ACTIONS = [
    { fn: 'ebay-sync', label: 'eBay Full Sync', icon: () => <span className="text-xs font-bold text-primary">eB</span>, description: 'Sync eBay inventory and listing status using the shared backend.', supported: true },
    { fn: 'sync-orders', label: 'Sync eBay Orders', icon: ShoppingCart, description: 'Import eBay orders using the existing orders function.', supported: true },
    { fn: 'reprice-all', label: 'Reprice All', icon: RefreshCw, description: 'Bulk repricing is not exposed by the current backend.', supported: false },
    { fn: 'batch-identify', label: 'Batch Identify', icon: Zap, description: 'Batch identification is not exposed by the current backend.', supported: false },
  ];

  const getResultIcon = (result: ActionResult) => {
    if (result.status === 'running') return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
    if (result.status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (result.status === 'error') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Terminal className="w-5 h-5 swish-gold" />Command Centre
        </h1>
        <p className="page-subtitle">Run backend operations and monitor system activity</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="stat-value">{invCount ?? '—'}</div>
          <div className="stat-label">Total Inventory</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-warning">{orderCount ?? '—'}</div>
          <div className="stat-label">Awaiting Dispatch</div>
        </div>
        <Link to="/review-required" className="stat-card hover:border-primary/40 transition-colors">
          <div className="stat-value text-destructive">{reviewCount ?? '—'}</div>
          <div className="stat-label">Review Required</div>
        </Link>
        <div className="stat-card">
          <div className="text-xs text-success font-medium">● Connected</div>
          <div className="stat-label mt-1">Backend Status</div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(a => {
            const result = actionResults[a.fn] || { status: 'idle' };
            const isRunning = result.status === 'running';
            return (
              <button
                key={a.fn}
                onClick={() => runFunction(a.fn)}
                disabled={isRunning || !a.supported || !tenantId}
                className="swish-card p-4 text-left hover:border-primary/40 transition-colors disabled:opacity-70"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <a.icon className="w-4 h-4 swish-gold" />
                  <span className="font-medium text-sm flex-1">{a.label}</span>
                  {getResultIcon(result)}
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {result.status !== 'idle' && (
                  <div className={`mt-2 text-xs rounded px-2 py-1.5 font-medium ${
                    result.status === 'success' ? 'bg-green-500/10 text-green-400' :
                    result.status === 'error' ? 'bg-destructive/10 text-destructive' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {result.status === 'running' ? 'Running…' : (result.message || result.status)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity log */}
      <div className="swish-card p-4">
        <h3 className="text-sm font-semibold mb-3">Activity Log</h3>
        {activityLoading || tenantLoading ? (
          <div className="text-xs text-muted-foreground text-center py-4">Loading…</div>
        ) : (recentActivity || []).length > 0 ? (
          <div className="space-y-1">
            {(recentActivity as Record<string, unknown>[]).map((a, i) => (
              <div key={(a.id as string) || i} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span className="flex-1 text-xs">{(a.description || a.action || a.event || JSON.stringify(a)) as string}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatRelative(a.created_at as string)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">
            No activity log entries
            {/* graceful — table may not exist */}
          </div>
        )}
      </div>
    </div>
  );
}
