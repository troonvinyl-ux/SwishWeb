import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDate, statusVariant } from '@/lib/utils';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReviewRequired() {
  const qc = useQueryClient();
  const [reidentifying, setReidentifying] = useState<string | null>(null);

  const { data, isLoading, error } = useTable('inventory', {
    filter: { status: 'review' },
    order: { column: 'created_at', ascending: false },
  });

  const items = (data || []) as Record<string, unknown>[];

  const reidentify = async (id: string) => {
    setReidentifying(id);
    const { error } = await callEdgeFunction('identify', { item_id: id });
    if (error) toast.error(error.message);
    else { toast.success('Re-identification triggered'); qc.invalidateQueries({ queryKey: ['inventory'] }); }
    setReidentifying(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" />Review Required</h1>
          <p className="page-subtitle">{items.length} items need attention</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['inventory'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : error ? (
        <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
      ) : items.length === 0 ? (
        <div className="swish-card p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No items require review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => (
            <div key={item.id as string} className="swish-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url as string} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{(item.title || item.sku || 'Untitled') as string}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(item.created_at as string)}</div>
                </div>
              </div>
              {item.notes && <p className="text-xs text-muted-foreground">{item.notes as string}</p>}
              <div className="flex gap-2">
                <Link to={`/inventory/${item.id}`} className="btn-secondary py-1.5 text-xs flex-1 justify-center">View</Link>
                <button onClick={() => reidentify(item.id as string)} disabled={reidentifying === item.id} className="btn-ghost py-1.5 text-xs">
                  <Zap className="w-3 h-3" />{reidentifying === item.id ? '…' : 'Identify'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
