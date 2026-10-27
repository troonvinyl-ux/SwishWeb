import { ArrowRight, Coins, Shirt, Bike, Wrench, Smartphone, Gamepad2, Sofa, Crown, LogIn, Sparkles } from 'lucide-react';
import heroImage from '@/assets/swish-hero.jpg';

type Niche = {
  name: string;
  slug: string;
  description: string;
  icon: typeof Coins;
  tone: string;
};

const niches: Niche[] = [
  { name: 'Coin Flipper', slug: 'coins', description: 'Identify, research, value and sell coins.', icon: Coins, tone: 'from-amber-950 to-stone-950 border-amber-300/30 text-amber-100' },
  { name: 'Clothes Flipper', slug: 'clothes', description: 'Identify fashion, brands and resale value.', icon: Shirt, tone: 'from-pink-950 to-zinc-950 border-pink-400/30 text-pink-100' },
  { name: 'MX Flipper', slug: 'mx', description: 'Motocross bikes, riding kit and parts.', icon: Wrench, tone: 'from-orange-950 to-zinc-950 border-orange-400/30 text-orange-100' },
  { name: 'Bike Flipper', slug: 'bikes', description: 'Bicycles, components and cycling resale.', icon: Bike, tone: 'from-lime-950 to-zinc-950 border-lime-400/30 text-lime-100' },
  { name: 'Threads Flip', slug: 'threads', description: 'A specialist fashion resale workspace.', icon: Shirt, tone: 'from-fuchsia-950 to-zinc-950 border-fuchsia-400/30 text-fuchsia-100' },
  { name: 'Surplus Flip', slug: 'surplus', description: 'Job lots, clearance stock and manifests.', icon: Sofa, tone: 'from-teal-950 to-zinc-950 border-teal-400/30 text-teal-100' },
  { name: 'Electronics', slug: 'electronics', description: 'Use SWISH to organise electronics resale in the shared workspace.', icon: Smartphone, tone: 'from-sky-950 to-zinc-950 border-sky-400/30 text-sky-100' },
  { name: 'Games & Collectables', slug: 'games', description: 'Use the shared SWISH workspace for games and collectables.', icon: Gamepad2, tone: 'from-violet-950 to-zinc-950 border-violet-400/30 text-violet-100' },
  { name: 'Home & Tools', slug: 'home', description: 'Use the shared SWISH workspace for furniture, tools and home stock.', icon: Wrench, tone: 'from-slate-800 to-zinc-950 border-slate-300/30 text-slate-100' },
];

const existingEntryRoutes: Record<string, string> = {
  coins: '/coins',
  clothes: '/clothes',
  mx: '/mx',
  bikes: '/bikes',
  threads: '/threads',
  surplus: '/surplus',
};

// Until a specialist workspace is registered in the existing app, send the
// remaining broad categories to the existing shared engine with its available
// niche selected. This avoids dead links and does not pretend separate products exist.
const routeFor = (slug: string) => existingEntryRoutes[slug] || '/workspace/coins';

export default function SwishFlipHome() {
  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b12]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3" aria-label="SWISHFLIP home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lime-200 to-amber-300 text-slate-950 shadow-lg"><Crown className="h-6 w-6" /></span>
            <span className="text-xl font-black tracking-tight">SWISH<span className="text-lime-300">FLIP</span></span>
          </a>
          <a href="/coins" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:border-lime-300/60"><LogIn className="h-4 w-4" /> Member sign in</a>
        </div>
      </header>
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#080b12] via-[#080b12]/90 to-[#080b12]/45" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(190,242,100,0.18),transparent_40%),radial-gradient(ellipse_at_15%_75%,rgba(56,189,248,0.10),transparent_38%)]" />
        <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-lime-200"><Sparkles className="h-3.5 w-3.5" /> One shared SWISH engine</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">Find it.<br/><span className="text-lime-300">Value it.</span><br/>Flip it.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Choose the kind of stock you sell. Each card opens an entry point in the existing SWISH web app. No niche downloads, no drop-down menus and no niche search.</p>
        </div>
      </section>
      <section id="niches" className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">Choose your workspace</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Nine ways to SWISH</h2></div>
          <p className="text-sm text-slate-400">One web app · One existing backend · Nine entry cards</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {niches.map((niche, index) => {
            const Icon = niche.icon;
            return (
              <a key={niche.slug} href={routeFor(niche.slug)} aria-label={`Open ${niche.name} workspace`} className={`group relative isolate flex min-h-52 flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-lime-300/60 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-lime-300 ${niche.tone}`}>
                <span className="pointer-events-none absolute -right-5 -top-5 -z-10 opacity-[.12] transition duration-500 group-hover:scale-110"><Icon className="h-40 w-40" /></span>
                <span className="flex items-center justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/30"><Icon className="h-6 w-6" /></span><span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">Open app</span></span>
                <span className="mt-8 text-2xl font-black tracking-tight">{niche.name}</span>
                <span className="mt-2 max-w-sm text-sm leading-6 text-white/70">{niche.description}</span>
                <span className="mt-auto pt-5 inline-flex items-center gap-2 text-sm font-bold">Open workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </a>
            );
          })}
        </div>
      </section>
      <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} SWISHFLIP. Built for the business of flipping.</span><span>One shared engine. No duplicate databases.</span></div></footer>
    </main>
  );
}
