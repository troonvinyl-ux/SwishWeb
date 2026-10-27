import { useTable } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getActiveNicheId, getSpecialistIdsForNiche } from '@/lib/niche';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const CHART_COLORS = { primary: '#F5A623', secondary: '#4A90D9', muted: '#4B5563' };

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (active && Array.isArray(payload) && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 text-xs">
        <p className="font-medium mb-1">{label as string}</p>
        {(payload as Array<{ name: string; value: number }>).map((p, i) => (
          <p key={i} style={{ color: p.name === 'revenue' ? CHART_COLORS.primary : CHART_COLORS.secondary }}>
            {p.name}: {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Insights() {
  const qc = useQueryClient();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const specialistIds = getSpecialistIdsForNiche(getActiveNicheId());
  const { data: ordersData } = useTable('orders', {
    select: '*, items!inner(specialist_id)',
    filter: { tenant_id: tenantId, marketplace_id: 'ebay' },
    inFilter: { 'items.specialist_id': specialistIds },
    order: { column: 'created_at', ascending: false }, limit: 100,
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });
  const { data: inventoryData } = useTable('items', {
    filter: { tenant_id: tenantId },
    inFilter: { specialist_id: specialistIds },
    limit: 100,
    enabled: Boolean(tenantId) && specialistIds.length > 0,
  });

  const orders = (ordersData || []) as Record<string, unknown>[];
  const inventory = (inventoryData || []) as Record<string, unknown>[];

  // Aggregate orders by date for chart
  const chartData = orders.reduce((acc: Record<string, { date: string; revenue: number; orders: number }>, o) => {
    const d = new Date(o.created_at as string);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!acc[key]) acc[key] = { date: key, revenue: 0, orders: 0 };
    acc[key].revenue += Number((o.total_amount || o.sale_price) || 0);
    acc[key].orders++;
    return acc;
  }, {});

  const chartArray = Object.values(chartData).slice(-12);

  const totalRevenue = orders.reduce((s, o) => s + Number((o.total_amount || o.sale_price) || 0), 0);
  const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;
  const categories = inventory.reduce((acc: Record<string, number>, i) => {
    const c = (i.category as string) || 'Uncategorised';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const catArray = Object.entries(categories).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Performance analytics from your real data</p>
        </div>
        <button onClick={() => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['items'] }); }} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Summary stats */}
      {tenantLoading ? <p className="text-sm text-muted-foreground">Loading workspace…</p> : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
          { label: 'Total Orders', value: orders.length },
          { label: 'Avg Order Value', value: formatCurrency(avgOrderValue) },
          { label: 'Total Inventory', value: inventory.length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-4">Revenue by Month</h3>
          {chartArray.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartArray} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No order data yet</div>}
        </div>

        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-4">Orders by Month</h3>
          {chartArray.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartArray} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="orders" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>}
        </div>

        <div className="swish-card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Inventory by Category</h3>
          {catArray.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catArray} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} width={75} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No inventory data</div>}
        </div>
      </div>
    </div>
  );
}
