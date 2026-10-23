import { useState } from 'react';
import { useTable, useUpdate } from '@/hooks/useSupabaseQuery';
import { formatRelative, truncate } from '@/lib/utils';
import { RefreshCw, Mail, MailOpen, Reply } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EbayMessages() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading, error } = useTable('ebay_messages', {
    order: { column: 'created_at', ascending: false },
  });

  const update = useUpdate('ebay_messages');
  const items = (data || []) as Record<string, unknown>[];
  const unread = items.filter(m => !m.read).length;

  const openMessage = (m: Record<string, unknown>) => {
    setSelected(m);
    if (!m.read) {
      update.mutate({ id: m.id as string, updates: { read: true } }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ebay_messages'] }),
      });
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const { error } = await callEdgeFunction('ebay-reply-message', {
      message_id: selected.message_id || selected.id,
      body: reply,
    });
    if (error) toast.error(error.message);
    else { toast.success('Reply sent'); setReply(''); }
    setSending(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">eBay Messages</h1>
          <p className="page-subtitle">{unread} unread · {items.length} total</p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['ebay_messages'] })} className="btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message list */}
        <div className="swish-card overflow-hidden">
          {isLoading ? (
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
                    {m.read ? <MailOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs truncate ${!m.read ? 'font-semibold' : ''}`}>
                        {(m.subject || 'No subject') as string}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">From: {(m.sender || 'Unknown') as string}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatRelative(m.created_at as string)}</span>
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
                <p className="text-xs text-muted-foreground">From: {(selected.sender || 'Unknown') as string} · {formatRelative(selected.created_at as string)}</p>
                {selected.item_title && <p className="text-xs text-muted-foreground">Re: {selected.item_title as string}</p>}
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
