import {
  ArrowRight, Bike, BookOpen, BrainCircuit, Camera, ChartNoAxesColumnIncreasing,
  CheckCircle2, Coins, Crown, Gamepad2, LogIn, Shirt, Smartphone,
  Sparkles, Tag, Trophy, Wrench, Watch, Gem, ShoppingCart, Heart,
} from 'lucide-react';
import coinArtwork from '@/assets/niches/coin-flipper.webp';
import mxArtwork from '@/assets/niches/mx-flipper.webp';
import bikeArtwork from '@/assets/niches/bike-flipper.svg';
import threadsArtwork from '@/assets/niches/threads-flip.svg';
import cardArtwork from '@/assets/niches/card-flipper.svg';
import antiqueArtwork from '@/assets/niches/antique-flipper.svg';
import fossilArtwork from '@/assets/niches/fossil-flipper.webp';
import beautyArtwork from '@/assets/niches/beauty-flipper.webp';
import techArtwork from '@/assets/niches/tech-flipper.webp';

type Niche = {
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  tagline: string;
  icon: typeof Coins;
  button: string;
  color: string;
  glow: string;
  artwork: string;
};

const niches: Niche[] = [
  { name: 'Coin Flipper', slug: 'coins', eyebrow: 'ANCIENT · ISLAMIC · WORLD', description: 'Specialist coin identification, research and collection tools', tagline: 'A dedicated app for coin people.', icon: Coins, button: 'Enter Coins', color: 'from-amber-800 via-stone-950 to-black', glow: 'group-hover:shadow-amber-500/20', artwork: coinArtwork },
  { name: 'MX Flipper', slug: 'mx', eyebrow: 'DIRT BIKES · PARTS · GEAR', description: 'Bike, parts and gear recognition built around motocross', tagline: 'A dedicated app for MX enthusiasts.', icon: Wrench, button: 'Enter MX', color: 'from-orange-700 via-red-950 to-black', glow: 'group-hover:shadow-orange-500/20', artwork: mxArtwork },
  { name: 'Bike Flipper', slug: 'bikes', eyebrow: 'BICYCLES · PARTS · UPGRADES', description: 'Understand bikes, components, condition and value', tagline: 'A dedicated app for cyclists and traders.', icon: Bike, button: 'Enter Bikes', color: 'from-green-700 via-emerald-950 to-black', glow: 'group-hover:shadow-green-500/20', artwork: bikeArtwork },
  { name: 'Threads Flip', slug: 'threads', eyebrow: 'CLOTHING · STREETWEAR · BRANDS', description: 'Fashion, brands, styles and resale knowledge in one place', tagline: 'A dedicated app for clothing specialists.', icon: Shirt, button: 'Enter Threads', color: 'from-pink-700 via-fuchsia-950 to-black', glow: 'group-hover:shadow-pink-500/20', artwork: threadsArtwork },
  { name: 'Card Flipper', slug: 'games', eyebrow: 'TRADING CARDS · TCG · SPORTS', description: 'Trading cards, sets, condition and collector knowledge', tagline: 'A dedicated app for card collectors.', icon: Gamepad2, button: 'Enter Cards', color: 'from-violet-700 via-purple-950 to-black', glow: 'group-hover:shadow-violet-500/20', artwork: cardArtwork },
  { name: 'Antique Flipper', slug: 'home', eyebrow: 'ANTIQUES · VINTAGE · COLLECTABLES', description: 'Recognise antiques, learn their history and assess value', tagline: 'A dedicated app for antique hunters.', icon: Watch, button: 'Enter Antiques', color: 'from-yellow-800 via-amber-950 to-black', glow: 'group-hover:shadow-yellow-500/20', artwork: antiqueArtwork },
  { name: 'Fossil Flipper', slug: 'surplus', eyebrow: 'FOSSILS · MINERALS · SPECIMENS', description: 'Fossils, minerals and specimen identification and research', tagline: 'A dedicated app for fossil enthusiasts.', icon: Gem, button: 'Enter Fossils', color: 'from-cyan-700 via-sky-950 to-black', glow: 'group-hover:shadow-cyan-500/20', artwork: fossilArtwork },
  { name: 'Beauty Flipper', slug: 'clothes', eyebrow: 'COSMETICS · FRAGRANCE · SKINCARE', description: 'Beauty, fragrance and skincare product knowledge', tagline: 'A dedicated app for beauty resellers.', icon: Heart, button: 'Enter Beauty', color: 'from-rose-700 via-pink-950 to-black', glow: 'group-hover:shadow-rose-500/20', artwork: beautyArtwork },
  { name: 'Tech Flipper', slug: 'electronics', eyebrow: 'PHONES · CONSOLES · GADGETS', description: 'Phones, consoles and gadgets with practical valuation help', tagline: 'A dedicated app for tech specialists.', icon: Smartphone, button: 'Enter Tech', color: 'from-blue-700 via-indigo-950 to-black', glow: 'group-hover:shadow-blue-500/20', artwork: techArtwork },
];

