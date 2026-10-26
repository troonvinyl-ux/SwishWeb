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
  const attrs = row?.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
    ? row.attributes as Record<string, unknown> : {};
  const specialistId = String(row?.specialist_id || '').toLowerCase();
  const isClothing = ['clothing', 'trainers_sneakers', 'fashion', 'threads_flip', 'trainers'].includes(specialistId);
  const isBike = ['bicycles', 'bikes', 'cycling', 'bike_flipper'].includes(specialistId);
  const isMX = ['motocross', 'mx', 'flipper_mx'].includes(specialistId);
  const isCoin = !isClothing && !isBike && !isMX;
  const textValue = (...values: unknown[]) => {
    const value = values.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return value === undefined ? '' : String(value);
  };
  // Read the same canonical columns and specialist attributes used by the native app.
  const fieldValue = (key: string): string => {
    if (!row) return '';
    switch (key) {
      case 'title': return textValue(row.canonical_title, row.title, row.name, row.sku);
      case 'brand': return textValue(row.manufacturer, attrs.brand, attrs.brand_label, attrs.manufacturer, row.brand);
      case 'model': return textValue(attrs.model, attrs.model_name, row.model);
      case 'category': return isClothing
        ? textValue(attrs.garment_type, attrs.category, row.category)
        : isBike ? textValue(attrs.bike_type, attrs.frame_type, attrs.category, row.category)
        : isMX ? textValue(attrs.vehicle_type, attrs.category, row.category)
        : textValue(attrs.category, attrs.coin_type, row.category);
      case 'condition': return textValue(row.condition, row.condition_grade, attrs.condition);
      case 'colour': return textValue(attrs.colour, attrs.color, attrs.color_description, row.colour, row.color);
      case 'size': return textValue(attrs.size, attrs.labelled_size, attrs.labeled_size, attrs.frame_size, row.size);
      case 'location': return textValue(attrs.location, row.location, row.storage_location);
      case 'garment_type': return textValue(attrs.garment_type, attrs.category);
      case 'era': return textValue(attrs.era, attrs.era_estimate);
      case 'composition': return textValue(row.material, attrs.composition, attrs.material);
      case 'made_in': return textValue(row.country_of_origin, attrs.made_in, attrs.country_of_origin, attrs.country);
      case 'auth_risk': return textValue(attrs.authenticity_risk_level, attrs.authentication_risk_level, attrs.auth_risk);
      case 'frame_size': return textValue(attrs.frame_size, attrs.size);
      case 'frame_material': return textValue(row.material, attrs.frame_material);
      case 'groupset': return textValue(attrs.groupset, attrs.drivetrain);
      case 'wheel_size': return textValue(attrs.wheel_size);
      case 'engine_size': return textValue(attrs.engine_size);
      case 'stroke_type': return textValue(attrs.stroke_type);
      case 'running_status': return textValue(attrs.rideable_status, attrs.running_status);
      case 'year': return textValue(row.year_made, attrs.year, attrs.year_made, attrs.year_range);
      case 'country': return textValue(row.country_of_origin, attrs.country, attrs.country_of_origin);
      case 'material': return textValue(row.material, attrs.material, attrs.composition);
      case 'weight': return textValue(row.weight_grams, attrs.weight, attrs.weight_g);
      case 'diameter': return textValue(row.diameter_mm, attrs.diameter_mm);
      case 'ruler': return textValue(row.ruler, attrs.ruler, attrs.monarch, attrs.issuer);
      case 'denomination': return textValue(row.denomination, attrs.denomination);
      case 'period': return textValue(row.period, attrs.period);
      case 'mint': return textValue(row.mint, attrs.mint);
      default: return textValue(row[key], attrs[key]);
    }
  };

  const detailFields: Array<{ key: string; label: string }> = [
    { key: 'title', label: 'Title' },
    { key: 'brand', label: 'Brand' },
    { key: 'condition', label: 'Condition' },
    ...(isClothing ? [
      { key: 'garment_type', label: 'Garment Type' }, { key: 'era', label: 'Era' },
      { key: 'size', label: 'Size' }, { key: 'composition', label: 'Composition' },
      { key: 'colour', label: 'Colour' }, { key: 'made_in', label: 'Made In' },
      { key: 'auth_risk', label: 'Auth Risk' },
    ] : isBike ? [
      { key: 'category', label: 'Bike Type' }, { key: 'frame_size', label: 'Frame Size' },
      { key: 'frame_material', label: 'Frame Material' }, { key: 'groupset', label: 'Groupset' },
      { key: 'wheel_size', label: 'Wheel Size' }, { key: 'year', label: 'Year Range' },
      { key: 'country', label: 'Country' }, { key: 'weight', label: 'Weight' },
    ] : isMX ? [
      { key: 'category', label: 'Vehicle Type' }, { key: 'engine_size', label: 'Engine Size' },
      { key: 'stroke_type', label: 'Stroke Type' }, { key: 'year', label: 'Year' },
      { key: 'running_status', label: 'Running Status' }, { key: 'country', label: 'Country' },
    ] : [
      { key: 'denomination', label: 'Denomination' }, { key: 'ruler', label: 'Ruler' },
      { key: 'period', label: 'Period' }, { key: 'mint', label: 'Mint' },
      { key: 'year', label: 'Year' }, { key: 'country', label: 'Country' },
      { key: 'material', label: 'Material' }, { key: 'diameter', label: 'Diameter' },
      { key: 'weight', label: 'Weight' },
    ]),
  ];

  const startEdit = () => {
    if (!row) return;
    setForm({
      ...row,
      title: fieldValue('title'), brand: fieldValue('brand'), model: fieldValue('model'),
      category: fieldValue('category'), condition: fieldValue('condition'), colour: fieldValue('colour'),
      size: fieldValue('size'), location: fieldValue('location'), garment_type: fieldValue('garment_type'),
      era: fieldValue('era'), composition: fieldValue('composition'), made_in: fieldValue('made_in'),
      auth_risk: fieldValue('auth_risk'), description: textValue(row.description),
      cost_price: textValue(row.acquired_cost, row.cost_price, row.purchase_price),
      valuation: textValue(row.valuation_mid, row.valuation, row.expected_selling_price),
      sale_price: textValue(row.expected_selling_price, row.sale_price),
    });
    setEditing(true);
  };
  const cancelEdit = () => { setForm({}); setEditing(false); };

  const save = () => {
    if (!id || !row) return;
    const updates: Record<string, unknown> = {};
    const nextAttrs: Record<string, unknown> = { ...attrs };
    if ('title' in form) updates.canonical_title = form.title;
    if ('description' in form) updates.description = form.description;
    if ('condition' in form) updates.condition = form.condition;
    const attributeKeys: Record<string, string> = {
      brand: 'brand', model: 'model',
      category: isClothing ? 'garment_type' : 'category',
      colour: 'colour', size: 'size', location: 'location',
      garment_type: 'garment_type', era: 'era', composition: 'composition',
      made_in: 'made_in', auth_risk: 'authenticity_risk_level',
      frame_size: 'frame_size', frame_material: 'frame_material', groupset: 'groupset',
      wheel_size: 'wheel_size', engine_size: 'engine_size', stroke_type: 'stroke_type',
      running_status: 'running_status', year: 'year', country: 'country',
      material: 'material', weight: 'weight_g', diameter: 'diameter_mm',
      ruler: 'ruler', denomination: 'denomination', period: 'period', mint: 'mint',
    };
    for (const [formKey, attributeKey] of Object.entries(attributeKeys)) {
      if (formKey in form) nextAttrs[attributeKey] = form[formKey];
    }
    if (Object.keys(attributeKeys).some(key => key in form)) updates.attributes = nextAttrs;
    if ('brand' in form) updates.manufacturer = form.brand;
    if ('composition' in form) updates.material = form.composition;
    if ('made_in' in form) updates.country_of_origin = form.made_in;
    if ('cost_price' in form) updates.acquired_cost = Number(form.cost_price) || 0;
    if ('valuation' in form) updates.valuation_mid = Number(form.valuation) || 0;
    if ('sale_price' in form) updates.expected_selling_price = Number(form.sale_price) || 0;
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

  const f = (key: string) => editing ? (form[key] == null ? '' : String(form[key])) : fieldValue(key);
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
              {(row.images as string[]).slice(0, 8).map((img, i) => (
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
              {detailFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  {editing ? (
                    <input value={f(key)} onChange={e => setF(key, e.target.value)} className="input-field mt-0.5 text-xs py-1.5" />
                  ) : (
                    <p className="text-sm mt-0.5">{fieldValue(key) || '—'}</p>
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
                    <p className="text-sm font-semibold mt-0.5 swish-gold">{formatCurrency(row[key] as number)}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Profit indicator */}
            {!editing && row.cost_price && row.valuation && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="text-xs text-muted-foreground">Est. Gross Margin</label>
                {(() => {
                  const cost = Number(row.cost_price);
                  const val = Number(row.valuation);
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
