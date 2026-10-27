import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';
import { formatDate, statusVariant } from '@/lib/utils';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReviewRequired() {
  const qc = useQueryClient();
  const [reidentifying, setReidentifying] = useState<string | null>(null);
  const [identificationResults, setIdentificationResults] = useState<Record<string, Record<string, unknown>>>({});
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const update = useUpdate('items');
  const specialistIds = getSpecialistIdsForNiche(getActiveNicheId());

  const { data, isLoading, error } = useTable('items', {
    filter: { tenant_id: tenantId, status: 'review' },
    inFilter: { specialist_id: specialistIds },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
    order: { column: 'created_at', ascending: false },
  });

  const items = (data || []) as Record<string, unknown>[];
  const imageUrlFor = (item: Record<string, unknown>): string | null => {
    const candidates = [item.image_url, item.image_url_1, item.image_url_2];
    if (Array.isArray(item.media)) candidates.push(...item.media);
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.startsWith('https://')) return candidate;
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        const media = candidate as Record<string, unknown>;
        const url = media.url || media.publicUrl || media.public_url || media.src;
        if (typeof url === 'string' && url.startsWith('https://')) return url;
      }
    }
    return null;
  };

  const reidentify = async (item: Record<string, unknown>) => {
    const id = String(item.id || '');
    const itemTenantId = String(item.tenant_id || tenantId || '');
    const mediaUrls = Array.isArray(item.media)
      ? item.media.filter((url): url is string => typeof url === 'string' && url.startsWith('https://'))
      : [];
    const fallbackUrls = [item.image_url, item.image_url_1, item.image_url_2]
      .filter((url): url is string => typeof url === 'string' && url.startsWith('https://'));
    const existingImageUrls = [...new Set([...mediaUrls, ...fallbackUrls])].slice(0, 6);
    const knownAttributes = item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
      ? item.attributes as Record<string, unknown> : {};
    if (!id || !itemTenantId || itemTenantId !== tenantId) { toast.error('This item is not available in the active workspace.'); return; }
    if (existingImageUrls.length === 0) { toast.error('Add a downloadable HTTPS image before re-identifying this item.'); return; }

    setReidentifying(id);
    try {
      const { data, error } = await callEdgeFunction<Record<string, unknown>>('swish-identify', {
        tenantId: itemTenantId,
        specialistId: String(item.specialist_id || 'curiosities_collectibles'),
        existingImageUrls,
        knownAttributes,
      });
      if (error) throw error;
      const result = data?.identification;
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error('The identification service returned no reviewable candidate.');
      }
      setIdentificationResults(current => ({ ...current, [id]: result as Record<string, unknown> }));
      toast.success('AI suggestion ready to review. No item fields have been changed.');
    } catch (error) {
      toast.error(error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'Identification failed');
    } finally {
      setReidentifying(null);
    }
  };

  const applySuggestedTitle = (itemId: string) => {
    const result = identificationResults[itemId];
    const title = String(result?.canonicalTitle || result?.title || '').trim();
    if (!title) { toast.error('This candidate has no supported title to apply.'); return; }
    update.mutate({ id: itemId, updates: { canonical_title: title } }, {
      onSuccess: () => {
        setIdentificationResults(current => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        toast.success('Suggested title saved. Review the remaining attributes before confirming the item.');
        void qc.invalidateQueries({ queryKey: ['items'] });
      },
      onError: error => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" />Review Required</h1>
          <p className="page-subtitle">{items.length} items need attention</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['items'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {isLoading || tenantLoading ? (
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
                  {(item.image_url || (Array.isArray(item.media) ? item.media[0] : null)) ? (
                    <img src={(item.image_url || (Array.isArray(item.media) ? item.media[0] : null)) as string} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{(item.canonical_title || item.title || item.sku || 'Untitled') as string}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(item.created_at as string)}</div>
                </div>
              </div>
              {item.notes && <p className="text-xs text-muted-foreground">{item.notes as string}</p>}
              {identificationResults[String(item.id)] && (
                <div className="rounded-lg border border-border/50 p-3 space-y-2">
                  <p className="text-xs font-semibold">AI suggestion — not saved</p>
                  <p className="text-sm">{String(identificationResults[String(item.id)].canonicalTitle || identificationResults[String(item.id)].title || 'No title returned')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => applySuggestedTitle(String(item.id))} disabled={update.isPending} className="btn-primary py-1 text-xs">Apply title</button>
                    <button onClick={() => setIdentificationResults(current => { const next = { ...current }; delete next[String(item.id)]; return next; })} className="btn-secondary py-1 text-xs">Dismiss</button>
                  </div>
                  <p className="text-xs text-muted-foreground">Only the title is applied after confirmation.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Link to={`/inventory/${item.id}`} className="btn-secondary py-1.5 text-xs flex-1 justify-center">View</Link>
                <button onClick={() => reidentify(item)} disabled={reidentifying === item.id || !tenantId} className="btn-ghost py-1.5 text-xs">
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