const existingEntryRoutes: Record<string, string> = {
  coins: '/coins', mx: '/mx', bikes: '/bikes', threads: '/threads',
  games: '/games', home: '/home', surplus: '/surplus', clothes: '/clothes',
  electronics: '/electronics',
};

const features = [
  { icon: BrainCircuit, title: 'AI IDENTIFICATION', subtitle: 'Photos, video & real-world data' },
  { icon: ChartNoAxesColumnIncreasing, title: 'LIVE MARKET VALUES', subtitle: 'eBay & sales history' },
  { icon: Tag, title: 'PROFIT CALCULATORS', subtitle: 'Know what items are worth' },
  { icon: BookOpen, title: 'EXPERT GUIDES', subtitle: 'Learn & improve' },
];

export default function SwishFlipHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080c] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090d]/95 shadow-xl shadow-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" aria-label="SWISHFLIP home" className="flex shrink-0 flex-col leading-none">
            <span className="text-3xl font-black italic tracking-[-.08em] sm:text-4xl">SWISH<span className="text-yellow-300">FLIP</span><sup className="ml-1 text-yellow-300">↗</sup></span>
            <span className="mt-1 text-[9px] font-bold tracking-[.24em] text-slate-300 sm:text-[10px]">IDENTIFY · VALUE · FLIP · PROFIT</span>
          </a>
          <nav className="hidden items-center gap-5 lg:flex">
            <a href="/" className="border-b-2 border-yellow-300 px-1 py-3 text-sm font-bold text-yellow-200">⌂ Home</a>
            <a href="#niches" className="px-1 py-3 text-sm font-semibold text-slate-200 transition hover:text-yellow-200">Niches</a>
            <a href="#how-it-works" className="px-1 py-3 text-sm font-semibold text-slate-200 transition hover:text-yellow-200">How It Works</a>
            <a href="#pricing" className="px-1 py-3 text-sm font-semibold text-slate-200 transition hover:text-yellow-200">Pricing</a>
            <a href="#community" className="px-1 py-3 text-sm font-semibold text-slate-200 transition hover:text-yellow-200">Community</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a href="/coins" className="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold transition hover:border-yellow-300/60 sm:inline-flex"><LogIn className="h-4 w-4" /> Login</a>
            <a href="#niches" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-yellow-200 to-yellow-400 px-4 py-3 text-sm font-black text-black shadow-lg shadow-yellow-500/20 transition hover:brightness-110 sm:px-6">Get Started <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </header>

      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_65%_15%,rgba(250,204,21,.18),transparent_45%),linear-gradient(120deg,#09090b,#12121a_55%,#08090d)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/75 to-black/45" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_25%,rgba(250,204,21,.18),transparent_50%)]" />
        <div className="mx-auto grid max-w-[1500px] items-center gap-6 px-4 py-8 sm:px-8 sm:py-12 md:grid-cols-[1.15fr_.85fr] md:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.22em] text-yellow-200"><Sparkles className="h-4 w-4" /> Specialist apps · Shared learning engine</div>
            <h1 className="max-w-3xl text-[2.65rem] font-black italic leading-[.95] tracking-[-.045em] sm:text-6xl lg:text-7xl xl:text-8xl">YOUR NICHE.<br/><span className="text-yellow-300">YOUR APP.</span></h1>
            <p className="mt-5 text-base font-black uppercase tracking-[.18em] text-white sm:text-xl">Specialist tools powered by shared intelligence</p>
            <div className="mt-6 grid max-w-2xl grid-cols-5 gap-1 sm:gap-3">
              {[
                { icon: Camera, title: 'IDENTIFY', sub: 'with AI' },
                { icon: ChartNoAxesColumnIncreasing, title: 'REAL MARKET', sub: 'data' },
                { icon: Tag, title: 'VALUE', sub: 'with confidence' },
                { icon: ShoppingCart, title: 'LIST & SELL', sub: 'faster' },
                { icon: Trophy, title: 'BIGGER', sub: 'opportunities' },
              ].map(({icon: Icon,title,sub}) => <div key={title} className="border-r border-white/15 px-1 text-center last:border-0"><Icon className="mx-auto mb-2 h-6 w-6 text-yellow-200 sm:h-7 sm:w-7"/><p className="text-[8px] font-black sm:text-xs">{title}</p><p className="text-[9px] text-slate-300 sm:text-xs">{sub}</p></div>)}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl border border-yellow-200/30 bg-black/35 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm">
              <p className="text-xs font-black uppercase tracking-[.2em] text-yellow-200">Built around your niche</p>
              <div className="mt-4 space-y-4">
                {[
                  ['01','Your app understands your category','Specialist workflows and recognition'],
                  ['02','Learn from shared intelligence','Predictions improve as knowledge grows'],
                  ['03','Automate the repetitive work','Less admin. More time for your expertise.'],
                ].map(([number,title,sub])=><div key={number} className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-yellow-300/25 bg-yellow-300/10 text-sm font-black text-yellow-200">{number}</span><span><span className="block font-extrabold">{title}</span><span className="text-sm text-slate-300">{sub}</span></span><CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-lime-300"/></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="niches" className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-300">Find your specialist app</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">One app designed for your world</h2></div>
          <p className="hidden text-right text-xs text-slate-400 sm:block">Purpose-built experience · Shared learning engine</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {niches.map((niche) => {
            const Icon = niche.icon;
            return <a key={niche.slug} href={existingEntryRoutes[niche.slug] || '/workspace/coins'} aria-label={`Enter ${niche.name}`} className={`group relative isolate flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br ${niche.color} p-4 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/60 hover:shadow-2xl ${niche.glow} focus:outline-none focus:ring-2 focus:ring-yellow-300 sm:min-h-[320px]`}>
              <img
                src={niche.artwork}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/5 transition duration-300 group-hover:from-black/90 group-hover:via-black/45" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-screen" style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,.32), transparent 45%)' }} />
              <div className="pointer-events-none absolute -right-5 -top-6 -z-10 rotate-[-12deg] opacity-[.16] transition duration-500 group-hover:scale-110 group-hover:opacity-30"><Icon className="h-44 w-44 sm:h-52 sm:w-52"/></div>
              <div className="flex items-start justify-between gap-3"><span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[9px] font-black tracking-[.12em] text-white/90">{niche.eyebrow}</span><Icon className="h-6 w-6 shrink-0 drop-shadow-lg"/></div>
              <div className="mt-auto pt-8">
                <p className="mb-1 text-[10px] font-bold italic text-white/70">{niche.tagline}</p>
                <h3 className="text-3xl font-black italic leading-none tracking-[-.04em] drop-shadow-lg sm:text-4xl 2xl:text-4xl">{niche.name.toUpperCase()}</h3>
                <p className="mt-2 text-xs font-semibold text-white/85">{niche.description}</p>
                <span className="mt-4 flex items-center justify-between rounded-xl border border-white/30 bg-gradient-to-r from-yellow-100 to-yellow-400 px-4 py-3 text-sm font-black text-black shadow-lg transition group-hover:brightness-110"><span>{niche.button}</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span>
              </div>
            </a>;
          })}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1500px] px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-[#15161c] to-[#08090d] md:grid-cols-4">
          {features.map(({icon:Icon,title,subtitle},i)=><div key={title} className={`flex items-center gap-3 border-white/10 p-4 sm:p-5 ${i%2===0?'border-r':''} ${i<2?'border-b md:border-b-0':''} ${i===1?'md:border-r':''} ${i===2?'md:border-r':''}`}><Icon className="h-7 w-7 shrink-0 text-yellow-200 sm:h-9 sm:w-9"/><div><p className="text-[10px] font-black sm:text-xs">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">{subtitle}</p></div></div>)}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1500px] px-4 pb-8 pt-3 sm:px-6">
        <a id="community" href="/coins" className="group flex items-center justify-between gap-4 rounded-2xl border border-yellow-200/40 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-400 p-4 text-black shadow-xl shadow-yellow-500/10 transition hover:brightness-105 sm:px-7 sm:py-5">
          <span className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/10"><Crown className="h-8 w-8"/></span><span><span className="block text-xl font-black sm:text-2xl">GET SWISHFLIP PRO</span><span className="mt-1 block text-xs font-semibold sm:text-sm">Unlock your niche app · Smarter predictions · Routine tasks automated</span></span></span>
          <ArrowRight className="h-7 w-7 shrink-0 transition group-hover:translate-x-1"/>
        </a>
      </section>
      <footer className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} SWISHFLIP · Identify · Value · Flip · Profit</footer>
    </main>
  );
}
