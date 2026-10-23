import { useEffect, useState } from 'react';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase';
import { useTable } from '@/hooks/useSupabaseQuery';
import { formatDate, formatDateTime } from '@/lib/utils';
import { RefreshCw, CheckCircle, AlertCircle, Link2, Link2Off, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function EbayHub() {
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const { data: accounts, isLoading } = useTable('ebay_accounts', { limit: 1 });

  useEffect(() => {
    if (accounts && accounts.length > 0) setAccount(accounts[0] as Record<string, unknown>);
  }, [accounts]);

  const handleConnect = async () => {
    setConnecting(true);
    const { data, error } = await callEdgeFunction('ebay-auth-url', {});
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      toast.error(msg);
      setConnecting(false);
      return;
    }
    const url = (data as Record<string, unknown>)?.url as string;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('No authorization URL returned — check ebay-auth-url Edge Function');
    }
    setConnecting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    const { data, error } = await callEdgeFunction('ebay-sync', {});
    if (error) {
      const msg = error instanceof EdgeFunctionError ? error.displayMessage : error.message;
      setSyncError(msg);
      toast.error(msg);
    } else {
      const result = data as Record<string, unknown>;
      const msg = result?.message as string || 'eBay sync complete';
      toast.success(msg);
    }
    setSyncing(false);
  };

  const isConnected = account?.status === 'active';
  const tokenExpiry = account?.token_expires_at as string | undefined;
  const tokenExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;

  const QUICK_LINKS = [
    { to: '/ebay/listings', label: 'Listings' },
    { to: '/ebay/orders', label: 'Orders' },
    { to: '/ebay/messages', label: 'Messages' },
    { to: '/ebay/offers', label: 'Offers' },
    { to: '/ebay/returns', label: 'Returns' },
    { to: '/ebay/cases', label: 'Cases' },
    { to: '/ebay/finances', label: 'Finances' },
    { to: '/ebay/analytics', label: 'Analytics' },
    { to: '/ebay/import', label: 'Import / Export' },
    { to: '/ebay/logs', label: 'Logs' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <span className="text-sm font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">eB</span>
          eBay Hub
        </h1>
        <p className="page-subtitle">Manage your eBay account integration</p>
      </div>

      {/* Account status card */}
      <div className="swish-card p-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading account…</p>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected && !tokenExpired ? 'bg-green-500/15' : 'bg-destructive/15'}`}>
                {isConnected && !tokenExpired
                  ? <CheckCircle className="w-5 h-5 text-success" />
                  : <AlertCircle className="w-5 h-5 text-destructive" />}
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {account ? ((account.username || account.ebay_username || 'eBay Account') as string) : 'No eBay Account Connected'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isConnected
                    ? tokenExpired
                      ? '⚠ Token expired — reconnect to restore access'
                      : tokenExpiry
                        ? `Token valid until ${formatDateTime(tokenExpiry)}`
                        : 'Connected'
                    : 'Connect your eBay account to enable marketplace features'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected && !tokenExpired && (
                <button onClick={handleSync} disabled={syncing} className="btn-secondary">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
              )}
              <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                {isConnected
                  ? <Link2 className="w-3.5 h-3.5" />
                  : <Link2Off className="w-3.5 h-3.5" />}
                {connecting ? 'Opening…' : isConnected ? (tokenExpired ? 'Reconnect' : 'Re-authorise') : 'Connect eBay'}
              </button>
            </div>
          </div>
        )}
        {syncError && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-destructive">{syncError}</p>
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div>
        <h3 className="text-sm font-semibold mb-3">eBay Sections</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="swish-card p-4 text-center text-sm font-medium hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Account details — safe display, no credentials */}
      {account && (
        <div className="swish-card p-4">
          <h3 className="text-sm font-semibold mb-3">Account Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Username', value: (account.username || account.ebay_username || '—') as string },
              { label: 'Status', value: (account.status || '—') as string },
              { label: 'Connected', value: account.connected_at ? formatDate(account.connected_at as string) : '—' },
              { label: 'Token expires', value: tokenExpiry ? formatDateTime(tokenExpiry) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm mt-0.5 ${label === 'Status' && value === 'active' ? 'text-success font-medium' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
