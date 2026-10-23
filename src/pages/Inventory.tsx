import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate, statusVariant, truncate } from '@/lib/utils';
import { Package, Search, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, error } = useTable('items', {
    order: { column: 'created_at', ascending: false },
    search: search ? { column: 'canonical_title', query: search } : undefined,
    filter: status ? { status } : undefined,
  });

  const items = (data || []) as Record<string, unknown>[];

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setSearchParams(search ? { q: search } : {});
  };

  // Friendly error classification
  const errorMsg = error instanceof Error ? error.message : '';
  const isSchemaError = errorMsg.includes('does not exist') || errorMsg.includes('relation');
  const isPermissionError = errorMsg.includes('permission denied') || errorMsg.includes('policy');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{isLoading ? 'Loading…' : `${items.length} items`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['items'] })} className="btn-ghost" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link to="/inventory/new" className="btn-primary">
            <Plus className="w-3.5 h-3.5" />New Item
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search inventory…"
            className="input-field pl-8"
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field w-auto min-w-32">
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="identified">Identified</option>
          <option value="review_required">Review Required</option>
          <option value="active">Active</option>
          <option value="listed">Listed</option>
          <option value="sold">Sold</option>
          <option value="held">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="swish-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading inventory…</div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
            <p className="text-sm font-medium">
              {isSchemaError ? 'Inventory table not found in database' :
               isPermissionError ? 'Permission denied — check your Row Level Security policies' :
               'Failed to load inventory'}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{errorMsg}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No inventory items found</p>
            <Link to="/inventory/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-3.5 h-3.5" />Add Your First Item
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Valuation</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id as string}
                    onClick={() => navigate(`/inventory/${item.id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                          {(item.image_url || (Array.isArray(item.media) ? item.media[0] : undefined)) ? (
                            <img src={(item.image_url || (Array.isArray(item.media) ? item.media[0] : undefined)) as string} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{truncate((item.canonical_title || item.title || item.name || 'Untitled') as string, 40)}</div>
                          {item.brand && <div className="text-xs text-muted-foreground">{item.brand as string}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="text-xs font-mono text-muted-foreground">{(item.sku || '—') as string}</span></td>
                    <td><span className="text-xs">{(item.condition || '—') as string}</span></td>
                    <td>
                      {item.status ? <span className={statusVariant(item.status as string)}>{item.status as string}</span> : '—'}
                    </td>
                    <td className="text-right text-xs">{formatCurrency((item.acquired_cost || item.cost_price || item.purchase_price) as number)}</td>
                    <td className="text-right text-xs font-medium swish-gold">{formatCurrency((item.valuation_mid || item.valuation || item.expected_selling_price || item.sale_price) as number)}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(item.created_at as string)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
