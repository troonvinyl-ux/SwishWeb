import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bike, BookOpen, CheckCircle2, CircleAlert, Coins, Layers, ShieldCheck, Sparkles } from 'lucide-react';

type ToolDef = {
  title: string;
  summary: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  state: 'available' | 'needs-integration';
  notes: string;
};

const TOOLS: ToolDef[] = [
  {
    title: 'Coin Flipper',
    summary: 'Identify from obverse/reverse images with physical measurements and explicit confirmation.',
    route: '/identify',
    icon: Coins,
    state: 'available',
    notes: 'Uses the existing web identification workflow.',
  },
  {
    title: 'Islamic & Countermark Batch',
    summary: 'Specialist routing for Islamic, Indian and countermarked coins.',
    route: '/tools/islamic-batch',
    icon: BookOpen,
    state: 'needs-integration',
    notes: 'Dedicated batch capture needs to be connected to the current specialist function and saved-scan workflow.',
  },
  {
    title: 'Silver Batch',
    summary: 'A batch workflow for silver coins and repeated measurements.',
    route: '/tools/silver-batch',
    icon: Layers,
    state: 'needs-integration',
    notes: 'The mobile app screen exists; web batch UI and confirmation handling still need to be matched.',
  },
  {
    title: 'Bike Flipper',
    summary: 'Bicycle-specific identification and commercial evaluation.',
    route: '/tools/bike-flipper',
    icon: Bike,
    state: 'needs-integration',
    notes: 'The web app needs niche-scoped fields and the same backend evaluation path before this can be marked available.',
  },
  {
    title: 'Listing Preflight',
    summary: 'Check listing readiness before sending anything to eBay.',
    route: '/tools/listing-preflight',
    icon: ShieldCheck,
    state: 'needs-integration',
    notes: 'Must verify against current eBay GB category/leaf data, permanent images and Simple Delivery; this page does not publish listings.',
  },
];

function ToolCard({ tool }: { tool: ToolDef }) {
  const Icon = tool.icon;
  const available = tool.state === 'available';
  const target = tool.route === '/identify' ? tool.route : undefined;

  return (
    <article className="swish-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 swish-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{tool.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{tool.summary}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        {available ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <CircleAlert className="w-4 h-4 text-warning shrink-0" />}
        <span>{tool.notes}</span>
      </div>
      <div className="mt-auto pt-1">
        {target ? (
          <Link to={target} className="btn-primary inline-flex">Open tool</Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-2 text-muted-foreground">
            {available ? <Activity className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
            Integration required
          </span>
        )}
      </div>
    </article>
  );
}

export default function ParityTools() {
  const [filter, setFilter] = useState<'all' | 'available' | 'needs-integration'>('all');
  const tools = TOOLS.filter(tool => filter === 'all' || tool.state === filter);
  const ready = TOOLS.filter(tool => tool.state === 'available').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 swish-gold" />
          <h1 className="page-title">App Tools & Parity</h1>
        </div>
        <p className="page-subtitle">Web entry points for specialist tools currently present in the SWISH mobile app.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card"><div className="text-2xl font-bold">{TOOLS.length}</div><div className="text-xs text-muted-foreground mt-1">Tracked app tools</div></div>
        <div className="stat-card"><div className="text-2xl font-bold">{ready}</div><div className="text-xs text-muted-foreground mt-1">Available in web now</div></div>
        <div className="stat-card"><div className="text-2xl font-bold">{TOOLS.length - ready}</div><div className="text-xs text-muted-foreground mt-1">Require integration</div></div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter specialist tools">
        {([
          ['all', 'All tools'],
          ['available', 'Available'],
          ['needs-integration', 'Needs integration'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={filter === value ? 'btn-primary' : 'btn-secondary'}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map(tool => <ToolCard key={tool.route} tool={tool} />)}
      </div>
      <p className="text-xs text-muted-foreground">
        Tools marked “Integration required” are deliberately not presented as working flows. They must be connected to the existing app's authenticated services and niche-scoped data before use.
      </p>
    </div>
  );
}
