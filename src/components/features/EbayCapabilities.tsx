import { CheckCircle2, Circle } from 'lucide-react';
import type { EbayConnector } from '@/types/marketplace';

interface EbayCapabilitiesProps { connector: EbayConnector | null; }
const CAPABILITIES: { key: keyof EbayConnector; label: string; scope: string }[] = [
  { key: 'can_list', label: 'Create and manage listings', scope: 'sell.inventory' },
  { key: 'can_publish', label: 'Publish to eBay', scope: 'sell.inventory' },
  { key: 'can_reprice', label: 'Update prices', scope: 'sell.inventory' },
  { key: 'can_read_orders', label: 'Read orders', scope: 'sell.fulfillment' },
  { key: 'can_fulfil', label: 'Update fulfilment', scope: 'sell.fulfillment' },
];
export default function EbayCapabilities({ connector }: EbayCapabilitiesProps) {
  return <section className="swish-card p-6"><h2 className="text-lg font-semibold">Granted capabilities</h2><ul className="mt-4 divide-y divide-border">
    {CAPABILITIES.map(({ key, label, scope }) => {
      const granted = connector?.status === 'connected' && connector[key] === true;
      const Icon = granted ? CheckCircle2 : Circle;
      return <li key={key} className="flex items-center gap-3 py-4"><Icon className={`h-5 w-5 shrink-0 ${granted ? 'text-success' : 'text-muted-foreground'}`} /><div className="flex-1"><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{scope}</p></div><span className="text-sm">{granted ? 'Granted' : 'Not granted'}</span></li>;
    })}
  </ul><p className="mt-4 text-sm leading-6 text-muted-foreground">These flags are supplied by your existing SWISH connector. They do not grant permissions; the server checks every operation.</p></section>;
}
