import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getDefaultSpecialistForNiche, getSpecialistIdsForNiche } from '@/lib/niche';
import { Upload, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type ImportResult = { imported: number; updated: number; skipped: number; errors: string[]; type: string };

const NICHE_CATEGORIES: Record<string, string[]> = {
  coins: ['4726', '40714', '18594', '4157', '4735', '11116', '14486'],
  motocross: ['6760', '6759', '10767', '10768', '6761', '26455'],
  bicycles: ['2904', '56197', '177831', '48647', '56199', '177832', '2906', '15279'],
  clothing: ['1059', '11450', '15724', '15725', '152506', '175748'],
  trading_cards: ['183454', '2536', '261328', '261329', '261330', '246'],
  antiques: ['20081', '20091', '870', '261186', '550', '37958', '360', '14324', '14325', '50', '13956'],
  // These niches rely on title/category-name classification until their eBay
  // category IDs are confirmed from the current marketplace taxonomy.
  fossils: [],
  beauty: [],
  tech: [],
  surplus_flip: [],
};
const NICHE_SPECIALIST: Record<string, string> = {
  coins: 'coins', motocross: 'motocross', bicycles: 'bicycles',
  clothing: 'clothing', trading_cards: 'pokemon_cards', antiques: 'antiques',
  fossils: 'fossils', beauty: 'beauty', tech: 'tech', surplus_flip: 'surplus_trader',
};
const TITLE_PATTERNS: Record<string, RegExp> = {
  clothing: /\b(jacket|coat|dress|jeans|shirt|trousers|shoes|trainers|hoodie|jumper|sweater|blazer|suit|handbag|skirt|top|cardigan|boots|fashion|vintage clothing)\b/i,
  bicycles: /\b(bicycle|bikes?|mountain bike|road bike|cycling|bmx|bike frame|bike wheel)\b/i,
  motocross: /\b(motocross|dirt bike|enduro|mx bike|off.?road motorcycle|ktm|husqvarna|crf\d|yz\d|kx\d)\b/i,
  coins: /\b(coin|coins|denarius|dirham|drachm|drachma|tanker|half dirham|silver coin|ancient coin|banknote)\b/i,
  trading_cards: /\b(pokemon|pokémon|trading card|sports card|magic the gathering|yu-gi-oh|mtg|tcg)\b/i,
  antiques: /\b(antique|antiquarian|vintage pottery|ceramic|porcelain|militaria|pocket watch|antique furniture)\b/i,
  fossils: /\b(fossil|ammonite|trilobite|petrified|ichthyosaur|dinosaur bone)\b/i,
  beauty: /\b(skincare|makeup|cosmetic|perfume|fragrance|beauty product|lipstick|foundation|serum)\b/i,
  tech: /\b(laptop|computer|tablet|smartphone|console|graphics card|processor|monitor|electronics)\b/i,
  surplus_flip: /\b(surplus|pallet|job lot|bulk lot|clearance lot|mixed lot|wholesale lot|manifest|liquidation)\b/i,
};

const CATEGORY_NAME_PATTERNS: Record<string, RegExp> = {
  coins: /\\b(coin|numismatic|banknote|currency|medal|token|bullion)\\b/i,
  motocross: /\\b(motocross|enduro|dirt bike|motorcycle|motorbike|pit bike)\\b/i,
  bicycles: /\\b(bicycle|cycling|mountain bike|road bike|bmx|electric bike)\\b/i,
  clothing: /\\b(clothing|fashion|shoes|trainers|sneakers|apparel|garment)\\b/i,
  trading_cards: /\\b(trading cards?|pokemon|pokémon|sports cards?|collectible card)\\b/i,
  antiques: /\\b(antiques?|antiquarian|pottery|ceramics|watches|militaria|fine jewellery)\\b/i,
  fossils: /\\b(fossils?|ammonites?|trilobites?|minerals? and crystals)\\b/i,
  beauty: /\\b(health and beauty|skincare|skin care|makeup|cosmetics?|fragrances?|perfumes?)\\b/i,
  tech: /\\b(computers?|laptops?|tablets?|mobile phones?|electronics|computer components)\\b/i,
  surplus_flip: /\\b(job lots?|surplus|pallets?|wholesale lots?|clearance lots?|liquidation)\\b/i,
};

function normaliseKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function readField(row: Record<string, unknown>, aliases: string[]): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const key = normaliseKey(alias);
    const match = entries.find(([header]) => normaliseKey(header) === key);
    if (match && match[1] != null) return String(match[1]).trim();
  }
  return '';
}
function parsePrice(value: string): number {
  const n = Number(value.replace(/[£$€,\s]/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function listingStatus(value: string): 'active' | 'sold' | 'ended' {
  const v = value.toLowerCase();
  if (v.includes('sold')) return 'sold';
  if (v.includes('ended') || v.includes('closed')) return 'ended';
  return 'active';
}
function downloadCsvOrXlsx(rows: Record<string, unknown>[], name: string) {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, 'SWISH');
  XLSX.writeFile(book, name);
}

export default function EbayImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { tenantId: currentTenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('listings');

  const getWorkspace = async () => {
    const sb = getSupabaseClient();
    if (!sb || !user) throw new Error('Please sign in again before importing or exporting.');
    if (!currentTenantId || tenantLoading) throw new Error('Your SWISH workspace is not ready.');
    return { sb, tenantId: currentTenantId };
  };

  const activeNiche = getActiveNicheId();
  const specialistId = NICHE_SPECIALIST[activeNiche] || getDefaultSpecialistForNiche(activeNiche);
  const selectedCategoryIds = NICHE_CATEGORIES[activeNiche] || [];
  const nicheSpecialistIds = getSpecialistIdsForNiche(activeNiche);
  const nicheKey = activeNiche;

  const handleFile = (files: FileList | null) => {
    if (!files?.[0]) return;
    setFile(files[0]);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) { toast.error('Select a CSV or Excel file first.'); return; }
    if (importType !== 'listings') {
      toast.error('CSV import currently supports eBay listings only. Export remains available for each data type.');
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const { sb, tenantId } = await getWorkspace();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!rows.length) throw new Error('The selected file contains no listing rows.');
      if (rows.length > 5000) throw new Error('Please split files larger than 5,000 rows into smaller imports.');

      const { data: existing, error: existingError } = await sb.from('listings')
        .select('id, item_id, external_listing_id, items!inner(specialist_id)')
        .eq('tenant_id', tenantId).eq('marketplace_id', 'ebay')
        .not('external_listing_id', 'is', null);
      if (existingError) throw existingError;
      const existingById = new Map<string, Record<string, unknown>>();
      for (const listing of existing || []) {
        if (listing.external_listing_id) {
          const joined = listing.items as Record<string, unknown> | Record<string, unknown>[] | null;
          const item = Array.isArray(joined) ? joined[0] : joined;
          existingById.set(String(listing.external_listing_id), { ...(listing as Record<string, unknown>), existing_specialist_id: item?.specialist_id });
        }
      }

      let imported = 0, updated = 0, skipped = 0;
      const errors: string[] = [];
      for (const [index, row] of rows.entries()) {
        try {
          const externalId = readField(row, ['Item number', 'Item ID', 'Listing ID', 'eBay Item ID', 'External listing ID', 'external_listing_id']);
          const title = readField(row, ['Title', 'Item title', 'Listing title', 'Item Title']);
          const description = readField(row, ['Description', 'Item description']);
          const categoryId = readField(row, ['eBay category 1 number', 'Category ID', 'Category number', 'eBay Category ID', 'category_id']).replace(/\D/g, '');
          const categoryName = readField(row, ['eBay category 1 name', 'Category name', 'eBay category name']);
          const rawStatus = readField(row, ['Listing status', 'Status', 'Listing site']);
          const status = listingStatus(rawStatus);
          const price = parsePrice(readField(row, ['Current price', 'Buy It Now price', 'Start price', 'Price']));
          if (!externalId || !title) { skipped++; continue; }

          const classifiedCategory = Object.entries(NICHE_CATEGORIES).find(([, ids]) => ids.includes(categoryId))?.[0];
          const classifiedByCategoryName = Object.entries(CATEGORY_NAME_PATTERNS)
            .find(([, pattern]) => pattern.test(categoryName))?.[0];
          const categoryNameMatch = classifiedByCategoryName === nicheKey;
          const titleMatch = TITLE_PATTERNS[nicheKey]?.test(title) ?? false;
          // Known other-niche category IDs or names always win over title keywords.
          // Unknown category IDs can still be imported when category-name or title
          // evidence matches the active niche; otherwise the row is skipped.
          if ((classifiedCategory && classifiedCategory !== nicheKey) ||
              (!classifiedCategory && classifiedByCategoryName && !categoryNameMatch) ||
              (!classifiedCategory && !categoryNameMatch && !titleMatch) ||
              (classifiedCategory && !selectedCategoryIds.includes(categoryId))) {
            skipped++;
            continue;
          }

          const prior = existingById.get(externalId);
          if (prior) {
            // Never move an existing eBay listing between niches because a CSV
            // was imported from a different workspace.
            if (!nicheSpecialistIds.includes(String(prior.existing_specialist_id || ''))) {
              skipped++;
              continue;
            }
            const { error: listingUpdateError } = await sb.from('listings').update({
              title: title.slice(0, 200), description, price, status,
              category_id: categoryId || null, updated_at: new Date().toISOString(),
            }).eq('id', String(prior.id)).eq('tenant_id', tenantId);
            if (listingUpdateError) throw listingUpdateError;
            const { error: itemUpdateError } = await sb.from('items').update({
              canonical_title: title.slice(0, 200), description,
              expected_selling_price: price,
              status: status === 'sold' ? 'sold' : status === 'active' ? 'listed' : 'identified',
              updated_at: new Date().toISOString(),
            }).eq('id', String(prior.item_id)).eq('tenant_id', tenantId);
            if (itemUpdateError) throw itemUpdateError;
            updated++;
            continue;
          }

          const itemStatus = status === 'sold' ? 'sold' : status === 'active' ? 'listed' : 'identified';
          const { data: item, error: itemError } = await sb.from('items').insert({
            tenant_id: tenantId,
            canonical_title: title.slice(0, 200),
            description,
            specialist_id: specialistId,
            status: itemStatus,
            identification_source: 'user_confirmed',
            identification_confidence: categoryId ? 0.75 : 0.55,
            expected_selling_price: price,
            inventory_origin: 'csv_import',
            attributes: { ebay_category_id: categoryId || null, ebay_category_name: categoryName || null, classification_niche: nicheKey },
          }).select('id').single();
          if (itemError || !item) throw itemError || new Error('Could not create inventory item.');

          const { error: listingError } = await sb.from('listings').insert({
            tenant_id: tenantId,
            item_id: item.id,
            marketplace_id: 'ebay',
            external_listing_id: externalId,
            title: title.slice(0, 200),
            description,
            price,
            floor_price: 0,
            ceiling_price: 0,
            shipping_cost: 0,
            status,
            category_id: categoryId || null,
            import_source: 'csv_import',
            published_at: readField(row, ['Start date', 'Date listed', 'Listing start date']) || new Date().toISOString(),
          });
          if (listingError) {
            await sb.from('items').delete().eq('id', item.id).eq('tenant_id', tenantId);
            if (listingError.code === '23505') { skipped++; continue; }
            throw listingError;
          }
          existingById.set(externalId, { id: '', item_id: item.id, external_listing_id: externalId });
          imported++;
        } catch (error) {
          skipped++;
          if (errors.length < 10) errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Import failed'}`);
        }
      }

      const finalResult = { imported, updated, skipped, errors, type: 'listings' };
      setResult(finalResult);
      await Promise.all(['items', 'listings'].map(table => qc.invalidateQueries({ queryKey: [table] })));
      toast.success(`Import complete: ${imported} added, ${updated} updated, ${skipped} skipped`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      setResult({ imported: 0, updated: 0, skipped: 0, errors: [message], type: importType });
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { sb, tenantId } = await getWorkspace();
      let rows: Record<string, unknown>[] = [];
      if (importType === 'listings') {
        const { data, error } = await sb.from('listings')
          .select('external_listing_id,title,description,price,status,category_id,published_at,created_at,items!inner(specialist_id)')
          .eq('tenant_id', tenantId).eq('marketplace_id', 'ebay')
          .in('items.specialist_id', nicheSpecialistIds)
          .order('created_at', { ascending: false }).limit(5000);
        if (error) throw error;
        rows = (data || []) as Record<string, unknown>[];
      } else if (importType === 'inventory') {
        const { data, error } = await sb.from('items')
          .select('canonical_title,description,specialist_id,status,expected_selling_price,condition,attributes,created_at')
          .eq('tenant_id', tenantId).in('specialist_id', nicheSpecialistIds)
          .order('created_at', { ascending: false }).limit(5000);
        if (error) throw error;
        rows = (data || []) as Record<string, unknown>[];
      } else if (importType === 'orders') {
        const { data, error } = await sb.from('orders')
          .select('external_order_id,buyer_username,total_amount,fulfilment_status,created_at,dispatched_at,items!inner(specialist_id)')
          .eq('tenant_id', tenantId).eq('marketplace_id', 'ebay')
          .in('items.specialist_id', nicheSpecialistIds)
          .order('created_at', { ascending: false }).limit(5000);
        if (error) throw error;
        rows = (data || []) as Record<string, unknown>[];
      } else {
        const { data, error } = await sb.from('listings')
          .select('category_id,title,status,items!inner(specialist_id)')
          .eq('tenant_id', tenantId).eq('marketplace_id', 'ebay')
          .in('items.specialist_id', nicheSpecialistIds).limit(5000);
        if (error) throw error;
        const unique = new Map<string, Record<string, unknown>>();
        for (const row of data || []) {
          const key = String(row.category_id || 'unknown');
          if (!unique.has(key)) unique.set(key, { category_id: row.category_id, example_title: row.title, status: row.status });
        }
        rows = [...unique.values()];
      }
      if (!rows.length) { toast.info('No records available to export for this data type.'); return; }
      downloadCsvOrXlsx(rows, `swish-ebay-${importType}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${rows.length} ${importType} records`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div className="page-header">
        <h1 className="page-title">eBay Import / Export</h1>
        <p className="page-subtitle">Import listings from CSV or Excel directly into the existing SWISH inventory; export real tenant records without uploading private files to public storage.</p>
      </div>
      <div className="swish-card p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Import / Export Type</label>
          <select value={importType} onChange={e => setImportType(e.target.value)} className="input-field mt-0.5">
            <option value="listings">Listings</option>
            <option value="orders">Orders (export only)</option>
            <option value="inventory">Inventory (export only)</option>
            <option value="categories">Categories (export only)</option>
          </select>
        </div>
        <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files)} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          {file ? <p className="text-sm font-medium text-primary">{file.name}</p> : <>
            <p className="text-sm font-medium">Drop CSV/Excel here or click to choose</p>
            <p className="text-xs text-muted-foreground mt-1">Up to 5,000 rows. Only listings with matching niche evidence are imported.</p>
          </>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => void handleImport()} disabled={importing || !file || importType !== 'listings'} className="btn-primary flex-1 justify-center">
            <Upload className="w-3.5 h-3.5" />{importing ? 'Importing…' : 'Import Matching Listings'}
          </button>
          <button onClick={() => void handleExport()} disabled={exporting} className="btn-secondary">
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}{exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
      {result && <div className="swish-card p-4">
        <div className="flex items-center gap-2 mb-3">
          {result.errors.length ? <AlertCircle className="w-4 h-4 text-warning" /> : <CheckCircle className="w-4 h-4 text-success" />}
          <h3 className="text-sm font-semibold">Import Result</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-xl font-bold">{result.imported}</div><div className="text-xs text-muted-foreground">Added</div></div>
          <div><div className="text-xl font-bold">{result.updated}</div><div className="text-xs text-muted-foreground">Updated</div></div>
          <div><div className="text-xl font-bold">{result.skipped}</div><div className="text-xs text-muted-foreground">Skipped</div></div>
        </div>
        {result.errors.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      </div>}
    </div>
  );
}
