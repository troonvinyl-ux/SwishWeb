import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { clearEbayOAuth, isEbayOAuthPending } from '@/lib/ebayOAuthPending';
import { toast } from 'sonner';

export function useEbayOAuthRecovery(tenantId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [waiting, setWaiting] = useState(false);
  useEffect(() => { setWaiting(Boolean(user?.id && tenantId && isEbayOAuthPending(user.id, tenantId))); }, [user?.id, tenantId]);
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb || !waiting || !user?.id || !tenantId) return;
    let stopped = false;
    let inFlight = false;
    const refresh = async () => {
      if (stopped || inFlight || document.hidden) return;
      if (!isEbayOAuthPending(user.id, tenantId)) {
        clearEbayOAuth(user.id, tenantId); setWaiting(false);
        toast.message('Authorisation monitoring ended. Review account health before deciding whether to reconnect.');
        return;
      }
      inFlight = true;
      try {
        const { data, error } = await sb.from('marketplace_connectors').select('status').eq('tenant_id', tenantId).eq('marketplace_id', 'ebay').maybeSingle();
        if (stopped) return;
        if (error) { console.warn('[SWISH] Connector status unavailable:', error.message); return; }
        if (data?.status !== 'connected') return;
        clearEbayOAuth(user.id, tenantId); setWaiting(false);
        await Promise.all(['marketplace_connectors', 'items', 'listings', 'orders'].map(table => qc.invalidateQueries({ queryKey: [table] })));
        // An existing connected connector does not prove a re-authorisation
        // completed; do not report new consent success from the old status.
        toast.message('Your eBay seller connection is active. Review account health for its current capabilities.');
      } catch (error) {
        console.warn('[SWISH] Connector status request failed:', error instanceof Error ? error.message : 'Network unavailable');
      } finally { inFlight = false; }
    };
    const timer = window.setInterval(() => { void refresh(); }, 3000);
    const onFocus = () => { void refresh(); };
    void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [user?.id, tenantId, waiting, qc]);
  return { waiting, setWaiting };
}
