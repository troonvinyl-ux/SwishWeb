import { useState } from 'react';
import { useTable, useInsert, useUpdate, useDelete } from '@/hooks/useSupabaseQuery';
import { formatDate } from '@/lib/utils';
import { CheckSquare, Plus, RefreshCw, X, Square, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';

const DEFAULT_FORM = { title: '', description: '', priority: 'medium', due_date: '' };

export default function Tasks() {
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('open');
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const { data, isLoading, error } = useTable('tasks', {
    filter: { tenant_id: tenantId, ...(filter !== 'all' ? { status: filter } : {}) },
    order: { column: 'created_at', ascending: false },
    enabled: Boolean(tenantId),
  });

  const insert = useInsert('tasks');
  const update = useUpdate('tasks', tenantId);
  const del    = useDelete('tasks', tenantId);

  const items = (data || []) as Record<string, unknown>[];

  // Classify errors for better UX
  const errMsg = error instanceof Error ? error.message : '';
  const isSchemaError = errMsg.includes('does not exist') || errMsg.includes('relation');

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!tenantId || tenantLoading) { toast.error('Your SWISH workspace is not ready.'); return; }
    insert.mutate({ ...form, tenant_id: tenantId, status: 'open' } as Record<string, unknown>, {
      onSuccess: () => {
        toast.success('Task created');
        setShowForm(false);
        setForm({ ...DEFAULT_FORM });
      },
      onError: e => toast.error(e.message),
    });
  };

  const toggleComplete = (id: string, current: string) => {
    const isCompleting = current !== 'completed';
    update.mutate({
      id,
      updates: {
        status: isCompleting ? 'completed' : 'open',
        completed_at: isCompleting ? new Date().toISOString() : null,
      },
    }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
      onError: e => toast.error(e.message),
    });
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'text-destructive';
    if (p === 'medium') return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{items.length} task{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['tasks'] })} className="btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" />New Task
          </button>
        </div>
      </div>

      {/* Schema error — tasks table doesn't exist */}
      {isSchemaError && (
        <div className="swish-card p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Tasks table not found</p>
            <p className="text-xs text-muted-foreground mt-1">
              The <code className="bg-secondary px-1 py-0.5 rounded text-xs">tasks</code> table does not exist in the connected database.
              To enable Tasks, create this table in your SWISH backend with columns:
              <code className="bg-secondary px-1 py-0.5 rounded text-xs ml-1">id, title, description, status, priority, due_date, completed_at, created_at, updated_at</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{errMsg}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!isSchemaError && (
        <div className="flex gap-1">
          {(['all', 'open', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'btn-ghost'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* New task form */}
      {showForm && !isSchemaError && (
        <div className="swish-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New Task</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="input-field"
            placeholder="Task title *"
            autoFocus
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            className="input-field"
            placeholder="Description (optional)"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="input-field mt-0.5">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="input-field mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={insert.isPending} className="btn-primary">
              {insert.isPending ? 'Adding…' : 'Add Task'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {!isSchemaError && (
        isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading tasks…</div>
        ) : error && !isSchemaError ? (
          <div className="p-8 text-center text-destructive text-sm">{errMsg}</div>
        ) : items.length === 0 ? (
          <div className="swish-card p-12 text-center">
            <CheckSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(t => (
              <div
                key={t.id as string}
                className={`swish-card p-3 flex items-center gap-3 ${t.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => toggleComplete(t.id as string, t.status as string)}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  title={t.status === 'completed' ? 'Mark open' : 'Mark complete'}
                >
                  {t.status === 'completed'
                    ? <CheckSquare className="w-4 h-4 text-success" />
                    : <Square className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${t.status === 'completed' ? 'line-through' : ''}`}>
                    {(t.title || 'Untitled') as string}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground truncate">{t.description as string}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.priority && (
                    <span className={`text-xs font-medium capitalize ${priorityColor(t.priority as string)}`}>
                      {t.priority as string}
                    </span>
                  )}
                  {t.due_date && (
                    <span className={`text-xs ${
                      new Date(t.due_date as string) < new Date() && t.status !== 'completed'
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {formatDate(t.due_date as string)}
                    </span>
                  )}
                  <button
                    onClick={() => del.mutate(t.id as string, { onSuccess: () => toast.success('Deleted') })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
