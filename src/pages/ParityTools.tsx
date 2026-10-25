import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Info, Layers, ShieldCheck } from 'lucide-react';
import { PARITY_TOOLS } from '@/constants/parityTools';
import { cn } from '@/lib/utils';

export default function ParityTools() {
  const { pathname } = useLocation();
  const selected = PARITY_TOOLS.find(tool => tool.path === pathname) ?? PARITY_TOOLS[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="swish-card border-t-2 border-t-primary p-6 space-y-3">
        <div className="flex items-center gap-3"><Layers className="w-6 h-6 text-primary" aria-hidden="true" /><h1 className="page-title">App Tools &amp; Parity</h1></div>
        <p className="text-base leading-relaxed max-w-3xl">Find specialist workflows and see which app capabilities still need a dedicated web interface.</p>
        <p className="flex items-start gap-2 text-base leading-relaxed"><ShieldCheck className="w-5 h-5 shrink-0 text-primary mt-1" aria-hidden="true" />These shortcuts use existing SWISH screens. No new backend, database or Edge Functions are created.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)] gap-6">
        <nav aria-label="Specialist tools" className="swish-card p-4 space-y-2">
          <h2 className="text-lg font-semibold px-3 mb-3">Workflows</h2>
          {PARITY_TOOLS.map(tool => (
            <NavLink key={tool.path} to={tool.path} className={() => cn('flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-3 text-base font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selected.path === tool.path ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-foreground')}>
              {tool.title}<ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
        <section className="swish-card p-6 space-y-5" aria-labelledby="tool-title">
          <div><h2 id="tool-title" className="text-xl font-semibold">{selected.title}</h2><p className="mt-3 text-base leading-relaxed">{selected.summary}</p></div>
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <Info className="w-5 h-5 shrink-0 text-primary mt-1" aria-hidden="true" />
            <div><h3 className="text-base font-semibold">Current web support</h3><p className="mt-2 text-base leading-relaxed">{selected.limitation}</p></div>
          </div>
          <Link to={selected.destination} className="btn-primary min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">{selected.actionLabel}<ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
          <div className="border-t border-border pt-4"><Link to="/niches" className="btn-secondary min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Browse specialist workspaces</Link></div>
        </section>
      </div>
    </div>
  );
}
