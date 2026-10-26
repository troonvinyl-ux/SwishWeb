import { useState } from 'react';
import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { formatRelative, truncate } from '@/lib/utils';
import { RefreshCw, Mail, MailOpen, Reply } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function EbayMessages() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading, error } = useTable('ebay_messages', {
    filter: { tenant_id: tenantId },
    enabled: Boolean(tenantId),
    order: { column: 'received_at', ascending: false },
  });

  const update = useUpdate('ebay_messages');
  const items = (data || []) as Record<string, unknown>[];
  const unread = items.filter(m => !m.is_read).length;

  const openMessage = (m: Record<string, unknown>) => {
    setSelected(m);
    if (!m.is_read) {
      update.mutate({ id: m.id as string, updates: { is_read: true } }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ebay_messages'] }),
      });
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before replying.');
      const { data: membership, error: membershipError } = await sb
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready.');

      const { data, error } = await callEdgeFunction<Record<string, unknown>>('swish-ebay-messages', {
        route: 'send_reply',
        tenantId: membership.tenant_id,
        messageId: selected.id,
        replyText: reply.trim(),
        buyerUsername: String(selected.buyer_username || ''),
        ebayItemId: selected.ebay_item_id ? String(selected.ebay_item_id) : undefined,
        conversationId: selected.conversation_id ? String(selected.conversation_id) : undefined,
      }, sb);
      if (error) throw error;
      toast.success(typeof data?.message === 'string' ? data.message : 'Reply processed');
      setReply('');
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ['ebay_messages'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  const syncMessages = async () => {
    try {
      const sb = getSupabaseClient();
      if (!sb || !user) throw new Error('Please sign in again before syncing messages.');
      const { data: membership, error: membershipError } = await sb
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.tenant_id) throw new Error('Your SWISH workspace is not ready.');
      const { error } = await callEdgeFunction('swish-ebay-messages', {
        route: 'sync_messages', tenantId: membership.tenant_id, daysBack: 30,
      }, sb);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['ebay_messages'] });
      toast.success('eBay messages synced');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sync eBay messages.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Messages</h1>
          <p className="page-subtitle">{unread} unread · {items.length} total</p>
        </div>
        <button onClick={() => void syncMessages()} className="btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" />Sync from eBay
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message list */}
        <div className="swish-card overflow-hidden">
          {isLoading || tenantLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading messages…</div>
          ) : error ? (
            <div className="p-8 text-center text-destructive text-sm">{(error as Error).message}</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {items.map(m => (
                <button
                  key={m.id as string}
                  onClick={() => openMessage(m)}
                  className={`w-full text-left p-3 hover:bg-secondary/30 transition-colors ${selected?.id === m.id ? 'bg-secondary/40' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    {m.is_read ? <MailOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs truncate ${!m.is_read ? 'font-semibold' : ''}`}>
                        {(m.subject || 'No subject') as string}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">From: {(m.buyer_username || 'Unknown') as string}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatRelative(m.received_at as string)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message detail */}
        <div className="swish-card p-4">
          {selected ? (
            <div className="space-y-3 h-full flex flex-col">
              <div>
                <h3 className="font-semibold text-sm">{(selected.subject || 'No subject') as string}</h3>
                <p className="text-xs text-muted-foreground">From: {(selected.buyer_username || 'Unknown') as string} · {formatRelative(selected.received_at as string)}</p>
                {selected.ebay_item_id && <p className="text-xs text-muted-foreground">eBay item: {selected.ebay_item_id as string}</p>}
              </div>
              <div className="flex-1 bg-secondary/30 rounded-lg p-3 text-sm leading-relaxed min-h-24">
                {(selected.body || 'No message body') as string}
              </div>
              <div className="space-y-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Type your reply…" className="input-field text-sm" />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="btn-primary">
                  <Reply className="w-3.5 h-3.5" />{sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Select a message to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
