import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInsert } from '@/hooks/useSupabaseQuery';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveNiche } from '@/lib/niches';

const DEFAULT_FORM = {
  title: '',
  brand: '',
  model: '',
  category: '',
  condition: '',
  colour: '',
  size: '',
  location: '',
  description: '',
  sku: '',
  cost_price: '',
  valuation: '',
  sale_price: '',
  status: 'new',
};

export default function InventoryNew() {
  const navigate = useNavigate();
  const insert = useInsert('items');
  const { user } = useAuth();
  const [form, setForm] = useState<Record<string, unknown>>(DEFAULT_FORM);
  const activeNiche = getActiveNiche();

  const setF = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));
  const f = (key: string) => (form[key] as string) || '';

  const handleSave = async () => {
    if (!f('title')) { toast.error('Title is required'); return; }
    if (!user?.id) { toast.error('Please sign in before creating inventory'); return; }
    // Resolve the current user's tenant using the same RLS-protected tenant list
    // pattern as the mobile app. Never accept tenant_id from form input.
    const sb = getSupabaseClient() || await getSupabaseClientAsync();
    if (!sb) { toast.error('Backend not connected'); return; }
    const { data: tenants, error: tenantError } = await sb.from('tenants').select('id').order('created_at', { ascending: true }).limit(1);
    if (tenantError || !tenants?.[0]?.id) {
      toast.error(tenantError?.message || 'No workspace found for this account');
      return;
    }
    const numeric = (key: string) => {
      const raw = f(key).trim();
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : null;
    };
    const title = f('title').trim();
    const row: Record<string, unknown> = {
      tenant_id: tenants[0].id,
      canonical_title: title,
      description: f('description').trim(),
      niche_id: activeNiche?.id ?? 'coins',
      niche: activeNiche?.id ?? 'coins',
      specialist_id: activeNiche?.specialistIds[0] ?? 'coins',
      status: f('status') || 'new',
      disposition_decision: 'pending',
      condition: f('condition'),
      attributes: {
        brand: f('brand'), model: f('model'), category: f('category'),
        colour: f('colour'), size: f('size'), location: f('location'),
      },
      sku: f('sku').trim() || null,
      acquired_cost: numeric('cost_price'),
      valuation_mid: numeric('valuation'),
      expected_selling_price: numeric('sale_price'),
      media: [],
      warnings: [],
      tags: [],
    };
    insert.mutate(row, {
      onSuccess: (data) => {
        toast.success('Item created');
        const newId = (data as Record<string, unknown>)?.id as string;
        navigate(newId ? `/inventory/${newId}` : '/inventory');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="btn-ghost py-1.5 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">New Inventory Item</h1>
          <p className="page-subtitle">Add a new item to your {activeNiche?.name ?? 'SWISH'} inventory</p>
        </div>
        <button onClick={handleSave} disabled={insert.isPending} className="btn-primary">
          <Save className="w-3.5 h-3.5" />{insert.isPending ? 'Creating…' : 'Create Item'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Image placeholder */}
        <div className="swish-card p-4 flex flex-col items-center justify-center gap-2 aspect-square md:aspect-auto">
          <Package className="w-12 h-12 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">Save item first, then use Identify to add images</p>
        </div>

        <div className="md:col-span-2 space-y-4">
          {/* Core details */}
          <div className="swish-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Item Details</h3>
            <div>
              <label className="text-xs text-muted-foreground">Title *</label>
              <input value={f('title')} onChange={e => setF('title', e.target.value)} className="input-field mt-0.5" placeholder="Item title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Brand</label>
                <input value={f('brand')} onChange={e => setF('brand', e.target.value)} className="input-field mt-0.5" placeholder="Brand" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <input value={f('model')} onChange={e => setF('model', e.target.value)} className="input-field mt-0.5" placeholder="Model / Reference" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <input value={f('category')} onChange={e => setF('category', e.target.value)} className="input-field mt-0.5" placeholder="Category" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Condition</label>
                <select value={f('condition')} onChange={e => setF('condition', e.target.value)} className="input-field mt-0.5">
                  <option value="">Select condition…</option>
                  <option value="New">New</option>
                  <option value="Used - Like New">Used – Like New</option>
                  <option value="Used - Very Good">Used – Very Good</option>
                  <option value="Used - Good">Used – Good</option>
                  <option value="Used - Acceptable">Used – Acceptable</option>
                  <option value="For parts">For parts</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Colour</label>
                <input value={f('colour')} onChange={e => setF('colour', e.target.value)} className="input-field mt-0.5" placeholder="Colour" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Size</label>
                <input value={f('size')} onChange={e => setF('size', e.target.value)} className="input-field mt-0.5" placeholder="Size" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">SKU</label>
                <input value={f('sku')} onChange={e => setF('sku', e.target.value)} className="input-field mt-0.5 font-mono text-xs" placeholder="Optional SKU" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <input value={f('location')} onChange={e => setF('location', e.target.value)} className="input-field mt-0.5" placeholder="Storage location" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select value={f('status')} onChange={e => setF('status', e.target.value)} className="input-field mt-0.5">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="review">Review Required</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={3} className="input-field mt-0.5" placeholder="Item description" />
            </div>
          </div>

          {/* Financials */}
          <div className="swish-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Financials</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Cost Price (£)</label>
                <input type="number" step="0.01" min="0" value={f('cost_price')} onChange={e => setF('cost_price', e.target.value)} className="input-field mt-0.5" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valuation (£)</label>
                <input type="number" step="0.01" min="0" value={f('valuation')} onChange={e => setF('valuation', e.target.value)} className="input-field mt-0.5" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sale Price (£)</label>
                <input type="number" step="0.01" min="0" value={f('sale_price')} onChange={e => setF('sale_price', e.target.value)} className="input-field mt-0.5" placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
