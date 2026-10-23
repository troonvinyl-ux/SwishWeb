import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTableRow, useUpsert } from '@/hooks/useSupabaseQuery';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { ArrowLeft, Save, Zap, Send, Loader2, ImageIcon, CheckCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ListingEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTableRow('listings', id);
  const upsert = useUpsert('listings');
  const [form, setForm] = useState<Record<string, unknown>>({ platform: 'ebay', status: 'draft' });
  const [preflighting, setPreflighting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Load linked inventory item to pull scan images
  const itemId = form.item_id as string | undefined;
  const { data: linkedItem } = useTableRow('inventory', itemId || null);

  useEffect(() => {
    if (data) {
      const listing = data as Record<string, unknown>;
      setForm(listing);
      // Pre-select existing listing images
      const existingImages = (listing.images as string[]) || [];
      setSelectedImages(existingImages);
    }
  }, [data]);

  const f = (key: string): string => (form[key] as string) || '';
  const setF = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  const save = () => {
    upsert.mutate({ ...form, images: selectedImages }, {
      onSuccess: (saved) => {
        toast.success('Listing saved');
        const savedId = (saved as Record<string, unknown>)?.id as string;
        if (savedId && savedId !== id) navigate(`/listings/${savedId}`);
      },
      onError: e => toast.error(e.message),
    });
  };

  const preflight = async () => {
    if (!form.id) { toast.error('Save listing first'); return; }
    setPreflighting(true);
    const { data, error } = await callEdgeFunction('listing-preflight', { listing_id: form.id });
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      toast.error(msg);
    } else {
      // Display preflight results
      const result = data as Record<string, unknown>;
      const status = result?.status || result?.result || 'complete';
      if (status === 'pass' || status === 'ok') toast.success('Preflight passed — listing is ready to publish');
      else if (result?.errors || result?.warnings) {
        const issues = [...(result.errors as string[] || []), ...(result.warnings as string[] || [])];
        toast.warning(issues.join(' · '));
      } else {
        toast.success('Preflight check complete');
      }
    }
    setPreflighting(false);
  };

  const publish = async () => {
    if (!form.id) { toast.error('Save listing first'); return; }
    setPublishing(true);
    const { error } = await callEdgeFunction('publish-listing', { listing_id: form.id });
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      toast.error(msg);
    } else {
      toast.success('Listing published to eBay');
      setF('status', 'active');
    }
    setPublishing(false);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/listings" className="btn-ghost py-1.5 px-2"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="page-title flex-1">Edit Listing</h1>
        <div className="flex gap-2">
          <button onClick={preflight} disabled={preflighting || !form.id} className="btn-ghost">
            <Zap className="w-3.5 h-3.5" />{preflighting ? 'Checking…' : 'Preflight'}
          </button>
          <button onClick={publish} disabled={publishing || !form.id} className="btn-ghost">
            <Send className="w-3.5 h-3.5" />{publishing ? 'Publishing…' : 'Publish'}
          </button>
          <button onClick={save} disabled={upsert.isPending} className="btn-primary">
            <Save className="w-3.5 h-3.5" />{upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Image Gallery ── */}
      {linkedItem && (() => {
        const inv = linkedItem as Record<string, unknown>;
        const idData = (inv.identification_data || {}) as Record<string, unknown>;
        const scanImages = (idData.scan_images || {}) as Record<string, string>;
        const imageEntries = Object.entries(scanImages).filter(([_, url]) => url);
        
        if (imageEntries.length === 0) return null;

        const toggleImage = (url: string) => {
          setSelectedImages(prev => 
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
          );
        };

        return (
          <div className="swish-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowImages(!showImages)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/20 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <ImageIcon className="w-4 h-4 text-primary" />
                Coin Images
                <span className="text-xs font-normal text-muted-foreground">
                  ({selectedImages.length} of {imageEntries.length} selected)
                </span>
              </span>
              {showImages
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showImages && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Click images to select/deselect for the eBay listing. Selected images show a green border and checkmark.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {imageEntries.map(([side, url]) => {
                    const isSelected = selectedImages.includes(url);
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => toggleImage(url)}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 active:scale-95 ${
                          isSelected
                            ? 'ring-2 ring-green-500 shadow-lg'
                            : 'ring-1 ring-border hover:ring-primary/40'
                        }`}
                      >
                        <img src={url} alt={side} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs text-center py-1.5 capitalize">
                          {side}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedImages.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-warning">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    No images selected — eBay listings require at least one photo
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="swish-card p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Title *</label>
          <input value={f('title')} onChange={e => setF('title', e.target.value)} className="input-field mt-0.5" placeholder="Listing title" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={6} className="input-field mt-0.5" placeholder="Item description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Platform</label>
            <select value={f('platform')} onChange={e => setF('platform', e.target.value)} className="input-field mt-0.5">
              <option value="ebay">eBay</option>
              <option value="amazon">Amazon</option>
              <option value="depop">Depop</option>
              <option value="vinted">Vinted</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <select value={f('status')} onChange={e => setF('status', e.target.value)} className="input-field mt-0.5">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Price (£)</label>
            <input
              type="number" step="0.01" min="0"
              value={f('price')}
              onChange={e => setF('price', parseFloat(e.target.value) || null)}
              className="input-field mt-0.5"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Condition</label>
            <select value={f('condition')} onChange={e => setF('condition', e.target.value)} className="input-field mt-0.5">
              <option value="">Select…</option>
              <option value="New">New</option>
              <option value="Used - Like New">Used – Like New</option>
              <option value="Used - Very Good">Used – Very Good</option>
              <option value="Used - Good">Used – Good</option>
              <option value="Used - Acceptable">Used – Acceptable</option>
              <option value="For parts">For parts</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <input value={f('category')} onChange={e => setF('category', e.target.value)} className="input-field mt-0.5" placeholder="Category" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Inventory Item ID</label>
            <input value={f('item_id')} onChange={e => setF('item_id', e.target.value)} className="input-field mt-0.5 font-mono text-xs" placeholder="UUID" />
          </div>
        </div>
      </div>
    </div>
  );
}
