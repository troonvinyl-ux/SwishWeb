/**
 * ListingNew — Create a new listing
 *
 * REQ-LST-001: Listings must be generated from confirmed inventory
 * REQ-LST-002: Listings always start as draft until explicit publication
 * REQ-LST-003: Simple Delivery + Buyer pays preserved
 *
 * When opened from Coin Flipper or InventoryItem via ?item_id=<uuid>,
 * the form auto-pre-fills from AI identification data stored on the record:
 *   - title, description, category, condition from confirmed_candidate
 *   - weight, diameter, year, country, metal, reference from scan_metadata
 *   - suggested price from valuation (ebay_realised > median > sale_price)
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useInsert, useTableRow } from '@/hooks/useSupabaseQuery';
import { callEdgeFunction } from '@/lib/supabase';
import {
  ArrowLeft, Save, Zap, Package, AlertTriangle, Info,
  CheckCircle, Scale, Ruler, Globe, Calendar,
  BookOpen, TrendingUp, ChevronDown, ChevronRight, Hash, Layers,
  ImageIcon, X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { getActiveNiche } from '@/lib/niches';

// ---------------------------------------------------------------------------
// Description builder — generates an eBay-ready coin description from AI data
// ---------------------------------------------------------------------------

function buildCoinDescription(
  candidate: Record<string, unknown>,
  scanMeta: Record<string, unknown>,
  inv: Record<string, unknown>
): string {
  const lines: string[] = [];

  const title       = ((candidate.title || candidate.denomination || inv.title) as string | undefined)?.trim();
  const country     = (candidate.country as string | undefined)?.trim();
  const year        = candidate.year as string | number | undefined;
  const metal       = ((candidate.metal || candidate.alloy) as string | undefined)?.trim();
  const weight      = (scanMeta.weight as string | undefined)?.trim();
  const diameter    = (scanMeta.diameter as string | undefined)?.trim();
  const desc        = ((candidate.description || inv.description) as string | undefined)?.trim();
  const ref         = (candidate.reference as string | undefined)?.trim();
  const manufacturer = ((candidate.manufacturer || candidate.brand) as string | undefined)?.trim();
  const conditionAssumed = (candidate.condition_assumed as string | undefined)?.trim();
  const notes       = (scanMeta.notes as string | undefined)?.trim();
  const evidence    = candidate.evidence as string | string[] | undefined;
  const denomination = (candidate.denomination as string | undefined)?.trim();

  if (title) lines.push(title);

  const details: string[] = [];
  if (country) details.push(country);
  if (year) details.push(String(year));
  if (manufacturer) details.push(manufacturer);
  if (denomination && denomination !== title) details.push(denomination);
  if (details.length) lines.push(details.join(' · '));

  const specs: string[] = [];
  if (metal) specs.push(`Metal: ${metal}`);
  if (weight) specs.push(`Weight: ${weight}g`);
  if (diameter) specs.push(`Diameter: ${diameter}mm`);
  if (ref) specs.push(`Reference: ${ref}`);
  if (specs.length) { lines.push(''); lines.push(specs.join(' · ')); }

  if (conditionAssumed) { lines.push(''); lines.push(`Grade: ${conditionAssumed}`); }

  if (desc) { lines.push(''); lines.push(desc); }

  if (notes) { lines.push(''); lines.push(`Seller notes: ${notes}`); }

  if (evidence) {
    const evArr = (Array.isArray(evidence) ? evidence : [evidence]).filter(Boolean) as string[];
    if (evArr.length > 0) {
      lines.push('');
      lines.push('Notable features:');
      evArr.forEach(e => lines.push(`• ${e}`));
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('Please examine all photographs carefully before purchasing. Item is as described and shown in images.');
  lines.push('Combined postage available — please message for a quote before buying multiple items.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Condition mapper — coin grading → eBay condition options
// ---------------------------------------------------------------------------

function mapCoinCondition(condition?: string): string {
  if (!condition) return '';
  const c = condition.toLowerCase();
  if (c.match(/uncirculated|mint state|ms\d|^bu\b|^unc\b/)) return 'Used - Like New';
  if (c.match(/extremely fine|ef\b|xf\b|au\b/))              return 'Used - Very Good';
  if (c.match(/very fine|vf\b/))                              return 'Used - Very Good';
  if (c.match(/\bfine\b|\baf\b|\bvf-f\b/))                   return 'Used - Good';
  if (c.match(/very good|vg\b/))                              return 'Used - Good';
  if (c.match(/good\b|fair\b|ag\b/))                          return 'Used - Acceptable';
  if (c.match(/poor|basal|damaged/))                          return 'Used - Acceptable';
  return 'Used - Good'; // sensible default for circulated coins
}

// ---------------------------------------------------------------------------
// Category mapper — coin type → eBay category string
// ---------------------------------------------------------------------------

function mapCoinCategory(category?: string, country?: string): string {
  const cat = (category || '').toLowerCase();
  const ctr = (country || '').toLowerCase();
  if (cat.includes('ancient') || cat.includes('roman') || cat.includes('greek') || cat.includes('hammered')) return 'Coins: Ancient';
  if (cat.includes('token') || cat.includes('medal'))  return 'Coins: Tokens & Medals';
  if (cat.includes('error') || cat.includes('mule') || cat.includes('variety')) return 'Coins: Errors, Mules & Varieties';
  if (ctr.match(/britain|england|great britain|united kingdom|scotland|wales|ireland/) || cat.includes('british') || cat.includes('uk')) return 'Coins: British';
  if (cat.includes('world') || cat.includes('foreign') || (ctr && !ctr.match(/britain|england|uk/))) return 'Coins: World';
  return 'Coins: British'; // default for SWISH's primary market
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValuationPanel {
  ebay_realised?: number;
  ebay_asking?: number;
  metal_value?: number;
  catalogue_value?: number;
  dealer_value?: number;
  auction_value?: number;
  median?: number;
  estimated_value?: number;
  low?: number;
  high?: number;
  comparable_count?: number;
  terapeak_available?: boolean;
  insufficient_evidence?: boolean;
  [key: string]: unknown;
}

const DEFAULT_FORM: Record<string, unknown> = {
  title: '',
  description: '',
  platform: 'ebay',
  status: 'draft',       // REQ-LST-002 — always draft on create
  price: '',
  condition: '',
  category: 'Coins: British',
  item_id: '',
  shipping_type: 'simple_delivery',  // REQ-LST-003
  shipping_paid_by: 'buyer',         // REQ-LST-003
  quantity: '1',
  // Coin item specifics
  weight_g: '',
  diameter_mm: '',
  year: '',
  country: '',
  metal: '',
  reference: '',
};

export default function ListingNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const insert = useInsert('listings');
  const [activeNiche] = useState(() => getActiveNiche());

  const [form, setForm] = useState<Record<string, unknown>>(DEFAULT_FORM);
  const [preflighting, setPreflighting] = useState(false);
  const [preflightResult, setPreflightResult] = useState<Record<string, unknown> | null>(null);
  const [valuationPanel, setValuationPanel] = useState<ValuationPanel | null>(null);
  const [showValuation, setShowValuation] = useState(true);
  const [showSpecifics, setShowSpecifics] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [preFilled, setPreFilled] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const setF = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));
  const f = (key: string) => (form[key] as string) || '';

  // Query params injected by Coin Flipper confirmed screen or InventoryItem "List" button
  const itemIdParam = searchParams.get('item_id') || '';
  const titleParam  = searchParams.get('title') || '';
  const priceParam  = searchParams.get('price') || '';

  // Load linked inventory record to extract AI identification data
  const { data: linkedItem } = useTableRow('inventory', itemIdParam || null);
  const inv = linkedItem as Record<string, unknown> | null;

  // Do not create a listing from an item that belongs to another selected niche.
  const linkedItemNiche = inv?.niche_id || inv?.niche || inv?.specialist_id
    || (inv?.attributes && typeof inv.attributes === 'object'
      ? (inv.attributes as Record<string, unknown>).niche_id
      : undefined);
  const linkedNicheText = typeof linkedItemNiche === 'string' ? linkedItemNiche.toLowerCase() : '';
  const linkedItemMatchesNiche = !activeNiche || !linkedItemNiche
    || activeNiche.id === linkedNicheText
    || activeNiche.specialistIds.some(id => id.toLowerCase() === linkedNicheText);



  // Initial param pre-fill (lightweight — just the URL params)
  useEffect(() => {
    if (itemIdParam) {
      setForm(p => ({
        ...p,
        item_id: itemIdParam,
        title: titleParam || (p.title as string) || '',
        price: priceParam || (p.price as string) || '',
      }));
    }
  }, [itemIdParam, titleParam, priceParam]);

  // ── AI DATA PRE-FILL ────────────────────────────────────────────────────
  // Runs once when the inventory record loads and has not yet been applied
  useEffect(() => {
    if (!inv || preFilled) return;

    const idData     = (inv.identification_data || {}) as Record<string, unknown>;
    const candidate  = (idData.confirmed_candidate || {}) as Record<string, unknown>;
    const scanMeta   = (idData.scan_metadata || {}) as Record<string, unknown>;
    const valuation  = (idData.valuation || {}) as ValuationPanel;

    const hasAiData = Object.keys(candidate).length > 0;

    // Build eBay-ready description from AI evidence
    const generatedDescription = hasAiData
      ? buildCoinDescription(candidate, scanMeta, inv)
      : ((inv.description as string) || '');

    // Map coin grade to eBay condition option
    const mappedCondition = mapCoinCondition(
      (candidate.condition_assumed as string) || (inv.condition as string)
    );

    // Map category
    const mappedCategory = mapCoinCategory(
      candidate.category as string | undefined,
      candidate.country as string | undefined
    );

    // Suggest price: prefer eBay realised > median > estimated > sale_price > valuation
    const suggestedPrice: number | null =
      (valuation.ebay_realised ?? null) ||
      (valuation.median ?? null) ||
      (valuation.estimated_value ?? null) ||
      ((inv.sale_price as number) ?? null) ||
      ((inv.valuation as number) ?? null) ||
      null;

    // Extract scan images and pre-select obverse + reverse
    const scanImages = (idData.scan_images || {}) as Record<string, string>;
    const defaultSelected: string[] = [];
    if (scanImages.obverse) defaultSelected.push(scanImages.obverse);
    if (scanImages.reverse) defaultSelected.push(scanImages.reverse);

    setForm(p => ({
      ...p,
      title: (p.title as string) || (inv.title as string) || (candidate.title as string) || (candidate.denomination as string) || '',
      description: (p.description as string) || generatedDescription,
      category: mappedCategory || (p.category as string) || 'Coins: British',
      condition: mappedCondition || (p.condition as string) || '',
      price: (p.price as string) || (suggestedPrice ? suggestedPrice.toFixed(2) : ''),
      // Coin item specifics from scan metadata
      weight_g:    String(scanMeta.weight ?? ''),
      diameter_mm: String(scanMeta.diameter ?? ''),
      year:        String(candidate.year ?? ''),
      country:     String(candidate.country ?? ''),
      metal:       String(candidate.metal ?? candidate.alloy ?? ''),
      reference:   String(candidate.reference ?? ''),
      images: defaultSelected,
    }));

    setSelectedImages(defaultSelected);

    // Store valuation for the price-suggestion panel
    if (Object.keys(valuation).length > 0) {
      setValuationPanel(valuation);
    }

    setPreFilled(true);
  }, [inv, preFilled]);

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!f('title')) { toast.error('Title is required'); return; }

    // REQ-LST-001 — warn if no inventory linkage
    if (!f('item_id')) {
      const confirmed = confirm(
        'No inventory item linked.\n\nBest practice is to create listings from a confirmed inventory record ' +
        'so item identity, images, and valuation are preserved.\n\nContinue without linking?'
      );
      if (!confirmed) return;
    }

    const row: Record<string, unknown> = {
      ...form,
      niche_id: activeNiche?.id ?? 'coins',
      specialist_id: activeNiche?.specialistIds[0] ?? 'coins',
      status: 'draft',   // REQ-LST-002 — cannot be overridden to 'active' on insert
      price: parseFloat(form.price as string) || null,
      quantity: parseInt(form.quantity as string, 10) || 1,
      images: selectedImages,
    };

    insert.mutate(row, {
      onSuccess: (data) => {
        toast.success('Draft listing created');
        const newId = (data as Record<string, unknown>)?.id as string;
        navigate(newId ? `/listings/${newId}` : '/listings');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  // ── PREFLIGHT ────────────────────────────────────────────────────────────
  const handlePreflight = async () => {
    if (!f('title')) { toast.error('Enter a title before running preflight'); return; }
    setPreflighting(true);
    setPreflightResult(null);
    const { data, error } = await callEdgeFunction('listing-preflight', {
      listing_data: { ...form, price: parseFloat(form.price as string) || null },
    });
    if (error) {
      toast.error((error as { displayMessage?: string; message: string }).displayMessage || error.message);
    } else {
      const res = data as Record<string, unknown>;
      setPreflightResult(res);
      const status = (res?.status || res?.result || '') as string;
      if (status === 'pass' || status === 'ok') {
        toast.success('Preflight passed — listing ready to save');
      } else {
        const issues = [
          ...((res?.errors as string[]) || []),
          ...((res?.warnings as string[]) || []),
        ];
        if (issues.length) toast.warning(issues.slice(0, 3).join(' · '));
        else toast.info('Preflight complete');
      }
    }
    setPreflighting(false);
  };



  if (itemIdParam && inv && !linkedItemMatchesNiche) {
    return (
      <div className="swish-card max-w-2xl mx-auto p-6 space-y-3">
        <h1 className="page-title">Item belongs to another specialist</h1>
        <p className="text-sm text-muted-foreground">
          This item does not match the active {activeNiche?.name ?? 'SWISH'} workspace. Switch to the item's workspace before creating a listing.
        </p>
        <Link to="/niches" className="btn-secondary inline-flex">Switch workspace</Link>
      </div>
    );
  }


  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/listings" className="btn-ghost py-1.5 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">New Listing</h1>
          <p className="page-subtitle">
            {inv
              ? `From: ${(inv.title || inv.sku || 'inventory record') as string}`
              : 'Create a new draft listing'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreflight} disabled={preflighting} className="btn-ghost">
            <Zap className="w-3.5 h-3.5" />{preflighting ? 'Checking…' : 'Preflight'}
          </button>
          <button onClick={handleSave} disabled={insert.isPending} className="btn-primary">
            <Save className="w-3.5 h-3.5" />{insert.isPending ? 'Creating…' : 'Create Draft'}
          </button>
        </div>
      </div>

      {/* ── REQ-LST-001: no inventory link warning ── */}
      {!f('item_id') && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground swish-card p-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
          <span>
            Best practice: create listings from a <strong>confirmed inventory record</strong>.
            Use the{' '}
            <Link to="/identify" className="text-primary hover:underline">Coin Flipper</Link>{' '}
            to identify and save a coin, or open an existing item in{' '}
            <Link to="/inventory" className="text-primary hover:underline">Inventory</Link>{' '}
            and click <strong>List</strong>.
          </span>
        </div>
      )}

      {/* ── AI pre-fill badge ── */}
      {preFilled && inv && (
        <div className="flex items-center gap-2 text-xs text-green-400 swish-card p-3">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>AI data pre-filled</strong> — title, description, category, condition, measurements,
            and price suggestion extracted from Coin Flipper identification.
            Review all fields before saving.
          </span>
        </div>
      )}

      {/* ── Linked inventory preview ── */}
      {inv && (
        <div className="swish-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
            {inv.image_url
              ? <img src={inv.image_url as string} alt="" className="w-full h-full object-cover" />
              : <Package className="w-5 h-5 text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{(inv.title || 'Inventory item') as string}</p>
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-medium">{(inv.status || 'unknown') as string}</span>
              {inv.valuation ? ` · Valuation: ${formatCurrency(inv.valuation as number)}` : ''}
              {inv.confidence ? ` · Confidence: ${Math.round((inv.confidence as number) * 100)}%` : ''}
            </p>
          </div>
          {(inv.status as string) !== 'active' && (
            <div className="flex items-center gap-1 text-xs text-warning shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />Not confirmed
            </div>
          )}
        </div>
      )}

      {/* ── Valuation panel — click a value to use it as the price ── */}
      {valuationPanel && Object.keys(valuationPanel).length > 0 && (
        <div className="swish-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowValuation(!showValuation)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/20 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <TrendingUp className="w-4 h-4 text-primary" />
              Market valuation
              <span className="text-xs font-normal text-muted-foreground">— click a value to use as price</span>
            </span>
            {showValuation
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showValuation && (
            <div className="px-4 pb-4 space-y-3">
              {valuationPanel.insufficient_evidence && (
                <div className="flex items-center gap-2 text-xs text-warning">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Insufficient market data — price shown is an estimate only, not a verified sale value
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  { label: 'eBay Realised',  value: valuationPanel.ebay_realised,   note: '✓ verified sold',   highlight: true  },
                  { label: 'Auction value',  value: valuationPanel.auction_value,   note: '✓ hammer average',  highlight: true  },
                  { label: 'Median est.',    value: valuationPanel.median,          note: 'mid range estimate', highlight: false },
                  { label: 'Metal value',    value: valuationPanel.metal_value,     note: 'spot price',        highlight: false },
                  { label: 'Catalogue',      value: valuationPanel.catalogue_value, note: 'reference price',   highlight: false },
                  { label: 'Dealer value',   value: valuationPanel.dealer_value,    note: 'dealer buy price',  highlight: false },
                  { label: 'eBay Asking',    value: valuationPanel.ebay_asking,     note: '⚠ asking only',    highlight: false },
                ] as const).filter(v => v.value != null).map(v => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => setF('price', (v.value! as number).toFixed(2))}
                    title={`Use ${formatCurrency(v.value! as number)} as listing price`}
                    className={`rounded-lg p-2.5 text-left transition-all hover:ring-2 hover:ring-primary/40 active:scale-95 group ${
                      v.highlight
                        ? 'bg-green-500/5 ring-1 ring-green-500/20'
                        : 'bg-secondary/40 hover:bg-secondary/60'
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">{v.label}</div>
                    <div className="text-sm font-bold swish-gold group-hover:text-primary transition-colors">
                      {formatCurrency(v.value! as number)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{v.note}</div>
                  </button>
                ))}
              </div>

              {valuationPanel.comparable_count != null && (
                <p className="text-xs text-muted-foreground">
                  Based on {valuationPanel.comparable_count} comparable{valuationPanel.comparable_count !== 1 ? 's' : ''}
                  {valuationPanel.terapeak_available ? ' · Terapeak data' : ''}
                </p>
              )}

              <p className="text-xs text-muted-foreground bg-warning/5 border border-warning/20 rounded px-3 py-2">
                ⚠ eBay Asking prices are <strong>not verified sales</strong>.
                Only &quot;eBay Realised&quot; represents completed transactions.
                Do not use asking prices as market value.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Preflight result ── */}
      {preflightResult && (
        <div className={`swish-card p-3 space-y-1.5 text-xs border-l-2 ${
          ['pass', 'ok'].includes((preflightResult.status || preflightResult.result) as string)
            ? 'border-green-500'
            : 'border-warning'
        }`}>
          <p className="font-medium capitalize">
            Preflight: {(preflightResult.status || preflightResult.result || 'complete') as string}
          </p>
          {((preflightResult.errors as string[]) || []).map((e, i) => (
            <p key={i} className="text-destructive">✗ {e}</p>
          ))}
          {((preflightResult.warnings as string[]) || []).map((w, i) => (
            <p key={i} className="text-warning">⚠ {w}</p>
          ))}
          {((preflightResult.passes as string[]) || []).map((p, i) => (
            <p key={i} className="text-green-400">✓ {p}</p>
          ))}
        </div>
      )}

      {/* ── Main form fields ── */}
      <div className="swish-card p-5 space-y-4">

        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground">Title *</label>
          <input
            value={f('title')}
            onChange={e => setF('title', e.target.value)}
            className="input-field mt-0.5"
            placeholder="e.g. 1902 Edward VII Half Crown — Very Fine"
            maxLength={120}
          />
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${titleLen > 80 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {titleLen}/80 eBay character limit
            </span>
            {titleLen > 80 && (
              <span className="text-xs text-destructive">Title exceeds eBay limit — shorten before publishing</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <textarea
            value={f('description')}
            onChange={e => setF('description', e.target.value)}
            rows={10}
            className="input-field mt-0.5 font-mono text-xs leading-relaxed"
            placeholder="Item description…"
          />
          {preFilled && inv && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Pre-filled from AI identification — edit as needed before publishing
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Platform */}
          <div>
            <label className="text-xs text-muted-foreground">Platform</label>
            <select value={f('platform')} onChange={e => setF('platform', e.target.value)} className="input-field mt-0.5">
              <option value="ebay">eBay</option>
              <option value="amazon">Amazon</option>
              <option value="depop">Depop</option>
              <option value="vinted">Vinted</option>
            </select>
          </div>

          {/* Status — locked to draft (REQ-LST-002) */}
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <div className="input-field mt-0.5 bg-secondary/50 text-muted-foreground text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
              Draft — publish from listing editor after review
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-muted-foreground">Price (£) *</label>
            <input
              type="number" step="0.01" min="0.99"
              value={f('price')}
              onChange={e => setF('price', e.target.value)}
              className="input-field mt-0.5"
              placeholder="0.00"
            />
            {valuationPanel?.ebay_realised && !f('price') && (
              <p className="text-xs text-primary mt-1">
                Suggested: {formatCurrency(valuationPanel.ebay_realised)} (eBay realised avg)
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-muted-foreground">Quantity</label>
            <input
              type="number" min="1"
              value={f('quantity')}
              onChange={e => setF('quantity', e.target.value)}
              className="input-field mt-0.5"
              placeholder="1"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="text-xs text-muted-foreground">Condition</label>
            <select value={f('condition')} onChange={e => setF('condition', e.target.value)} className="input-field mt-0.5">
              <option value="">Select…</option>
              <option value="Used - Like New">Used – Like New (Uncirculated / BU)</option>
              <option value="Used - Very Good">Used – Very Good (EF / AU / VF)</option>
              <option value="Used - Good">Used – Good (Fine / VG)</option>
              <option value="Used - Acceptable">Used – Acceptable (Good / Fair or below)</option>
              <option value="For parts">For parts / not working</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground">eBay Category</label>
            <select value={f('category')} onChange={e => setF('category', e.target.value)} className="input-field mt-0.5">
              <option value="Coins: British">Coins: British</option>
              <option value="Coins: World">Coins: World</option>
              <option value="Coins: Ancient">Coins: Ancient</option>
              <option value="Coins: Errors, Mules & Varieties">Coins: Errors, Mules &amp; Varieties</option>
              <option value="Coins: Tokens & Medals">Coins: Tokens &amp; Medals</option>
              <option value="Coins">Coins (other)</option>
            </select>
          </div>
        </div>

        {/* Inventory link */}
        <div>
          <label className="text-xs text-muted-foreground">Linked Inventory Item ID</label>
          <input
            value={f('item_id')}
            onChange={e => setF('item_id', e.target.value)}
            className="input-field mt-0.5 font-mono text-xs"
            placeholder="UUID of linked inventory record"
          />
        </div>
      </div>

      {/* ── Image Gallery ── */}
      {inv && (() => {
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
                  ({selectedImages.length} of {imageEntries.length} selected for listing)
                </span>
              </span>
              {showImages
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showImages && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Click images to select/deselect for the eBay listing. Selected images are shown with a green border.
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
                    No images selected — eBay listings without photos perform poorly. Select at least the obverse and reverse.
                  </div>
                )}
                {preFilled && selectedImages.length > 0 && (
                  <p className="text-xs text-green-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    Obverse and reverse pre-selected from Coin Flipper scan
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Coin item specifics ── */}
      <div className="swish-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSpecifics(!showSpecifics)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/20 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            Item Specifics
            <span className="text-xs font-normal text-muted-foreground">(eBay coin specifics)</span>
          </span>
          {showSpecifics
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showSpecifics && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Scale className="w-3 h-3" />Weight (g)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={f('weight_g')}
                  onChange={e => setF('weight_g', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 9.45"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Ruler className="w-3 h-3" />Diameter (mm)
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={f('diameter_mm')}
                  onChange={e => setF('diameter_mm', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 28.0"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" />Year
                </label>
                <input
                  value={f('year')}
                  onChange={e => setF('year', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1902"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Globe className="w-3 h-3" />Country
                </label>
                <input
                  value={f('country')}
                  onChange={e => setF('country', e.target.value)}
                  className="input-field"
                  placeholder="e.g. Great Britain"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Layers className="w-3 h-3" />Metal / Composition
                </label>
                <input
                  value={f('metal')}
                  onChange={e => setF('metal', e.target.value)}
                  className="input-field"
                  placeholder="e.g. Silver, 0.925"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Hash className="w-3 h-3" />Reference (S-, KM-, etc.)
                </label>
                <input
                  value={f('reference')}
                  onChange={e => setF('reference', e.target.value)}
                  className="input-field"
                  placeholder="e.g. S-3980, KM-23"
                />
              </div>
            </div>
            {preFilled && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" />
                Measurements and specifics pre-filled from Coin Flipper scan metadata
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── REQ-LST-003: Shipping locked ── */}
      <div className="swish-card p-4 space-y-2">
        <p className="text-xs font-semibold">Shipping</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="input-field mt-0.5 bg-secondary/50 text-muted-foreground text-xs">
              Simple Delivery (eBay managed)
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Paid by</label>
            <div className="input-field mt-0.5 bg-secondary/50 text-muted-foreground text-xs">
              Buyer pays postage
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3 h-3 shrink-0" />
          Simple Delivery and Buyer pays are required by SWISH. These cannot be changed here.
        </p>
      </div>
    </div>
  );
}
