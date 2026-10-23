import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTableRow, useUpdate, useDelete } from '@/hooks/useSupabaseQuery';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { formatCurrency, formatDate, formatDateTime, statusVariant } from '@/lib/utils';
import { ArrowLeft, Edit2, Save, X, Trash2, Zap, RefreshCw, Package, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, error, refetch } = useTableRow('items', id);
  const update = useUpdate('items');
  const del = useDelete('items');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [identifying, setIdentifying] = useState(false);
  const [valuing, setValuing] = useState(false);

  const row = item as Record<string, unknown> | null;

  const startEdit = () => { setForm(row || {}); setEditing(true); };
  const cancelEdit = () => { setForm({}); setEditing(false); };

  const save = () => {
    if (!id) return;
    const attributes = row?.attributes && typeof row.attributes === 'object'
      ? { ...(row.attributes as Record<string, unknown>) } : {};
    ['brand', 'model', 'category', 'colour', 'size', 'location'].forEach(key => {
      if (form[key] !== undefined) attributes[key] = form[key];
    });
    const parseMoney = (key: string) => {
      const raw = String(form[key] ?? '').trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const updates: Record<string, unknown> = {
      canonical_title: String(form.title ?? row?.canonical_title ?? '').trim(),
      description: form.description ?? row?.description ?? '',
      condition: form.condition ?? row?.condition ?? '',
      attributes,
      acquired_cost: parseMoney('cost_price'),
      valuation_mid: parseMoney('valuation'),
      expected_selling_price: parseMoney('sale_price'),
    };
    if (!updates.canonical_title) { toast.error('Title is required'); return; }
    update.mutate({ id, updates }, {
      onSuccess: () => { toast.success('Saved'); setEditing(false); refetch(); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleDelete = () => {
    if (!id || !confirm('Delete this item? This cannot be undone.')) return;
    del.mutate(id, {
      onSuccess: () => { toast.success('Item deleted'); navigate('/inventory'); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleIdentify = async () => {
    if (!id) return;
    setIdentifying(true);
    const { data, error } = await callEdgeFunction('identify', { item_id: id });
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      toast.error(msg);
    } else {
      toast.success('Identification complete');
      refetch();
    }
    setIdentifying(false);
  };

  const handleValue = async () => {
    if (!id) return;
    setValuing(true);
    const { data, error } = await callEdgeFunction('value', { item_id: id });
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      toast.error(msg);
    } else {
      toast.success('Valuation updated');
      refetch();
    }
    setValuing(false);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;

  if (error || !row) {
    const errMsg = error instanceof Error ? error.message : '';
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-destructive text-sm font-medium">
          {errMsg.includes('does not exist') ? 'Inventory table not found in database' :
           errMsg.includes('permission') ? 'Permission denied' :
           'Item not found'}
        </p>
        {errMsg && <p className="text-xs text-muted-foreground font-mono">{errMsg}</p>}
        <Link to="/inventory" className="btn-secondary">← Back to Inventory</Link>
      </div>
    );
  }

  const f = (key: string) => {
    if (editing) return (form[key] as string || '');
    if (key === 'title') return (row.canonical_title as string) || '';
    if (key === 'cost_price') return String(row.acquired_cost ?? '');
    if (key === 'valuation') return String(row.valuation_mid ?? '');
    if (key === 'sale_price') return String(row.expected_selling_price ?? '');
    if (['brand', 'model', 'category', 'colour', 'size', 'location'].includes(key)) {
      const attrs = row.attributes as Record<string, unknown> | null;
      return String(attrs?.[key] ?? '');
    }
    return (row[key] as string || '');
  };
  const setF = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/inventory" className="btn-ghost py-1.5 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{(row.canonical_title || row.title || row.name || row.sku || 'Untitled Item') as string}</h1>
          {row.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {row.sku as string}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleValue} disabled={valuing} className="btn-ghost">
            <RefreshCw className={`w-3.5 h-3.5 ${valuing ? 'animate-spin' : ''}`} />{valuing ? 'Valuing…' : 'Value'}
          </button>
          <button onClick={handleIdentify} disabled={identifying} className="btn-ghost">
            <Zap className="w-3.5 h-3.5" />{identifying ? 'Identifying…' : 'Re-Identify'}
          </button>
          {editing ? (
            <>
              <button onClick={save} disabled={update.isPending} className="btn-primary">
                <Save className="w-3.5 h-3.5" />{update.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={cancelEdit} className="btn-secondary"><X className="w-3.5 h-3.5" />Cancel</button>
            </>
          ) : (
            <>
              {/* REQ-LST-001 — only confirmed (active) items can generate listings */}
              {(row.status as string) === 'active' && (
                <button
                  onClick={() => navigate(`/listings/new?item_id=${id}&title=${encodeURIComponent((row.canonical_title || row.title || row.name || '') as string)}&price=${row.expected_selling_price || row.valuation_mid || row.sale_price || ''}`)}
                  className="btn-secondary"
                  title="Create a draft eBay listing from this item"
                >
                  <Tag className="w-3.5 h-3.5" />List
                </button>
              )}
              <button onClick={startEdit} className="btn-secondary"><Edit2 className="w-3.5 h-3.5" />Edit</button>
              <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Image panel */}
        <div className="swish-card p-4 flex flex-col gap-3">
          <div className="aspect-square w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
            {(row.image_url || (Array.isArray(row.media) ? row.media[0] : null)) ? (
              <img src={(row.image_url || (Array.isArray(row.media) ? row.media[0] : null)) as string} alt="" className="w-full h-full object-contain" />
            ) : (
              <Package className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
          {Array.isArray(row.images) && (row.images as string[]).length > 1 && (
            <div className="grid grid-cols-4 gap-1">
              {((Array.isArray(row.media) ? row.media : Array.isArray(row.images) ? row.images : []) as string[]).slice(0, 8).map((img, i) => (
                <img key={i} src={img} alt="" className="aspect-square w-full rounded object-cover" />
              ))}
            </div>
          )}
          {row.status && (
            <span className={`${statusVariant(row.status as string)} self-start`}>{row.status as string}</span>
          )}
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-4">
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-3">Item Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'title', label: 'Title' },
                { key: 'brand', label: 'Brand' },
                { key: 'model', label: 'Model' },
                { key: 'category', label: 'Category' },
                { key: 'condition', label: 'Condition' },
                { key: 'colour', label: 'Colour' },
                { key: 'size', label: 'Size' },
                { key: 'location', label: 'Location' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  {editing ? (
                    <input value={f(key)} onChange={e => setF(key, e.target.value)} className="input-field mt-0.5 text-xs py-1.5" />
                  ) : (
                    <p className="text-sm mt-0.5">{(row[key] as string) || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Description</label>
              {editing ? (
                <textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={3} className="input-field mt-0.5 text-xs" />
              ) : (
                <p className="text-sm mt-0.5 text-muted-foreground leading-relaxed">{(row.description as string) || '—'}</p>
              )}
            </div>
          </div>

          {/* Financials */}
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-3">Financials</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'cost_price', label: 'Cost Price' },
                { key: 'valuation', label: 'Valuation' },
                { key: 'sale_price', label: 'Sale Price' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  {editing ? (
                    <input
                      type="number" step="0.01" min="0"
                      value={f(key)}
                      onChange={e => setF(key, e.target.value)}
                      className="input-field mt-0.5 text-xs py-1.5"
                    />
                  ) : (
                    <p className="text-sm font-semibold mt-0.5 swish-gold">{formatCurrency((key === 'cost_price' ? row.acquired_cost : key === 'valuation' ? row.valuation_mid : row.expected_selling_price) as number)}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Profit indicator */}
            {!editing && row.acquired_cost && row.valuation_mid && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="text-xs text-muted-foreground">Est. Gross Margin</label>
                {(() => {
                  const cost = Number(row.acquired_cost);
                  const val = Number(row.valuation_mid);
                  const diff = val - cost;
                  const pct = cost > 0 ? (diff / cost * 100) : 0;
                  return (
                    <p className={`text-sm font-semibold mt-0.5 ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(diff)} ({pct.toFixed(0)}%)
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Identification */}
          {row.identification_data && (
            <div className="swish-card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 swish-gold" />Identification
                {row.confidence != null && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Confidence: {Math.round((row.confidence as number) * 100)}%
                  </span>
                )}
              </h3>
              <pre className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded overflow-auto max-h-48 scrollbar-thin">
                {JSON.stringify(row.identification_data, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Created: {formatDateTime(row.created_at as string)} · Updated: {formatDateTime(row.updated_at as string)}
          </div>
        </div>
      </div>
    </div>
  );
}
