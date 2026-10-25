import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowUpRight, Coins, Bike, Shirt, Gem, Gamepad2, Hammer, FlaskConical, Monitor, Wrench, BookOpen } from 'lucide-react';

type Niche = {
  id: string; name: string; tagline: string; detail: string; colour: string; glow: string;
  icon: typeof Coins; hero: string; features: string[]; route: string;
};

const NICHES: Niche[] = [
  { id:'coins', name:'Coin Flipper', tagline:'History identified. Opportunity realised.', detail:'Ancient, Islamic, world coins and tokens', colour:'#d9ad54', glow:'rgba(217,173,84,.25)', icon:Coins, hero:'https://images.unsplash.com/photo-1624365169364-0640dd10e7b2?auto=format&fit=crop&w=1200&q=85', features:['Identify','Reference','Value','List & sell'], route:'/dashboard' },
  { id:'cards', name:'Card Flipper', tagline:'Find the rare. Know the value.', detail:'Trading cards, TCG and sports cards', colour:'#45caff', glow:'rgba(69,202,255,.24)', icon:Gamepad2, hero:'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=1200&q=85', features:['Identify','Grade','Value','List'], route:'/dashboard' },
  { id:'antiques', name:'Antique Flipper', tagline:'Old finds. New opportunities.', detail:'Antiques, vintage and collectables', colour:'#cda66a', glow:'rgba(205,166,106,.24)', icon:Gem, hero:'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85', features:['Identify','Research','Value','Sell'], route:'/dashboard' },
  { id:'bikes', name:'Bike Flipper', tagline:'Buy smart. Build better. Sell strong.', detail:'Bicycles, components, repairs and upgrades', colour:'#a4ed38', glow:'rgba(164,237,56,.23)', icon:Bike, hero:'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=85', features:['Find','Assess','Upgrade','Profit'], route:'/dashboard' },
  { id:'mx', name:'Flipper MX', tagline:'Find. Fix. Flip. Repeat.', detail:'Dirt bikes, parts and workshop projects', colour:'#ff7a1a', glow:'rgba(255,122,26,.25)', icon:Wrench, hero:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=85', features:['Find','Fix & prep','List','Profit'], route:'/dashboard' },
  { id:'fossils', name:'Fossil Flipper', tagline:'Discover value in deep time.', detail:'Fossils, minerals and specimens', colour:'#54d6e8', glow:'rgba(84,214,232,.23)', icon:FlaskConical, hero:'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=1200&q=85', features:['Identify','Research','Value','Collect'], route:'/dashboard' },
  { id:'clothing', name:'Clothing Flipper', tagline:'Turn fashion into opportunity.', detail:'Vintage, streetwear, designer and high street', colour:'#ff557e', glow:'rgba(255,85,126,.24)', icon:Shirt, hero:'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85', features:['Identify','Brands','Style','Sell'], route:'/dashboard' },
  { id:'beauty', name:'Beauty Flipper', tagline:'Beauty finds. Better margins.', detail:'Cosmetics, fragrances and skincare', colour:'#f58ac1', glow:'rgba(245,138,193,.24)', icon:Sparkles, hero:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85', features:['Identify','Check','Bundle','Sell'], route:'/dashboard' },
  { id:'tech', name:'Tech Flipper', tagline:'Smarter tech. Better flips.', detail:'Electronics, gaming and consumer tech', colour:'#35c7ff', glow:'rgba(53,199,255,.24)', icon:Monitor, hero:'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=85', features:['Identify','Test','Value','Sell'], route:'/dashboard' },
  { id:'tools', name:'Tool Flipper', tagline:'Know the kit. Know the margin.', detail:'Power tools, trade gear and equipment', colour:'#ffc52e', glow:'rgba(255,197,46,.24)', icon:Hammer, hero:'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=85', features:['Identify','Condition','Value','Sell'], route:'/dashboard' },
];

export default function NicheEntry() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const niches = useMemo(() => NICHES.filter(n => (n.name + ' ' + n.detail).toLowerCase().includes(query.toLowerCase())), [query]);
  const enter = (niche: Niche) => {
    localStorage.setItem('swish_active_niche', niche.id);
    localStorage.setItem('swish_active_niche_name', niche.name);
    navigate(niche.route);
  };

  return (
    <main className="niche-entry min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 lg:p-10">
      <header className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="niche-mark"><Sparkles className="w-6 h-6" /></div>
            <div><div className="text-2xl font-extrabold tracking-[.18em]">SWISH</div><div className="text-[10px] uppercase tracking-[.28em] text-white/45">Specialist flipping intelligence</div></div>
          </div>
          <div className="niche-search"><Search className="w-4 h-4 text-white/45" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find your niche…" aria-label="Find a niche" /></div>
        </div>
        <section className="niche-intro mb-7">
          <p className="text-xs uppercase tracking-[.3em] text-white/45 mb-3">One platform. Specialist tools.</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight max-w-3xl">Choose your <span className="niche-gradient-text">next opportunity.</span></h1>
          <p className="mt-3 text-sm sm:text-base text-white/55 max-w-2xl">Purpose-built workflows for the things you buy, collect, repair and resell. Pick a specialist workspace to get started.</p>
        </section>
      </header>
      <section className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Specialist niches">
        {niches.map(n => { const Icon=n.icon; return <button key={n.id} onClick={()=>enter(n)} className="niche-card text-left" style={{'--niche-accent':n.colour,'--niche-glow':n.glow} as React.CSSProperties}>
          <div className="niche-card-art" style={{backgroundImage:'linear-gradient(180deg, rgba(5,7,13,.04) 0%, rgba(5,7,13,.32) 34%, rgba(5,7,13,.97) 100%), url("'+n.hero+'")'}}>
            <div className="niche-card-top"><span className="niche-icon"><Icon className="w-5 h-5" /></span><span className="niche-open">OPEN WORKSPACE <ArrowUpRight className="w-3.5 h-3.5" /></span></div>
            <div className="niche-card-copy"><div className="niche-eyebrow">{n.detail}</div><h2>{n.name}</h2><p>{n.tagline}</p><div className="niche-features">{n.features.map(f=><span key={f}>{f}</span>)}</div></div>
          </div>
        </button>; })}
      </section>
      {niches.length===0 && <p className="text-center text-white/55 py-16">No niches match “{query}”. Try another search.</p>}
      <footer className="mx-auto max-w-7xl mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-white/35"><span>SWISH · Specialist workspaces</span><span>Each niche has its own identity. Your workspace data stays scoped.</span></footer>
    </main>
  );
}
