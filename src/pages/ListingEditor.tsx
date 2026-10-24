import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTableRow, useUpsert } from '@/hooks/useSupabaseQuery';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { ArrowLeft, Save, Zap, Send, Loader2, ImageIcon, CheckCircle, ChevronDown, ChevronRight, AlertTriangle, Upload, X, RotateCw, Sun, Contrast } from 'lucide-react';
import { getSupabaseClientAsync } from '@/lib/supabase';
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
  const [uploadedImages, setUploadedImages] = useState<Array<{ side: string; url: string }>>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editRotation, setEditRotation] = useState(0);
  const [editBrightness, setEditBrightness] = useState(100);
  const [editContrast, setEditContrast] = useState(100);
  const [uploadingImages, setUploadingImages] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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
        const existingListingImages = (form.images as string[] || []).filter(Boolean);
        const imageEntries = [
          ...Object.entries(scanImages).filter(([_, url]) => !!url).map(([side, url]) => ({ side, url })),
          ...uploadedImages,
          ...existingListingImages.filter(url => !Object.values(scanImages).includes(url) && !uploadedImages.some(image => image.url === url)).map((url, i) => ({ side: `Existing photo ${i + 1}`, url })),
        ];
        const availableUrls = [...new Set(imageEntries.map(image => image.url))];
        const toggleImage = (url: string) => setSelectedImages(prev =>
          prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
        const reorderImage = (fromUrl: string, toUrl: string) => {
          if (fromUrl === toUrl) return;
          setSelectedImages(prev => {
            const next = [...prev];
            const from = next.indexOf(fromUrl);
            if (from < 0) return prev;
            next.splice(from, 1);
            const to = next.indexOf(toUrl);
            next.splice(to < 0 ? next.length : to, 0, fromUrl);
            return next;
          });
        };
        const uploadAdditionalImages = async (files: FileList | null) => {
          if (!files?.length) return;
          const itemId = String(form.item_id || '');
          if (!itemId) { toast.error('Enter or select an Inventory Item ID before uploading photos'); return; }
          const sb = await getSupabaseClientAsync();
          if (!sb) { toast.error('SWISH backend is not connected'); return; }
          setUploadingImages(true);
          const added: Array<{side:string;url:string}> = [];
          try {
            for (const file of Array.from(files)) {
              if (!file.type.startsWith('image/')) continue;
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
              const objectPath = `${itemId}/listing-${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
              const { data: stored, error } = await sb.storage.from('item-images').upload(objectPath, file, { upsert: false, contentType: file.type });
              if (error || !stored) throw error || new Error('Image upload failed');
              const { data: publicData } = sb.storage.from('item-images').getPublicUrl(stored.path);
              if (publicData?.publicUrl) added.push({ side: file.name, url: publicData.publicUrl });
            }
            setUploadedImages(prev => [...prev, ...added]);
            setSelectedImages(prev => [...prev, ...added.map(i => i.url)]);
            toast.success(`${added.length} photo${added.length === 1 ? '' : 's'} uploaded and selected`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not upload photos');
          } finally {
            setUploadingImages(false);
            if (uploadInputRef.current) uploadInputRef.current.value = '';
          }
        };
        const saveImageEdits = async () => {
          if (!editingUrl) return;
          const itemId = String(form.item_id || '');
          const sb = await getSupabaseClientAsync();
          if (!sb || !itemId) { toast.error('Backend or Inventory Item ID is unavailable'); return; }
          try {
            const response = await fetch(editingUrl);
            if (!response.ok) throw new Error('Could not load the original image for editing');
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);
            const radians = editRotation * Math.PI / 180;
            const rotated = Math.abs(editRotation % 180) === 90;
            const canvas = document.createElement('canvas');
            canvas.width = rotated ? bitmap.height : bitmap.width;
            canvas.height = rotated ? bitmap.width : bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Image editor could not initialise');
            ctx.filter = `brightness(${editBrightness}%) contrast(${editContrast}%)`;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(radians);
            ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
            const editedBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not export edited image')), 'image/jpeg', 0.94));
            const objectPath = `${itemId}/edited-${Date.now()}.jpg`;
            const { data: stored, error } = await sb.storage.from('item-images').upload(objectPath, editedBlob, { upsert: false, contentType: 'image/jpeg' });
            if (error || !stored) throw error || new Error('Edited image upload failed');
            const { data: publicData } = sb.storage.from('item-images').getPublicUrl(stored.path);
            const editedUrl = publicData.publicUrl;
            setUploadedImages(prev => [...prev, { side: 'Edited photo', url: editedUrl }]);
            setSelectedImages(prev => {
              const next = [...prev];
              const index = next.indexOf(editingUrl);
              if (index >= 0) next[index] = editedUrl;
              else next.push(editedUrl);
              return next;
            });
            setEditingUrl(null);
            setLightboxUrl(null);
            toast.success('Edited photo saved to SWISH storage and selected');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not save image edits');
          }
        };
        return (
          <div className="swish-card overflow-hidden">
            <button type="button" onClick={() => setShowImages(!showImages)} className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
              <span className="flex items-center gap-2 font-medium"><ImageIcon className="w-4 h-4 text-primary" />Listing Image Gallery
                <span className="text-xs font-normal text-muted-foreground">({selectedImages.length} selected · first selected image is the eBay thumbnail)</span>
              </span>
              {showImages ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showImages && <div className="px-4 pb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-ghost text-xs" onClick={() => setSelectedImages(prev => [...prev, ...availableUrls.filter(url => !prev.includes(url))])}>Select All</button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setSelectedImages([])}>Clear All</button>
                <button type="button" className="btn-secondary text-xs" disabled={uploadingImages} onClick={() => uploadInputRef.current?.click()}><Upload className="w-3.5 h-3.5" />{uploadingImages ? 'Uploading…' : 'Upload photos'}</button>
                <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void uploadAdditionalImages(e.target.files)} />
              </div>
              <p className="text-xs text-muted-foreground">Click a photo to preview it full-screen. Select photos for the listing, then drag selected thumbnails to reorder them. The first selected photo is sent as the eBay thumbnail.</p>
              {selectedImages.length > 0 && <div className="rounded-lg border border-primary/30 p-3 space-y-2">
                <div className="text-xs font-medium">Selected listing order <span className="text-muted-foreground">(drag to reorder)</span></div>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((url, index) => <div key={url} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', url); e.dataTransfer.effectAllowed = 'move'; }} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={e => { e.preventDefault(); reorderImage(e.dataTransfer.getData('text/plain'), url); }} className="relative w-20 cursor-grab active:cursor-grabbing">
                    <img src={url} alt={`Selected listing image ${index + 1}`} className="h-20 w-20 rounded object-cover border border-border" />
                    <span className="absolute top-1 left-1 rounded bg-black/80 text-white text-[10px] px-1.5 py-0.5">{index + 1}{index === 0 ? ' · Main' : ''}</span>
                    <button type="button" aria-label="Remove from listing" onClick={() => toggleImage(url)} className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-1"><X className="w-3 h-3" /></button>
                  </div>)}
                </div>
              </div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imageEntries.map(({side,url}, index) => {
                  const isSelected = selectedImages.includes(url);
                  const selectedIndex = selectedImages.indexOf(url);
                  return <div key={url} className={`relative rounded-lg overflow-hidden ${isSelected ? 'ring-2 ring-green-500' : 'ring-1 ring-border'}`}>
                    <button type="button" onClick={() => setLightboxUrl(url)} className="block w-full aspect-square hover:opacity-90" aria-label={`Preview ${side} image`}>
                      <img src={url} alt={side} className="w-full h-full object-cover" />
                    </button>
                    <div className="flex items-center justify-between gap-1 p-2 bg-card">
                      <span className="text-xs truncate capitalize">{side}</span>
                      <button type="button" onClick={() => toggleImage(url)} className={`text-xs px-2 py-1 rounded ${isSelected ? 'bg-green-600 text-white' : 'bg-secondary'}`}>{isSelected ? (selectedIndex === 0 ? 'Main' : `#${selectedIndex + 1}`) : 'Select'}</button>
                    </div>
                    <button type="button" onClick={() => { setLightboxUrl(url); setEditingUrl(url); setEditRotation(0); setEditBrightness(100); setEditContrast(100); }} className="absolute top-2 right-2 rounded bg-black/75 text-white px-2 py-1 text-[10px]">Edit</button>
                  </div>;
                })}
              </div>
              {imageEntries.length === 0 && <p className="text-xs text-muted-foreground">No scan photos are available yet. Upload photos to add them to this listing.</p>}
              {selectedImages.length === 0 && <div className="flex items-center gap-2 text-xs text-warning"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />No images selected — eBay listings require at least one photo.</div>}
            </div>}
            {lightboxUrl && <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => { setLightboxUrl(null); setEditingUrl(null); }}>
              <button type="button" onClick={() => { setLightboxUrl(null); setEditingUrl(null); }} className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10" aria-label="Close preview"><X className="w-6 h-6" /></button>
              <img src={lightboxUrl} alt="Full-resolution listing preview" onClick={e => e.stopPropagation()} className="max-w-full max-h-[78vh] object-contain" style={editingUrl === lightboxUrl ? { filter: `brightness(${editBrightness}%) contrast(${editContrast}%)`, transform: `rotate(${editRotation}deg)` } : undefined} />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-white" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => toggleImage(lightboxUrl)} className="btn-secondary">{selectedImages.includes(lightboxUrl) ? 'Remove from listing' : 'Include in listing'}</button>
                <button type="button" onClick={() => { setEditingUrl(lightboxUrl); setEditRotation(0); setEditBrightness(100); setEditContrast(100); }} className="btn-secondary">Edit image</button>
                <button type="button" onClick={() => setLightboxUrl(null)} className="btn-primary">Done</button>
              </div>
              {editingUrl === lightboxUrl && <div className="mt-4 w-full max-w-xl rounded-xl bg-zinc-900 p-4 text-white space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setEditRotation(r => (r + 90) % 360)}><RotateCw className="w-4 h-4" /> Rotate 90°</button>
                  <button type="button" className="btn-secondary" onClick={() => { setEditRotation(0); setEditBrightness(100); setEditContrast(100); }}>Reset</button>
                </div>
                <label className="block text-xs">Brightness: {editBrightness}% <Sun className="inline w-3.5 h-3.5" /><input type="range" min="50" max="150" value={editBrightness} onChange={e => setEditBrightness(Number(e.target.value))} className="w-full" /></label>
                <label className="block text-xs">Contrast: {editContrast}% <Contrast className="inline w-3.5 h-3.5" /><input type="range" min="50" max="160" value={editContrast} onChange={e => setEditContrast(Number(e.target.value))} className="w-full" /></label>
                <button type="button" className="btn-primary w-full" onClick={() => void saveImageEdits()}>Save edited copy and use in listing</button>
                <p className="text-[11px] text-zinc-400">Edits create a new JPEG in the existing item-images bucket; the original is preserved.</p>
              </div>}
            </div>}
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
