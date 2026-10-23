import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency } from '@/lib/utils';
import { Wallet, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

export default function Money() {
  const qc = useQueryClient();
  const [dateRange, setDateRange] = useState('30');

  const { data: ordersData, error: ordersError } = useTable('orders', {
    order: { column: 'created_at', ascending: false },
    limit: 500,
  });
  const { data: feesData } = useTable('fees', {
    order: { column: 'created_at', ascending: false },
    limit: 200,
  });
  const { data: payoutsData } = useTable('payouts', {
    order: { column: 'created_at', ascending: false },
    limit: 100,
  });

  const [ebayBalance, setEbayBalance] = useState<Record<string, unknown> | null>(null);
  const [ebayError, setEbayError] = useState('');

  useEffect(() => {
    callEdgeFunction('ebay-finances-summary', {}).then(({ data, error }) => {
      if (error) {
        const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
        setEbayError(msg);
      } else if (data) {
        setEbayBalance(data as Record<string, unknown>);
      }
    });
  }, []);

  const orders   = (ordersData || []) as Record<string, unknown>[];
  const fees     = (feesData || []) as Record<string, unknown>[];
  const payouts  = (payoutsData || []) as Record<string, unknown>[];

  // Filter by date range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
  const inRange = (row: Record<string, unknown>) => {
    const d = row.created_at as string;
    return !d || new Date(d) >= cutoff;
  };

  const filteredOrders  = orders.filter(inRange);
  const filteredFees    = fees.filter(inRange);
  const filteredPayouts = payouts.filter(inRange);

  // Calculations — clearly labelled
  const grossRevenue = filteredOrders.reduce((s, o) => s + Number((o.total_amount || o.sale_price) || 0), 0);
  const refunds      = filteredOrders.filter(o => o.status === 'refunded').reduce((s, o) => s + Number((o.total_amount || o.sale_price) || 0), 0);
  const totalFees    = filteredFees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const totalPayouts = filteredPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
  const netRevenue   = grossRevenue - refunds - totalFees;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['fees'] });
    qc.invalidateQueries({ queryKey: ['payouts'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Money</h1>
          <p className="page-subtitle">Financial overview from real sales and payout data</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="input-field w-auto text-xs">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="9999">All time</option>
          </select>
          <button onClick={refresh} className="btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {ordersError && (
        <div className="swish-card p-4 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">Orders: {(ordersError as Error).message}</p>
        </div>
      )}

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gross Revenue', value: formatCurrency(grossRevenue), positive: true, icon: TrendingUp, note: `${filteredOrders.length} orders` },
          { label: 'Refunds', value: formatCurrency(refunds), positive: false, icon: TrendingDown, note: refunds > 0 ? 'deducted' : 'none' },
          { label: 'Fees', value: formatCurrency(totalFees), positive: false, icon: TrendingDown, note: `${filteredFees.length} entries` },
          { label: 'Net Revenue', value: formatCurrency(netRevenue), positive: netRevenue >= 0, icon: Wallet, note: 'revenue − refunds − fees' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex justify-between items-start">
              <div>
                <div className={`text-xl font-bold ${s.positive ? 'swish-gold' : 'text-destructive'}`}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.note}</div>
              </div>
              <s.icon className={`w-4 h-4 ${s.positive ? 'swish-gold' : 'text-destructive'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* eBay financial summary */}
      {ebayBalance && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-xs font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">eB</span>
            eBay Financial Summary
          </h3>
          <pre className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded overflow-auto max-h-36 scrollbar-thin">
            {JSON.stringify(ebayBalance, null, 2)}
          </pre>
        </div>
      )}
      {ebayError && (
        <div className="swish-card p-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium">eBay financial summary unavailable</p>
            <p className="text-xs text-muted-foreground">{ebayError}</p>
          </div>
        </div>
      )}

      {/* Payouts table */}
      {filteredPayouts.length > 0 && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3">Payouts ({filteredPayouts.length})</h3>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Platform</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {filteredPayouts.slice(0, 20).map(p => (
                  <tr key={p.id as string}>
                    <td className="text-xs">{formatDate(p.created_at as string)}</td>
                    <td className="text-xs capitalize">{(p.platform || '—') as string}</td>
                    <td className="text-xs capitalize">{(p.status || '—') as string}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency(p.amount as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPayouts.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Showing 20 of {filteredPayouts.length} payouts</p>
          )}
        </div>
      )}
    </div>
  );
}
