import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Plus, Trash2, Upload, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { callEdgeFunction } from '@/lib/supabase';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';

type IdentifyResponse = { error?: string; result?: { canonicalTitle?: string; identification?: { title?: string }; title?: string; confidence?: number; identificationState?: string; [key: string]: unknown }; canonicalTitle?: string; identification?: { title?: string }; title?: string; confidence?: number; identificationState?: string; [key: string]: unknown };
type CoinRow = { id: string; label: string; front?: File; back?: File; weight: string; diameter: string; notes: string; status: 'ready' | 'running' | 'done' | 'error'; result?: IdentifyResponse; error?: string };
const uid = () => `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fileData = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.readAsDataURL(file);
});

export default function SpecialistTools() {
  const location = useLocation();
  const { tenantId } = useCurrentTenantId();
  const mode = location.pathname.includes('silver-batch') ? 'silver' : 'islamic';
  const title = mode === 'silver' ? 'Silver Batch Processing' : 'Islamic & Countermark Batch Identification';
  const [rows, setRows] = useState<CoinRow[]>([{ id: uid(), label: 'Coin 1', weight: '', diameter: '', notes: '', status: 'ready' }]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const completed = useMemo(() => rows.filter(r => r.status === 'done').length, [rows]);
  const patch = (id: string, values: Partial<CoinRow>) => setRows(prev => prev.map(row => row.id === id ? { ...row, ...values } : row));
  const add = () => setRows(prev => [...prev, { id: uid(), label: `Coin ${prev.length + 1}`, weight: '', diameter: '', notes: '', status: 'ready' }]);
  const remove = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const runBatch = async () => {
    if (!tenantId) { toast.error('Your SWISH workspace is not ready'); return; }
    const ready = rows.filter(r => r.front && r.back);
    if (!ready.length) { toast.error('Add both obverse and reverse photos to at least one coin'); return; }
    setRunning(true); setProgress(0);
    let finished = 0;
    for (const row of ready) {
      patch(row.id, { status: 'running', error: undefined });
      try {
        const images = await Promise.all([fileData(row.front!), fileData(row.back!)]);
        const { data, error } = await callEdgeFunction<IdentifyResponse>('swish-islamic-identify', {
          images,
          weight: row.weight.trim() ? Number(row.weight) : undefined,
          diameter: row.diameter.trim() ? Number(row.diameter) : undefined,
          notes: row.notes.trim() || undefined,
          tenantId,
          isBatch: true,
        });
        if (error) throw error;
        if (!data || data.error) throw new Error(data?.error || 'The identification service returned no result');
        patch(row.id, { status: 'done', result: data.result ?? data });
      } catch (e) {
        patch(row.id, { status: 'error', error: e instanceof Error ? e.message : 'Identification failed' });
      } finally {
        finished += 1; setProgress(Math.round(finished / ready.length * 100));
      }
    }
    setRunning(false);
    toast.success('Batch processing finished. Review each result before saving or listing.');
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-3"><Link to="/tools" className="rounded-lg border border-border p-2" aria-label="Back to app tools"><ArrowLeft className="h-4 w-4" /></Link><div><p className="text-xs font-bold uppercase tracking-widest text-primary">SWISH specialist workflow</p><h1 className="page-title">{title}</h1><p className="mt-1 text-sm text-muted-foreground">Uses the existing authenticated SWISH backend. Results are not automatically confirmed or published.</p></div></div>
    <div className="swish-card flex items-start gap-3 p-4"><Zap className="mt-1 h-5 w-5 shrink-0 text-primary"/><p className="text-sm leading-6">Upload both sides and optional measurements. The existing specialist identification function processes each coin in sequence. Check evidence and confidence carefully; an AI suggestion is not a verified identification or valuation.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-muted-foreground">{rows.length} coin(s) · {completed} completed</div><button onClick={add} disabled={running || rows.length >= 100} className="btn-secondary inline-flex items-center gap-2"><Plus className="h-4 w-4"/>Add coin</button></div>
    {rows.map((row) => <section key={row.id} className="swish-card space-y-4 p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{row.label}</h2><div className="flex items-center gap-2 text-sm">{row.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500"/> : row.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin"/> : row.status === 'error' ? <AlertCircle className="h-4 w-4 text-destructive"/> : null}<span className="capitalize text-muted-foreground">{row.status}</span><button onClick={() => remove(row.id)} disabled={running || rows.length === 1} className="rounded-md p-2 text-muted-foreground hover:text-destructive" aria-label={`Remove ${row.label}`}><Trash2 className="h-4 w-4"/></button></div></div>
      <div className="grid gap-3 md:grid-cols-2">
        {(['front','back'] as const).map(side => <label key={side} className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-center hover:border-primary"><Upload className="h-5 w-5 text-primary"/><span className="font-medium">{side === 'front' ? 'Obverse / front' : 'Reverse / back'} photo</span><span className="max-w-full truncate text-xs text-muted-foreground">{row[side]?.name || 'Choose image'}</span><input type="file" accept="image/*" capture="environment" className="sr-only" disabled={running} onChange={e => patch(row.id, { [side]: e.target.files?.[0], status: 'ready', result: undefined, error: undefined })}/></label>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Weight (g)<input type="number" step="0.01" value={row.weight} onChange={e => patch(row.id,{weight:e.target.value})} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="e.g. 1.99"/></label><label className="text-sm">Diameter (mm)<input type="number" step="0.1" value={row.diameter} onChange={e => patch(row.id,{diameter:e.target.value})} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="e.g. 23"/></label><label className="text-sm">Notes<input value={row.notes} onChange={e => patch(row.id,{notes:e.target.value})} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Inscription, countermark…"/></label></div>
      {row.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{row.error}</p>}
      {row.result && <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggested identification</p><h3 className="mt-1 text-lg font-semibold">{row.result.canonicalTitle || row.result.identification?.title || row.result.title || 'Result returned — inspect details'}</h3><p className="mt-1 text-sm text-muted-foreground">Confidence: {typeof row.result.confidence === 'number' ? `${Math.round(row.result.confidence * 100)}%` : 'not supplied'} · State: {row.result.identificationState || 'requires review'}</p></div><details><summary className="cursor-pointer text-sm font-medium">View full evidence and response</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-xs">{JSON.stringify(row.result,null,2)}</pre></details></div>}
    </section>)}
    {running && <div className="swish-card space-y-2 p-4"><div className="flex justify-between text-sm"><span>Processing batch</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{width:`${progress}%`}}/></div></div>}
    <div className="flex flex-wrap gap-3"><button onClick={runBatch} disabled={running || !rows.some(r => r.front && r.back)} className="btn-primary inline-flex min-h-11 items-center gap-2">{running && <Loader2 className="h-4 w-4 animate-spin"/>}{running ? 'Processing…' : 'Run identification batch'}</button><button onClick={() => setRows([{id:uid(),label:'Coin 1',weight:'',diameter:'',notes:'',status:'ready'}])} disabled={running} className="btn-secondary min-h-11">Clear batch</button></div>
    <p className="text-xs leading-5 text-muted-foreground">This web workflow sends images to the existing <code>swish-islamic-identify</code> Edge Function. It does not create a parallel database, fabricate missing evidence, or publish eBay listings automatically.</p>
  </div>;
}
