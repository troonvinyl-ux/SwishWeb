import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, RefreshCw, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function EbayAnalytics() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const preferredNiche = String(user?.user_metadata?.preferred_niche || localStorage.getItem('swish_active_niche') || 'coins').toLowerCase();
  const isOwner = user?.email?.toLowerCase() === 'troonvinyl@gmail.com';
  const activeNiche = String((isOwner ? localStorage.getItem('swish_active_niche') : preferredNiche) || preferredNiche).toLowerCase();
  const specialistIds: string[] =
    ['clothing', 'fashion', 'threads', 'threads_flip', 'trainers', 'trainers_sneakers'].includes(activeNiche)
      ? ['clothing', 'trainers_sneakers']
      : ['bicycles', 'bikes', 'cycling', 'bike_flipper'].includes(activeNiche)
        ? ['bicycles', 'bikes']
        : ['motocross', 'mx', 'flipper_mx'].includes(activeNiche)
          ? ['motocross', 'mx']
          : ['surplus_flip', 'surplus-flip', 'surplus_trader', 'catalog_flip', 'catalog_surplus'].includes(activeNiche)
            ? ['surplus_trader', 'surplus_flip']
            : ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic'].includes(activeNiche)
              ? ['coins', 'coins_uk', 'coins_world', 'coins_currency', 'banknotes', 'gold', 'silver', 'islamic_silver', 'ancient_artefacts', 'numismatic', 'curiosities_collectibles']
              : [];

  const queryOptions = {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: specialistIds.length ? { 'items.specialist_id': specialistIds } : undefined,
    enabled: Boolean(tenantId) && specialistIds.length > 0,
    limit: 1000,
  };
  const { data: salesData, isLoading: salesLoading, error: salesError } = useTable('sales', {
    ...queryOptions, order: { column: 'sold_at', ascending: true },
  });
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useTable('orders', {
    ...queryOptions, order: { column: 'created_at', ascending: true },
  });
  const { data: listingsData } = useTable('listings', {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay', status: 'active' },
    inFilter: specialistIds.length ? { 'items.specialist_id': specialistIds } : undefined,
    enabled: Boolean(tenantId) && specialistIds.length > 0,
    limit: 1000,
  });

  const sales = (salesData || []) as Record<string, unknown>[];
  const orders = (ordersData || []) as Record<string, unknown>[];
  const listings = (listingsData || []) as Record<string, unknown>[];
  const usingSalesLedger = sales.length > 0;
  const sourceRows = usingSalesLedger ? sales : orders;

  const chartArray = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; orders: number }> = {};
    for (const row of sourceRows) {
      const dateValue = (usingSalesLedger ? row.sold_at : row.created_at) as string | undefined;
      if (!dateValue) continue;
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), revenue: 0, orders: 0 };
      months[key].revenue += Number((usingSalesLedger ? row.sale_price : (row.total_amount || row.sale_price)) || 0);
      months[key].orders += 1;
    }
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, value]) => value);
  }, [sourceRows, usingSalesLedger]);

  const grossRevenue = sourceRows.reduce((sum, row) => sum + Number((usingSalesLedger ? row.sale_price : (row.total_amount || row.sale_price)) || 0), 0);
  const netRevenue = usingSalesLedger
    ? sourceRows.reduce((sum, row) => sum + Number(row.net_revenue || 0), 0)
    : grossRevenue;
  const avgSale = sourceRows.length ? grossRevenue / sourceRows.length : 0;
  const loading = tenantLoading || salesLoading || ordersLoading;
  const error = salesError || ordersError;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Analytics</h1>
          <p className="page-subtitle">Performance from your real SWISH sales and listing records · {activeNiche}</p>
        </div>
        <button onClick={() => {
          ['sales', 'orders', 'listings'].forEach(table => void qc.invalidateQueries({ queryKey: [table] }));
        }} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {error && <div className="swish-card p-4 text-sm text-destructive">{(error as Error).message}</div>}
      {!specialistIds.length && <div className="swish-card p-4 text-sm text-muted-foreground">Choose a recognised niche to view its analytics.</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: usingSalesLedger ? 'Realised Revenue' : 'Order Value', value: formatCurrency(grossRevenue), icon: TrendingUp },
          { label: 'Net Revenue', value: formatCurrency(netRevenue), icon: BarChart3 },
          { label: usingSalesLedger ? 'Recorded Sales' : 'Orders', value: String(sourceRows.length), icon: ShoppingCart },
          { label: 'Active Listings', value: String(listings.length), icon: Package },
        ].map(card => <div className="stat-card" key={card.label}>
          <div className="flex items-start justify-between gap-2"><div><div className="text-xl font-bold swish-gold">{card.value}</div><div className="stat-label">{card.label}</div></div><card.icon className="w-4 h-4 text-muted-foreground" /></div>
        </div>)}
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground text-sm">Loading analytics…</div> : chartArray.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-4">Revenue by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartArray} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#F5A623" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-4">Sales / Orders by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartArray} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#4A90D9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : !error && <div className="swish-card p-8 text-center text-sm text-muted-foreground">No eBay sales or orders are recorded for this niche yet. Analytics will populate from real synced data.</div>}
      <p className="text-xs text-muted-foreground">Average recorded sale/order value: {formatCurrency(avgSale)}. Revenue uses the canonical sales ledger when available; otherwise it is labelled order value to avoid claiming unverified sales.</p>
    </div>
  );
}
