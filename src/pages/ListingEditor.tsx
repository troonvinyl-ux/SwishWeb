import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTableRow, useUpsert } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { ArrowLeft, Save, Zap, Send, Loader2, ImageIcon, CheckCircle, ChevronDown, ChevronRight, AlertTriangle, Upload, X, RotateCw, Sun, Contrast, Sparkles, Tag, Truck, ShoppingBag } from 'lucide-react';
import { getSupabaseClientAsync } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ListingEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useCurrentTenantId();
  const { data, isLoading } = useTableRow('listings', id, '*', tenantId);
  const upsert = useUpsert('listings', tenantId);
  const [form, setForm] = useState<Record<string, unknown>>({ platform: 'ebay', status: 'draft' });
  const [preflighting, setPreflighting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<{ id: string; name: string } | null>(null);
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
  const { data: linkedItem } = useTableRow('items', itemId || null, '*', tenantId);

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

  const suggestCategory = async () => {
    const title = f('title').trim();
    if (title.length < 2) { toast.error('Enter an item title before suggesting a category'); return; }
    if (!user?.id) { toast.error('Sign in again before requesting a category suggestion'); return; }
    setSuggestingCategory(true);
    setCategorySuggestion(null);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      const { data: membership, error: membershipError } = await sb.from('tenant_memberships')
        .select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready');
      const { data: payload, error } = await callEdgeFunction<{
        success?: boolean; error?: string;
        suggestions?: Array<{ id?: string | number; name?: string; isLeaf?: boolean }>;
      }>('swish-ebay-list', {
        route: 'get_category_suggestions',
        tenantId: String(membership.tenant_id),
        query: title.slice(0, 100),
      });
      if (error) throw error;
      const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
      const best = suggestions.find(cat => cat.id !== undefined && cat.id !== '' && !!cat.name && cat.isLeaf === true);
      if (!payload?.success || !best) throw new Error(payload?.error || 'No matching eBay leaf category found. Try a more descriptive title.');
      const suggestion = { id: String(best.id), name: String(best.name) };
      setCategorySuggestion(suggestion);
      setF('category', suggestion.name);
      setF('category_id', suggestion.id);
      toast.success('AI suggested an eBay category. Verify it before publishing.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not suggest an eBay category');
    } finally {
      setSuggestingCategory(false);
    }
  };

  const save = () => {
    // Keep the web editor aligned with the canonical listings schema used by
    // the SWISH mobile app. UI-only fields (e.g. "category" and "platform")
    // must never be sent as database columns.
    const payload: Record<string, unknown> = {
      id: form.id,
      tenant_id: form.tenant_id,
      item_id: form.item_id,
      marketplace_id: form.marketplace_id || form.platform || 'ebay',
      title: String(form.title || '').trim(),
      description: String(form.description || ''),
      price: Number(form.price || 0),
      status: form.status || 'draft',
      // Listing photos live on the linked inventory item's media field in the
      // canonical SWISH schema. Do not write a non-existent listings.images column.
      category_id: form.category_id || null,
      floor_price: form.floor_price ?? null,
      ceiling_price: form.ceiling_price ?? null,
      shipping_cost: form.shipping_cost ?? 0,
      external_listing_id: form.external_listing_id ?? null,
      created_at: form.created_at,
      updated_at: new Date().toISOString(),
    };
    // Do not send undefined fields or web-only aliases to PostgREST.
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });
    upsert.mutate(payload, {
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
    if (!user?.id) { toast.error('Sign in again before running preflight'); return; }
    setPreflighting(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      const { data: membership, error: membershipError } = await sb.from('tenant_memberships')
        .select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      const tenantId = String(form.tenant_id || membership?.tenant_id || '');
      if (!tenantId) throw new Error('Your SWISH workspace is not ready');

      // Use the existing, authenticated verification function used by the
      // native app. There is no deployed "listing-preflight" function.
      const { data: result, error } = await callEdgeFunction<Record<string, unknown>>('swish-verify', {
        listing_id: String(form.id),
        tenant_id: tenantId,
      });
      if (error) throw error;
      if (!result) throw new Error('Preflight returned no verification result');

      // swish-verify returns its verdict and advisories at the top level.
      const passed = result.passed === true;
      const failures = Array.isArray(result.failure_reasons) ? result.failure_reasons as string[] : [];
      const warnings = Array.isArray(result.warnings) ? result.warnings as string[] : [];
      if (passed && warnings.length === 0) {
        toast.success('Preflight passed — listing verification is complete');
      } else {
        const issues = [...failures, ...warnings];
        toast[failures.length ? 'error' : 'warning'](
          issues.length ? issues.join(' · ') : 'Verification completed; review the result before publishing',
        );
      }
    } catch (e) {
      const msg = e instanceof EdgeFunctionError ? e.displayMessage : e instanceof Error ? e.message : 'Preflight failed';
      toast.error(msg);
    } finally {
      setPreflighting(false);
    }
  };

  const publish = async () => {
    if (!form.id) { toast.error('Save listing first'); return; }
    if (!user?.id) { toast.error('Sign in again before publishing'); return; }
    setPublishing(true);
    try {
      const sb = await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected');
      const { data: membership, error: membershipError } = await sb.from('tenant_memberships')
        .select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      const tenantId = String(form.tenant_id || membership?.tenant_id || '');
      if (!tenantId) throw new Error('Your SWISH workspace is not ready');

      // Use the canonical eBay listing function used by the native app.
      // The old publish-listing function is not deployed.
      const { data: result, error } = await callEdgeFunction<Record<string, unknown>>('swish-ebay-list', {
        route: 'publish',
        tenantId,
        listingId: String(form.id),
        listingType: f('listing_type') || 'FixedPriceItem',
        auctionDays: Number(f('auction_duration') || 7),
        startPrice: Number(f('start_price') || form.price || 0),
        reservePrice: Number(f('reserve_price') || 0) || undefined,
        categoryId: String(form.category_id || ''),
        mediaUrls: selectedImages,
      });
      if (error) throw error;
      if (!result || result.success !== true) {
        const detail = typeof result?.error === 'string' ? result.error : 'The eBay listing was not published.';
        throw new Error(detail);
      }
      toast.success('Listing published to eBay');
      setF('status', 'active');
      setF('external_listing_id', result.externalListingId || '');
    } catch (e) {
      const msg = e instanceof EdgeFunctionError ? e.displayMessage : e instanceof Error ? e.message : 'Publishing failed';
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="w-full max-w-4xl space-y-4 animate-fade-in">
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
          <button onClick={save} disabled={upsert.isPending || !tenantId} className="btn-primary">
            <Save className="w-3.5 h-3.5" />{upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Image Gallery ── */}
      {linkedItem && (() => {
        const inv = linkedItem as Record<string, unknown>;
        const idData = (inv.identification_data || {}) as Record<string, unknown>;
        const scanImages = (idData.scan_images || {}) as Record<string, unknown>;
        // Capture Station stores both uploaded sides on items.media; older records may use
        // identification_data.scan_images or other legacy image fields.
        const asImageUrl = (value: unknown): string | null => {
          if (typeof value === 'string') return value.trim() || null;
          if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const candidate = obj.url || obj.publicUrl || obj.public_url || obj.src || obj.path;
            return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
          }
          return null;
        };
        const mediaValues = [
          ...(Array.isArray(inv.media) ? inv.media : []),
          ...(Array.isArray(inv.images) ? inv.images : []),
          ...(Array.isArray(inv.image_urls) ? inv.image_urls : []),
          ...(Array.isArray(inv.photos) ? inv.photos : []),
          ...Object.values(scanImages),
        ];
        const mediaEntries = mediaValues.map((value, i) => ({ side: i === 0 ? 'Obverse / photo 1' : i === 1 ? 'Reverse / photo 2' : `Photo ${i + 1}`, url: asImageUrl(value) })).filter((image): image is {side: string; url: string} => !!image.url);
        const existingListingImages = (form.images as string[] || []).filter(Boolean);
        const imageEntries = [
          ...mediaEntries,
          ...uploadedImages,
          ...existingListingImages.map((url, i) => ({ side: `Existing photo ${i + 1}`, url })),
        ].filter((image, index, all) => all.findIndex(other => other.url === image.url) === index);
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
      
      {/* Title and description — aligned with the SWISH mobile editor */}
      <section className="swish-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-primary/15 p-2 text-primary"><ImageIcon className="w-4 h-4" /></span>Title &amp; Description</div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listing title *</label>
            <span className={`text-xs ${f('title').length > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>{f('title').length}/80</span>
          </div>
          <input maxLength={80} value={f('title')} onChange={e => setF('title', e.target.value)} className="input-field mt-1" placeholder="Front-load brand, item type, colour and size" />
          <p className="mt-1 text-xs text-muted-foreground">Keep the eBay title to 80 characters or fewer.</p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtitle (optional)</label>
          <input value={f('subtitle')} onChange={e => setF('subtitle', e.target.value)} className="input-field mt-1" placeholder="Optional listing subtitle" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
          <textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={7} className="input-field mt-1 min-h-40" placeholder="Describe the item, condition, measurements and any flaws. Only include details you can verify." />
        </div>
      </section>

      {/* Listing type */}
      <section className="swish-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-primary/15 p-2 text-primary"><ShoppingBag className="w-4 h-4" /></span>Listing Type</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'FixedPriceItem', title: 'Buy It Now', hint: 'Fixed price · Good Till Cancelled' },
            { value: 'Chinese', title: 'Auction', hint: 'Timed bidding' },
          ].map(option => {
            const active = (f('listing_type') || 'FixedPriceItem') === option.value;
            return <button key={option.value} type="button" onClick={() => setF('listing_type', option.value)} className={`rounded-2xl border p-3 sm:p-4 text-left transition-colors ${active ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : 'border-border bg-secondary/20 hover:border-primary/40'}`}>
              <span className={`block text-sm font-bold ${active ? 'text-primary' : ''}`}>{option.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
            </button>;
          })}
        </div>
        {f('listing_type') === 'Chinese' && <div>
          <label className="text-xs text-muted-foreground">Auction duration</label>
          <select value={f('auction_duration') || '7'} onChange={e => setF('auction_duration', Number(e.target.value))} className="input-field mt-1">
            {[3,5,7,10].map(days => <option key={days} value={days}>{days} days</option>)}
          </select>
        </div>}
      </section>

      {/* Price and inventory */}
      <section className="swish-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-primary/15 p-2 text-primary"><Tag className="w-4 h-4" /></span>Price &amp; Inventory</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price (£) *</label><input type="number" step="0.01" min="0" value={f('price')} onChange={e => setF('price', e.target.value === '' ? '' : Number(e.target.value))} className="input-field mt-1" placeholder="0.00" /></div>
          <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</label><input type="number" min="1" step="1" value={f('quantity') || '1'} onChange={e => setF('quantity', Number(e.target.value))} className="input-field mt-1" /></div>
          <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SKU / SWISH ID</label><input value={f('sku')} onChange={e => setF('sku', e.target.value)} className="input-field mt-1" placeholder="Optional internal reference" /></div>
          <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inventory item ID</label><input value={f('item_id')} onChange={e => setF('item_id', e.target.value)} className="input-field mt-1 font-mono text-xs" placeholder="Linked inventory UUID" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Platform</label><div className="input-field mt-1 flex items-center" aria-label="Platform">eBay</div></div>
          <div><label className="text-xs text-muted-foreground">Status</label><select value={f('status')} onChange={e => setF('status', e.target.value)} className="input-field mt-1"><option value="draft">Draft</option><option value="active">Active</option><option value="ended">Ended</option><option value="scheduled">Scheduled</option></select></div>
        </div>
      </section>

      {/* Shipping and dispatch — preserve Simple Delivery policy */}
      <section className="swish-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-primary/15 p-2 text-primary"><Truck className="w-4 h-4" /></span>Shipping</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div><p className="text-sm font-semibold">Simple Delivery — Buyer Pays</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Use eBay Simple Delivery for shipping. SWISH does not switch this listing to seller-paid, free, or calculated shipping.</p></div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dispatch days</label>
          <div className="mt-2 flex flex-wrap gap-2">{[1,2,3,5,7].map(days => <button key={days} type="button" onClick={() => setF('dispatch_days', days)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${Number(f('dispatch_days') || 3) === days ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{days}d</button>)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Business days to dispatch.</p>
        </div>
      </section>

      {/* Category and condition */}
      <section className="swish-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-primary/15 p-2 text-primary"><Tag className="w-4 h-4" /></span>Category &amp; Condition</div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">eBay category</label>
          <div className="mt-1 flex flex-col sm:flex-row gap-2">
            <input value={f('category')} onChange={e => { setF('category', e.target.value); setF('category_id', ''); setCategorySuggestion(null); }} className="input-field min-w-0 flex-1" placeholder="Choose the most specific matching category" />
            <button type="button" onClick={() => void suggestCategory()} disabled={suggestingCategory} className="btn-secondary shrink-0">
              {suggestingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {suggestingCategory ? 'Suggesting…' : 'Suggest with AI'}
            </button>
          </div>
          {categorySuggestion && <p className="mt-2 flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" />Suggested: {categorySuggestion.name} · eBay category {categorySuggestion.id}. Please verify before publishing.</p>}
          {!f('category') && <p className="mt-2 text-xs text-amber-400">Select or suggest a category before publishing. Category determines required item specifics.</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</label><select value={f('condition')} onChange={e => setF('condition', e.target.value)} className="input-field mt-1"><option value="">Select…</option><option value="New">New</option><option value="Used - Like New">Used – Like New</option><option value="Used - Very Good">Used – Very Good</option><option value="Used - Good">Used – Good</option><option value="Used - Acceptable">Used – Acceptable</option><option value="For parts">For parts</option></select></div>
          <div><label className="text-xs text-muted-foreground">Condition description / flaws</label><input value={f('condition_description')} onChange={e => setF('condition_description', e.target.value)} className="input-field mt-1" placeholder="Visible wear, defects or notes" /></div>
        </div>
      </section>
    </div>
  );
}
