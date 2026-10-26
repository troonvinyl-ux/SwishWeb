import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency } from '@/lib/utils';
import { Wallet, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

export default function Money() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30');

  // Read the same canonical sales ledger used by the SWISH app. RLS remains
  // enforced by the existing backend; only eBay sales are included here.
  const { data: salesData, error: salesError } = useTable('sales', {
    filter: { marketplace_id: 'ebay' },
    order: { column: 'sold_at', ascending: false },
    limit: 500,
  });
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
    if (!user) return;
    let cancelled = false;
    const loadEbayFunds = async () => {
      try {
        const sb = getSupabaseClient();
        if (!sb) throw new Error('Backend not connected.');
        const { data: membership, error: membershipError } = await sb
          .from('tenant_memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (membershipError) throw membershipError;
        if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready.');
        const { data, error } = await callEdgeFunction<Record<string, unknown>>('swish-ebay-finances', {
          tenantId: membership.tenant_id, route: 'get_funds_summary',
        }, sb);
        if (error) throw error;
        if (!cancelled) setEbayBalance(data as Record<string, unknown>);
      } catch (error) {
        if (!cancelled) setEbayError(error instanceof EdgeFunctionError ? error.displayMessage : error instanceof Error ? error.message : 'eBay funds summary unavailable.');
      }
    };
    void loadEbayFunds();
    return () => { cancelled = true; };
  }, [user]);

  const sales    = (salesData || []) as Record<string, unknown>[];
  const orders   = (ordersData || []) as Record<string, unknown>[];
  const fees     = (feesData || []) as Record<string, unknown>[];
  const payouts  = (payoutsData || []) as Record<string, unknown>[];

  // Filter by date range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
  const inRange = (row: Record<string, unknown>, dateField = 'created_at') => {
    const d = row[dateField] as string;
    return !d || new Date(d) >= cutoff;
  };

  const filteredSales   = sales.filter(row => inRange(row, 'sold_at'));
  const filteredOrders  = orders.filter(row => inRange(row));
  const filteredFees    = fees.filter(inRange);
  const filteredPayouts = payouts.filter(inRange);

  // Calculations — clearly labelled
  // Prefer canonical sales ledger values. Fall back to legacy orders/fees only
  // when this account has no sales rows yet, avoiding double-counting both tables.
  const hasSalesLedger = filteredSales.length > 0;
  const grossRevenue = hasSalesLedger
    ? filteredSales.reduce((s, sale) => s + Number(sale.sale_price || 0), 0)
    : filteredOrders.reduce((s, o) => s + Number((o.total_amount || o.sale_price) || 0), 0);
  const refunds = hasSalesLedger
    ? 0
    : filteredOrders.filter(o => o.status === 'refunded').reduce((s, o) => s + Number((o.total_amount || o.sale_price) || 0), 0);
  const totalFees = hasSalesLedger
    ? filteredSales.reduce((s, sale) => s + Number(sale.marketplace_fee || 0), 0)
    : filteredFees.reduce((s, f) => s + Number(f.amount || 0), 0);
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

      {(salesError || ordersError) && (
        <div className="swish-card p-4 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">Sales backend: {salesError ? (salesError as Error).message : (ordersError as Error).message}</p>
        </div>
      )}

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gross Revenue', value: formatCurrency(grossRevenue), positive: true, icon: TrendingUp, note: `${hasSalesLedger ? filteredSales.length : filteredOrders.length} ${hasSalesLedger ? 'sales' : 'orders'}` },
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
