import { useEffect, useState } from 'react';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Wallet, RefreshCw, AlertTriangle } from 'lucide-react';

export default function EbayFinances() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [summaryError, setSummaryError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const { data: payouts } = useTable('ebay_payouts', { order: { column: 'created_at', ascending: false }, limit: 50 });
  const { data: transactions } = useTable('ebay_transactions', { order: { column: 'created_at', ascending: false }, limit: 50 });

  const loadSummary = async () => {
    setLoading(true);
    setSummaryError('');
    const { data, error } = await callEdgeFunction('ebay-finances', {});
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      setSummaryError(msg);
    } else {
      setSummary(data as Record<string, unknown>);
    }
    setLoading(false);
  };

  useEffect(() => { loadSummary(); }, []);

  const payoutItems = (payouts || []) as Record<string, unknown>[];
  const txItems = (transactions || []) as Record<string, unknown>[];

  // Safe value extractor — handles nested { value, currency } objects from eBay API
  const safeVal = (v: unknown): number => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v !== null) return Number((v as Record<string, unknown>).value) || 0;
    return Number(v) || 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Finances</h1>
          <p className="page-subtitle">Payouts, transactions and financial data from your eBay account</p>
        </div>
        <button onClick={loadSummary} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="p-6 text-center text-muted-foreground text-sm">Loading financial data…</div>
      ) : summaryError ? (
        <div className="swish-card p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">eBay Finances unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">{summaryError}</p>
            <p className="text-xs text-muted-foreground mt-1">Ensure your eBay account is connected and the <code className="bg-secondary px-1 rounded">ebay-finances</code> Edge Function is deployed.</p>
          </div>
        </div>
      ) : summary ? (
        <div className="swish-card p-5">
          <h3 className="text-sm font-semibold mb-3">Financial Summary</h3>
          {(summary.available_balance !== undefined || summary.total_revenue !== undefined) ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Available Balance', value: formatCurrency(safeVal(summary.available_balance)) },
                { label: 'Pending Payout', value: formatCurrency(safeVal(summary.pending_payout)) },
                { label: 'Total Revenue', value: formatCurrency(safeVal(summary.total_revenue)) },
                { label: 'Total Fees', value: formatCurrency(safeVal(summary.total_fees)) },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value swish-gold text-xl">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Raw response</summary>
              <pre className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded overflow-auto max-h-48 scrollbar-thin mt-2">
                {JSON.stringify(summary, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : null}

      {/* Payouts */}
      {payoutItems.length > 0 && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Payouts</h3>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Status</th><th className="text-right">Amount</th><th>Method</th></tr></thead>
              <tbody>
                {payoutItems.slice(0, 20).map(p => (
                  <tr key={p.id as string}>
                    <td className="text-xs">{formatDate((p.payout_date || p.created_at) as string)}</td>
                    <td className="text-xs capitalize">{(p.status || '—') as string}</td>
                    <td className="text-right text-xs font-semibold swish-gold">{formatCurrency((p.amount || p.payout_amount) as number)}</td>
                    <td className="text-xs">{(p.method || p.payment_method || '—') as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      {txItems.length > 0 && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3">Transactions</h3>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Date</th><th>Type</th><th>Description</th>
                <th className="text-right">Amount</th>
              </tr></thead>
              <tbody>
                {txItems.slice(0, 30).map(t => {
                  const amt = Number(t.amount);
                  return (
                    <tr key={t.id as string}>
                      <td className="text-xs">{formatDate(t.created_at as string)}</td>
                      <td className="text-xs capitalize">{(t.type || t.transaction_type || '—') as string}</td>
                      <td className="text-xs text-muted-foreground">{(t.description || '—') as string}</td>
                      <td className={`text-right text-xs font-semibold ${amt >= 0 ? 'swish-gold' : 'text-destructive'}`}>
                        {formatCurrency(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payoutItems.length === 0 && txItems.length === 0 && !loading && (
        <div className="swish-card p-8 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No payout or transaction records found</p>
          <p className="text-xs text-muted-foreground mt-1">Sync your eBay account to import financial data</p>
        </div>
      )}
    </div>
  );
}
