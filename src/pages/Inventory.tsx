import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, truncate } from '@/lib/utils';
import { Package, Search, Plus, RefreshCw, AlertTriangle, Archive, Pencil, Store, CheckCircle2, ChevronRight, Send, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';

type InventoryTab = 'stock' | 'draft' | 'live' | 'sold';
type Row = Record<string, any>;
const TABS: Array<{id: InventoryTab; label: string; icon: typeof Package}> = [
  { id: 'stock', label: 'In Stock', icon: Archive },
  { id: 'draft', label: 'Draft', icon: Pencil },
  { id: 'live', label: 'Live', icon: Store },
  { id: 'sold', label: 'Sold', icon: CheckCircle2 },
];

export default function Inventory() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<InventoryTab>('stock');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const niche = getActiveNicheId();
  const specialistIds = getSpecialistIdsForNiche(niche);
  const clothing = niche === 'clothing';
  const accent = clothing ? '#e12b8c' : 'hsl(var(--primary))';

  const stockQuery = useTable('items', {
    order: { column: 'created_at', ascending: false },
    filter: { tenant_id: tenantId },
    inFilter: { specialist_id: specialistIds },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });
  const listingsQuery = useTable('listings', {
    select: '*, items!inner(id, specialist_id, title, canonical_title, name, image_url, media, status)',
    order: { column: 'created_at', ascending: false },
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: { 'items.specialist_id': specialistIds },
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });

  const allStock = (stockQuery.data || []) as Row[];
  const allListings = (listingsQuery.data || []) as Row[];
  const soldItems = allStock.filter(i => i.status === 'sold');
  const drafts = allListings.filter(l => ['draft', 'pending'].includes(String(l.status || '').toLowerCase()));
  const live = allListings.filter(l => ['active', 'live'].includes(String(l.status || '').toLowerCase()));
  const listedItemIds = new Set(allListings.filter(l => !['ended','failed','cancelled','deleted'].includes(String(l.status || '').toLowerCase())).map(l => String(l.item_id || '')));
  const stock = allStock.filter(i => i.status !== 'sold' && !listedItemIds.has(String(i.id)));
  const counts: Record<InventoryTab, number> = { stock: stock.length, draft: drafts.length, live: live.length, sold: soldItems.length };
  const loading = tenantLoading || stockQuery.isLoading || listingsQuery.isLoading;
  const error = stockQuery.error || listingsQuery.error;
  const visible = useMemo(() => {
    const base: Row[] = tab === 'stock' ? stock : tab === 'draft' ? drafts : tab === 'live' ? live : soldItems;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(item => {
      const linked = item.items || {};
      return [item.title, item.canonical_title, item.name, linked.title, linked.canonical_title, linked.name, item.sku]
        .some(value => String(value || '').toLowerCase().includes(q));
    });
  }, [tab, search, stockQuery.data, listingsQuery.data]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['items'] });
    void qc.invalidateQueries({ queryKey: ['listings'] });
  };
  const itemTitle = (row: Row) => String(row.title || row.canonical_title || row.name || row.items?.canonical_title || row.items?.title || row.items?.name || 'Untitled item');
  const imageFor = (row: Row) => row.image_url || row.items?.image_url || (Array.isArray(row.media) ? row.media[0] : '') || (Array.isArray(row.items?.media) ? row.items.media[0] : '');
  const openItem = (row: Row) => navigate(row.item_id ? `/listings/${row.id}` : `/inventory/${row.id}`);

  return (
    <div className="swish-inventory-page animate-fade-in" style={{'--inventory-accent': accent} as React.CSSProperties}>
      <header className="swish-inventory-header">
        <div className="swish-inventory-mark"><Store size={22}/></div>
        <div className="min-w-0 flex-1">
          <h1>{clothing ? 'Fashion Inventory' : 'Inventory'}</h1>
          <p>{counts.stock} in stock · {counts.draft} draft · {counts.live} live · {counts.sold} sold</p>
        </div>
        <Link to={tab === 'stock' ? '/inventory/new' : '/listings/new'} className="swish-inventory-add" aria-label="Add new item"><Plus size={24}/></Link>
      </header>

      <nav className="swish-inventory-tabs" aria-label="Inventory status">
        {TABS.map(({id,label,icon:Icon}) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? 'is-selected' : ''}>
            <Icon size={16}/><span>{label}</span>{counts[id] > 0 && <b>{counts[id]}</b>}
          </button>
        ))}
      </nav>

      <div className="swish-inventory-search">
        <Search size={20}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" aria-label="Search inventory"/>
        <button type="button" onClick={refresh} aria-label="Refresh inventory"><RefreshCw size={18}/></button>
      </div>

      {tab === 'draft' && drafts.length > 0 && <div className="swish-inventory-info"><Info size={16}/><span>Draft listings are saved in SWISH only — open a draft and tap Submit to publish to eBay.</span></div>}
      {tab === 'live' && live.length > 0 && <div className="swish-inventory-info is-live"><Store size={16}/><span>{live.length} listing{live.length === 1 ? '' : 's'} live on eBay</span></div>}
      {tab === 'sold' && <div className="swish-inventory-info"><Info size={16}/><span>Sold items appear here after order sync or manual marking.</span></div>}

      <section className="swish-inventory-list" aria-live="polite">
        {loading ? <div className="swish-inventory-empty">Loading inventory…</div> :
          error ? <div className="swish-inventory-empty"><AlertTriangle size={28}/><strong>Could not load inventory</strong><span>{(error as Error).message}</span><button type="button" onClick={refresh}>Try again</button></div> :
          visible.length === 0 ? <div className="swish-inventory-empty"><Package size={44}/><strong>{tab === 'stock' ? 'No inventory items found' : tab === 'draft' ? 'No draft listings' : tab === 'live' ? 'Nothing live on eBay' : 'No sold items yet'}</strong><span>{tab === 'stock' ? 'Add an item to start building your stock.' : tab === 'draft' ? 'Create a draft from an item in stock.' : tab === 'live' ? 'Submit a draft listing to publish it.' : 'Sold items will appear here when synced.'}</span>{tab === 'stock' ? <Link className="swish-inventory-empty-cta" to="/inventory/new"><Plus size={18}/>Add Your First Item</Link> : tab === 'draft' ? <button className="swish-inventory-empty-cta" onClick={() => setTab('stock')}>Go to In Stock</button> : null}</div> :
          visible.map(row => {
            const isListing = tab === 'draft' || tab === 'live';
            const image = imageFor(row);
            return <article className="swish-inventory-card" key={String(row.id)}>
              <button className="swish-inventory-card-main" type="button" onClick={() => openItem(row)}>
                <div className="swish-inventory-thumb">{image ? <img src={String(image)} alt="" loading="lazy"/> : <Package size={28}/>}</div>
                <div className="swish-inventory-card-copy">
                  <strong>{truncate(itemTitle(row), 78)}</strong>
                  <span className="swish-inventory-status">{tab === 'stock' ? 'In Stock' : tab === 'draft' ? 'Draft' : tab === 'live' ? 'Live on eBay' : 'Sold'}</span>
                  <b className="swish-inventory-price">{formatCurrency((row.price ?? row.valuation_mid ?? row.valuation ?? row.expected_selling_price ?? row.sale_price) as number)}</b>
                </div>
                <ChevronRight size={20} className="swish-inventory-chevron"/>
              </button>
              {isListing && tab === 'draft' && <Link className="swish-inventory-submit" to={`/listings/${row.id}`}><Send size={15}/>Submit</Link>}
              {isListing && tab === 'live' && row.url && <a className="swish-inventory-submit is-live" href={String(row.url)} target="_blank" rel="noreferrer"><Store size={15}/>View</a>}
            </article>;
          })
        }
      </section>
    </div>
  );
}
