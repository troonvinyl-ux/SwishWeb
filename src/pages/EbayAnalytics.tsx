import { useEffect, useState } from 'react';
import { callEdgeFunction } from '@/lib/supabase';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart3, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function EbayAnalytics() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: ordersData } = useTable('orders', { filter: { platform: 'ebay' }, limit: 200 });
  const orders = (ordersData || []) as Record<string, unknown>[];

  useEffect(() => {
    callEdgeFunction('ebay-analytics', {}).then(({ data }) => {
      setAnalytics(data as Record<string, unknown>);
      setLoading(false);
    });
  }, []);

  const chartData = orders.reduce((acc: Record<string, { month: string; revenue: number; orders: number }>, o) => {
    const d = new Date(o.created_at as string);
    const k = `${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!acc[k]) acc[k] = { month: k, revenue: 0, orders: 0 };
    acc[k].revenue += Number((o.total_amount || o.sale_price) || 0);
    acc[k].orders++;
    return acc;
  }, {});

  const chartArray = Object.values(chartData).slice(-12);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Analytics</h1>
          <p className="page-subtitle">Performance and sales analytics</p>
        </div>
        <button onClick={() => { setLoading(true); callEdgeFunction('ebay-analytics', {}).then(({ data }) => { setAnalytics(data as Record<string, unknown>); setLoading(false); }); }} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {analytics && !loading && (
        <div className="swish-card p-5">
          <h3 className="text-sm font-semibold mb-3">Analytics Summary</h3>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded overflow-auto max-h-48 scrollbar-thin">
            {JSON.stringify(analytics, null, 2)}
          </pre>
        </div>
      )}

      {chartArray.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-4">eBay Revenue by Month</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartArray} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#F5A623" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="swish-card p-4">
            <h3 className="text-sm font-semibold mb-4">eBay Orders by Month</h3>
            <ResponsiveContainer width="100%" height={200}>
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
      )}

      {loading && <div className="p-8 text-center text-muted-foreground text-sm">Loading analytics…</div>}
    </div>
  );
}
