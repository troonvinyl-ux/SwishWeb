import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2, Save, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClientAsync } from '@/lib/supabase';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';

type StockRow = { id: string; canonical_title: string | null; quantity: number | null; valuation_mid: number | null; sku: string | null; status: string | null; specialist_id: string | null; media: string[] | null };
type Edit = { checked: boolean; quantity: string; price: string; dirty: boolean };

export default function StockCheck() {
  const { tenantId } = useCurrentTenantId();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showChecked, setShowChecked] = useState(false);
  const [loadError, setLoadError] = useState('');
  const nicheId = getActiveNicheId();
  const specialists = getSpecialistIdsForNiche(nicheId);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true); setLoadError('');
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      let request = sb.from('items').select('id,canonical_title,quantity,valuation_mid,sku,status,specialist_id,media').eq('tenant_id', tenantId).order('updated_at', { ascending: false }).limit(1000);
      if (specialists.length) request = request.in('specialist_id', specialists);
      const { data, error } = await request;
      if (error) throw error;
      const loaded = (data ?? []) as StockRow[];
      setRows(loaded);
      setEdits(Object.fromEntries(loaded.map(row => [row.id, { checked: false, quantity: String(row.quantity ?? 1), price: String(row.valuation_mid ?? 0), dirty: false }])));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load inventory';
      setLoadError(message); toast.error(message);
    } finally { setLoading(false); }
  }, [tenantId, nicheId]);

  useEffect(() => { void load(); }, [load]);
  const patch = (id: string, values: Partial<Edit>) => setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...values, dirty: values.checked === undefined ? true : prev[id]?.dirty ?? false } }));
  const visible = useMemo(() => rows.filter(row => {
    const e = edits[row.id];
    const text = `${row.canonical_title ?? ''} ${row.sku ?? ''} ${row.id}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!showChecked || e?.checked);
  }), [rows, edits, query, showChecked]);
  const checkedCount = Object.values(edits).filter(e => e.checked).length;
  const dirtyCount = Object.values(edits).filter(e => e.dirty).length;
  const checkedValue = rows.reduce((sum, row) => sum + (edits[row.id]?.checked ? (Number(edits[row.id]?.quantity) || 0) * (Number(edits[row.id]?.price) || 0) : 0), 0);

  const save = async (row: StockRow) => {
    if (!tenantId) return;
    const edit = edits[row.id];
    const quantity = Number(edit?.quantity);
    const price = Number(edit?.price);
    if (!Number.isInteger(quantity) || quantity < 0) { toast.error('Quantity must be a whole number of 0 or more'); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error('Price must be 0 or more'); return; }
    setSaving(row.id);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      const { data, error } = await sb.from('items').update({ quantity, valuation_mid: price, updated_at: new Date().toISOString() }).eq('id', row.id).eq('tenant_id', tenantId).select('id').maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error('SWISH did not confirm the stock update. Check access and retry.');
      setRows(prev => prev.map(item => item.id === row.id ? { ...item, quantity, valuation_mid: price } : item));
      setEdits(prev => ({ ...prev, [row.id]: { ...prev[row.id], dirty: false } }));
      toast.success('Stock row saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save stock row'); }
    finally { setSaving(null); }
  };

  const saveAll = async () => {
    for (const row of rows.filter(item => edits[item.id]?.dirty)) await save(row);
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="swish-card space-y-3 p-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-6 w-6 text-primary"/><h1 className="page-title">SWISH Stock Check</h1></div><p className="text-sm leading-6 text-muted-foreground">Check physical stock, adjust quantities and prices, then save changes to the existing inventory. All reads and writes are scoped to your tenant and active niche.</p><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">Inventory rows</p><p className="text-2xl font-bold">{rows.length}</p></div><div className="rounded-lg bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">Checked</p><p className="text-2xl font-bold">{checkedCount}</p></div><div className="rounded-lg bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">Checked stock value</p><p className="text-2xl font-bold">£{checkedValue.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div></div></header>
    <div className="flex flex-wrap items-center gap-3"><label className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, SKU or ID" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3"/></label><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={showChecked} onChange={e=>setShowChecked(e.target.checked)}/>Checked only</label><button onClick={()=>void load()} disabled={loading||!!saving} className="btn-secondary min-h-10">Refresh</button><button onClick={()=>void saveAll()} disabled={!dirtyCount||!!saving} className="btn-primary inline-flex min-h-10 items-center gap-2"><Save className="h-4 w-4"/>Save changes ({dirtyCount})</button></div>
    {loadError && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 mt-0.5"/>{loadError}</div>}
    {loading ? <div className="flex items-center gap-2 p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>Loading inventory…</div> : <div className="space-y-3">{visible.map(row=>{const edit=edits[row.id];return <article key={row.id} className="swish-card grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_110px_130px_auto] md:items-center"><div className="flex min-w-0 items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={edit?.checked??false} onChange={e=>patch(row.id,{checked:e.target.checked})} aria-label={`Mark ${row.canonical_title||row.id} checked`}/><div className="min-w-0"><h2 className="truncate font-semibold">{row.canonical_title||'Untitled inventory item'}</h2><p className="mt-1 text-xs text-muted-foreground">SKU: {row.sku||'—'} · Status: {row.status||'—'}</p><p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{row.id}</p></div></div><label className="text-xs text-muted-foreground">Quantity<input type="number" min="0" step="1" value={edit?.quantity??'1'} onChange={e=>patch(row.id,{quantity:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"/></label><label className="text-xs text-muted-foreground">Unit price (£)<input type="number" min="0" step="0.01" value={edit?.price??'0'} onChange={e=>patch(row.id,{price:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"/></label><button onClick={()=>void save(row)} disabled={!edit?.dirty||!!saving} className="btn-secondary inline-flex min-h-10 items-center justify-center gap-2">{saving===row.id?<Loader2 className="h-4 w-4 animate-spin"/>:edit?.dirty?<Save className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}{edit?.dirty?'Save':'Saved'}</button></article>})}{!visible.length&&<div className="swish-card p-8 text-center text-muted-foreground">No inventory rows match this filter.</div>}</div>}
    <p className="text-xs leading-5 text-muted-foreground">Saving updates only quantity and the existing mid-value field. Each write is tenant-scoped and must return a matching row before the UI reports success.</p>
  </div>;
}
