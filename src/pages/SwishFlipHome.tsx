import { useMemo, useState } from 'react';
import { ArrowRight, Search, Sparkles, Package, Coins, Shirt, Bike, Wrench, Smartphone, Gamepad2, Sofa, Camera, BookOpen, Watch, Music, Dumbbell, Car, Gem, Boxes, Store, Download, LogIn, Crown, TrendingUp, ShieldCheck } from 'lucide-react';
import heroImage from '@/assets/swish-hero.jpg';

type Niche = { name: string; category: string; slug: string; description: string; icon: typeof Package; featured?: boolean };

const niches: Niche[] = [
  { name: 'Coins', category: 'Coins & Collectables', slug: 'coins', description: 'Identify, research and value coins.', icon: Coins, featured: true },
  { name: 'Ancient Coins', category: 'Coins & Collectables', slug: 'ancient-coins', description: 'Ancient Greek, Roman and historic coinage.', icon: Coins },
  { name: 'Islamic Coins', category: 'Coins & Collectables', slug: 'islamic-coins', description: 'Islamic, medieval and regional coinage.', icon: Coins },
  { name: 'World Coins', category: 'Coins & Collectables', slug: 'world-coins', description: 'Coins from around the world.', icon: Coins },
  { name: 'British Coins', category: 'Coins & Collectables', slug: 'british-coins', description: 'Hammered, milled and modern British coins.', icon: Coins },
  { name: 'Silver Coins', category: 'Coins & Collectables', slug: 'silver-coins', description: 'Silver coin research and resale.', icon: Coins },
  { name: 'Gold Coins', category: 'Coins & Collectables', slug: 'gold-coins', description: 'Gold coin identification and valuation.', icon: Coins },
  { name: 'Banknotes', category: 'Coins & Collectables', slug: 'banknotes', description: 'Paper currency and banknote collecting.', icon: BookOpen },
  { name: 'Tokens & Medals', category: 'Coins & Collectables', slug: 'tokens-medals', description: 'Tokens, medals and exonumia.', icon: Gem },
  { name: 'Stamps', category: 'Coins & Collectables', slug: 'stamps', description: 'Stamp collecting and resale.', icon: BookOpen },
  { name: 'Clothes', category: 'Fashion', slug: 'clothes', description: 'Manage and resell second-hand clothing.', icon: Shirt, featured: true },
  { name: 'Designer Fashion', category: 'Fashion', slug: 'designer-fashion', description: 'Designer labels and premium apparel.', icon: Shirt },
  { name: 'Trainers & Sneakers', category: 'Fashion', slug: 'sneakers', description: 'Footwear identification and resale.', icon: Shirt },
  { name: 'Handbags', category: 'Fashion', slug: 'handbags', description: 'Handbags and fashion accessories.', icon: Gem },
  { name: 'Vintage Clothing', category: 'Fashion', slug: 'vintage-clothing', description: 'Vintage and retro apparel.', icon: Shirt },
  { name: 'Streetwear', category: 'Fashion', slug: 'streetwear', description: 'Streetwear brands and drops.', icon: Shirt },
  { name: 'Watches', category: 'Fashion', slug: 'watches', description: 'Watches, references and accessories.', icon: Watch },
  { name: 'Jewellery', category: 'Fashion', slug: 'jewellery', description: 'Jewellery identification and resale.', icon: Gem },
  { name: 'Outdoor Clothing', category: 'Fashion', slug: 'outdoor-clothing', description: 'Outdoor and technical clothing.', icon: Shirt },
  { name: 'Sportswear', category: 'Fashion', slug: 'sportswear', description: 'Sports clothing and athletic apparel.', icon: Shirt },
  { name: 'MX Flipper', category: 'Motors & Transport', slug: 'mx', description: 'Motocross bikes, kit and parts.', icon: Bike, featured: true },
  { name: 'Motorcycles', category: 'Motors & Transport', slug: 'motorcycles', description: 'Road motorcycles and scooters.', icon: Bike },
  { name: 'Car Parts', category: 'Motors & Transport', slug: 'car-parts', description: 'Used automotive components.', icon: Wrench },
  { name: 'Motorcycle Parts', category: 'Motors & Transport', slug: 'motorcycle-parts', description: 'Motorcycle spares and accessories.', icon: Wrench },
  { name: 'Car Accessories', category: 'Motors & Transport', slug: 'car-accessories', description: 'Accessories and upgrades.', icon: Car },
  { name: 'Classic Cars', category: 'Motors & Transport', slug: 'classic-cars', description: 'Classic vehicle trading.', icon: Car },
  { name: 'Vans & Commercial Vehicles', category: 'Motors & Transport', slug: 'vans', description: 'Vans and work vehicles.', icon: Car },
  { name: 'Bikes Flipper', category: 'Motors & Transport', slug: 'bikes', description: 'Bicycles, parts and cycling resale.', icon: Bike, featured: true },
  { name: 'E-bikes', category: 'Motors & Transport', slug: 'ebikes', description: 'Electric bicycles and accessories.', icon: Bike },
  { name: 'Automotive Memorabilia', category: 'Motors & Transport', slug: 'automotive-memorabilia', description: 'Badges, signs and motoring collectables.', icon: Car },
  { name: 'Smartphones', category: 'Electronics', slug: 'smartphones', description: 'Used mobile phones and accessories.', icon: Smartphone },
  { name: 'Laptops', category: 'Electronics', slug: 'laptops', description: 'Laptops and portable computers.', icon: Smartphone },
  { name: 'Computers & Components', category: 'Electronics', slug: 'computer-components', description: 'PCs, components and upgrades.', icon: Smartphone },
  { name: 'Gaming Consoles', category: 'Electronics', slug: 'gaming-consoles', description: 'Console identification and resale.', icon: Gamepad2 },
  { name: 'Video Games', category: 'Electronics', slug: 'video-games', description: 'Physical video games.', icon: Gamepad2 },
  { name: 'Cameras', category: 'Electronics', slug: 'cameras', description: 'Digital and film cameras.', icon: Camera },
  { name: 'Audio Equipment', category: 'Electronics', slug: 'audio-equipment', description: 'Speakers, amplifiers and hi-fi.', icon: Music },
  { name: 'Headphones', category: 'Electronics', slug: 'headphones', description: 'Headphones and audio accessories.', icon: Music },
  { name: 'Tablets', category: 'Electronics', slug: 'tablets', description: 'Tablets and e-readers.', icon: Smartphone },
  { name: 'Smart Home', category: 'Electronics', slug: 'smart-home', description: 'Smart devices and home technology.', icon: Smartphone },
  { name: 'Trading Cards', category: 'Toys & Hobbies', slug: 'trading-cards', description: 'Trading cards and collectibles.', icon: Package },
  { name: 'Pokémon Cards', category: 'Toys & Hobbies', slug: 'pokemon-cards', description: 'Pokémon card collecting and resale.', icon: Package },
  { name: 'Sports Cards', category: 'Toys & Hobbies', slug: 'sports-cards', description: 'Sports trading cards.', icon: Package },
  { name: 'LEGO', category: 'Toys & Hobbies', slug: 'lego', description: 'Sets, minifigures and individual pieces.', icon: Boxes },
  { name: 'Action Figures', category: 'Toys & Hobbies', slug: 'action-figures', description: 'Collectible figures and toys.', icon: Package },
  { name: 'Die-cast Models', category: 'Toys & Hobbies', slug: 'diecast-models', description: 'Model cars and vehicles.', icon: Car },
  { name: 'Model Railways', category: 'Toys & Hobbies', slug: 'model-railways', description: 'Trains, track and accessories.', icon: Package },
  { name: 'Board Games', category: 'Toys & Hobbies', slug: 'board-games', description: 'Board games and tabletop games.', icon: Gamepad2 },
  { name: 'Comics', category: 'Toys & Hobbies', slug: 'comics', description: 'Comic books and graphic novels.', icon: BookOpen },
  { name: 'Dolls & Collectible Toys', category: 'Toys & Hobbies', slug: 'dolls-toys', description: 'Dolls, vintage toys and collectables.', icon: Package },
  { name: 'Furniture', category: 'Home & DIY', slug: 'furniture', description: 'Second-hand furniture.', icon: Sofa },
  { name: 'Antiques', category: 'Home & DIY', slug: 'antiques', description: 'Antique identification and resale.', icon: Store },
  { name: 'Home Décor', category: 'Home & DIY', slug: 'home-decor', description: 'Decorative homeware.', icon: Sofa },
  { name: 'Tools', category: 'Home & DIY', slug: 'tools', description: 'Hand tools and power tools.', icon: Wrench },
  { name: 'Garden Equipment', category: 'Home & DIY', slug: 'garden-equipment', description: 'Garden tools and machinery.', icon: Wrench },
  { name: 'Kitchen Appliances', category: 'Home & DIY', slug: 'kitchen-appliances', description: 'Domestic kitchen appliances.', icon: Package },
  { name: 'Lighting', category: 'Home & DIY', slug: 'lighting', description: 'Lamps and lighting fixtures.', icon: Package },
  { name: 'Building Materials', category: 'Home & DIY', slug: 'building-materials', description: 'Reusable building supplies.', icon: Boxes },
  { name: 'Plumbing & Heating', category: 'Home & DIY', slug: 'plumbing-heating', description: 'Suitable used components and parts.', icon: Wrench },
  { name: 'Glassware & Ceramics', category: 'Home & DIY', slug: 'glassware-ceramics', description: 'Pottery, glass and ceramics.', icon: Package },
  { name: 'Sports Equipment', category: 'Sports & Outdoors', slug: 'sports-equipment', description: 'General sporting goods.', icon: Dumbbell },
  { name: 'Golf', category: 'Sports & Outdoors', slug: 'golf', description: 'Clubs, bags and accessories.', icon: Dumbbell },
  { name: 'Fishing', category: 'Sports & Outdoors', slug: 'fishing', description: 'Rods, reels and tackle.', icon: Package },
  { name: 'Camping & Hiking', category: 'Sports & Outdoors', slug: 'camping-hiking', description: 'Camping equipment and outdoor gear.', icon: Package },
  { name: 'Gym Equipment', category: 'Sports & Outdoors', slug: 'gym-equipment', description: 'Fitness machines and accessories.', icon: Dumbbell },
  { name: 'Cycling Equipment', category: 'Sports & Outdoors', slug: 'cycling-equipment', description: 'Cycling clothing and accessories.', icon: Bike },
  { name: 'Water Sports', category: 'Sports & Outdoors', slug: 'water-sports', description: 'Kayaks, boards and equipment.', icon: Package },
  { name: 'Skiing & Snowboarding', category: 'Sports & Outdoors', slug: 'ski-snowboard', description: 'Winter sports equipment.', icon: Package },
  { name: 'Musical Instruments', category: 'Sports & Outdoors', slug: 'musical-instruments', description: 'Instruments and accessories.', icon: Music },
  { name: 'Vinyl Records', category: 'Sports & Outdoors', slug: 'vinyl-records', description: 'Record collecting and resale.', icon: Music },
  { name: 'Books', category: 'Books & Media', slug: 'books', description: 'General second-hand books.', icon: BookOpen },
  { name: 'Rare Books', category: 'Books & Media', slug: 'rare-books', description: 'Collectible and rare editions.', icon: BookOpen },
  { name: 'Textbooks', category: 'Books & Media', slug: 'textbooks', description: 'Educational books.', icon: BookOpen },
  { name: 'DVDs & Blu-rays', category: 'Books & Media', slug: 'dvds-blurays', description: 'Physical films and television.', icon: Package },
  { name: 'CDs', category: 'Books & Media', slug: 'cds', description: 'Music CDs.', icon: Music },
  { name: 'Posters & Prints', category: 'Books & Media', slug: 'posters-prints', description: 'Collectible posters and prints.', icon: Camera },
  { name: 'Art', category: 'Books & Media', slug: 'art', description: 'Artwork and suitable collectibles.', icon: Camera },
  { name: 'Photography Prints', category: 'Books & Media', slug: 'photography-prints', description: 'Collectible photographic prints.', icon: Camera },
  { name: 'Memorabilia', category: 'Books & Media', slug: 'memorabilia', description: 'Film, music and celebrity memorabilia.', icon: Gem },
  { name: 'Vintage Advertising', category: 'Books & Media', slug: 'vintage-advertising', description: 'Signs, packaging and advertising pieces.', icon: Store },
  { name: 'Surplus Flip', category: 'Business & Surplus', slug: 'surplus', description: 'Surplus stock, clearance and job lots.', icon: Boxes, featured: true },
  { name: 'Industrial Equipment', category: 'Business & Surplus', slug: 'industrial-equipment', description: 'Used industrial machinery.', icon: Wrench },
  { name: 'Catering Equipment', category: 'Business & Surplus', slug: 'catering-equipment', description: 'Commercial kitchen equipment.', icon: Package },
  { name: 'Office Equipment', category: 'Business & Surplus', slug: 'office-equipment', description: 'Office furniture and equipment.', icon: Store },
  { name: 'Hospitality Clearance', category: 'Business & Surplus', slug: 'hospitality-clearance', description: 'Business closure and hospitality stock.', icon: Store },
  { name: 'Warehouse Clearance', category: 'Business & Surplus', slug: 'warehouse-clearance', description: 'Overstock and liquidation inventory.', icon: Boxes },
  { name: 'Wholesale & Job Lots', category: 'Business & Surplus', slug: 'wholesale-job-lots', description: 'Bulk inventory and mixed lots.', icon: Boxes },
  { name: 'Agricultural Equipment', category: 'Business & Surplus', slug: 'agricultural-equipment', description: 'Farm tools and machinery.', icon: Wrench },
  { name: 'Construction Equipment', category: 'Business & Surplus', slug: 'construction-equipment', description: 'Construction machinery and tools.', icon: Wrench },
  { name: 'Scientific Equipment', category: 'Business & Surplus', slug: 'scientific-equipment', description: 'Suitable specialist equipment.', icon: Package },
  { name: 'Military Collectables', category: 'Specialist Collecting', slug: 'military-collectables', description: 'Lawfully traded military memorabilia.', icon: Gem },
  { name: 'Vintage Computing', category: 'Specialist Collecting', slug: 'vintage-computing', description: 'Retro computers and accessories.', icon: Smartphone },
  { name: 'Retro Electronics', category: 'Specialist Collecting', slug: 'retro-electronics', description: 'Older consumer electronics.', icon: Smartphone },
  { name: 'Threads Flip', category: 'Fashion', slug: 'threads', description: 'A specialist clothing and fashion resale workspace.', icon: Shirt, featured: true },
  { name: 'Musical Collectables', category: 'Specialist Collecting', slug: 'musical-collectables', description: 'Music-related collectible objects.', icon: Music },
  { name: 'Fountain Pens', category: 'Specialist Collecting', slug: 'fountain-pens', description: 'Collectible writing instruments.', icon: Package },
  { name: 'Perfume & Fragrance', category: 'Specialist Collecting', slug: 'perfume-fragrance', description: 'Collectible fragrance and suitable resale.', icon: Gem },
  { name: 'Coin Sets', category: 'Specialist Collecting', slug: 'coin-sets', description: 'Proof sets and commemorative issues.', icon: Coins },
  { name: 'Vintage Sports Memorabilia', category: 'Specialist Collecting', slug: 'vintage-sports-memorabilia', description: 'Historic sporting collectibles.', icon: Dumbbell },
  { name: 'General Collectables', category: 'Specialist Collecting', slug: 'collectables', description: 'Discover value in unusual finds.', icon: Gem },
];

const LIVE_NICHE_HOSTS: Record<string, string> = {
  coins: 'coin.swishflip.co.uk',
  mx: 'mx.swishflip.co.uk',
  bikes: 'bikes.swishflip.co.uk',
  clothes: 'clothes.swishflip.co.uk',
  threads: 'threads.swishflip.co.uk',
  surplus: 'surplus.swishflip.co.uk',
};

// Only link directly to product hosts that the app recognises. The remaining
// directory entries are planned niches and should not lead visitors to 404 pages.
const domainFor = (slug: string) => LIVE_NICHE_HOSTS[slug] || null;

const hostFor = (slug: string) => {
  const hostname = LIVE_NICHE_HOSTS[slug];
  return hostname ? `https://${hostname}/` : `/#explore`;
};

export default function SwishFlipHome() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All niches');
  const categories = useMemo(() => ['All niches', ...Array.from(new Set(niches.map((n) => n.category)))], []);
  const filtered = useMemo(() => niches.filter((n) => {
    const query = search.trim().toLowerCase();
    return (!query || `${n.name} ${n.category} ${n.description}`.toLowerCase().includes(query)) && (category === 'All niches' || n.category === category);
  }), [search, category]);
  const featured = niches.filter((n) => n.featured);
  const Icon = Package;

  return <main className="min-h-screen bg-[#080b12] text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b12]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-3" aria-label="SWISHFLIP home"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lime-200 to-amber-300 text-slate-950 shadow-lg"><Crown className="h-6 w-6" /></span><span className="text-xl font-black tracking-tight">SWISH<span className="text-lime-300">FLIP</span></span></a>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex"><a href="#explore" className="hover:text-white">Explore niches</a><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#get-started" className="hover:text-white">Get the app</a></nav>
        <a href="#explore" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:border-lime-300/60"><LogIn className="h-4 w-4" /> Member sign in</a>
      </div>
    </header>

    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#080b12] via-[#080b12]/90 to-[#080b12]/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(190,242,100,0.18),transparent_40%),radial-gradient(ellipse_at_15%_75%,rgba(56,189,248,0.10),transparent_38%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-[1.1fr_.9fr] md:py-28">
        <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-lime-200"><Sparkles className="h-3.5 w-3.5" /> One engine. 100 specialist niches.</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">Find it.<br/><span className="text-lime-300">Value it.</span><br/>Flip it.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">The AI-powered workspace for resellers. Identify items, research value, organise inventory and prepare listings — with a specialist experience built around what you sell.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#explore" className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950 hover:bg-lime-200">Find your niche <ArrowRight className="h-4 w-4"/></a><a href="#how-it-works" className="rounded-xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/5">See how it works</a></div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime-300"/><strong className="text-white">100</strong> niche concepts</span><span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-lime-300"/><strong className="text-white">1</strong> shared engine</span><span><strong className="text-white">Your</strong> specialist workspace</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {featured.map((n, i) => { const FeatureIcon = n.icon; const tone = n.slug === "coins" ? "from-amber-950 via-stone-950 to-black border-amber-300/30 text-amber-100" : n.slug === "clothes" || n.slug === "threads" ? "from-pink-950 via-zinc-950 to-black border-pink-400/30 text-pink-100" : n.slug === "mx" ? "from-orange-950 via-zinc-950 to-black border-orange-400/30 text-orange-100" : n.slug === "bikes" ? "from-lime-950 via-zinc-950 to-black border-lime-400/30 text-lime-100" : "from-teal-950 via-zinc-950 to-black border-teal-400/30 text-teal-100"; return <a key={n.slug} href={hostFor(n.slug)} aria-label={`Open ${n.name}`} className={`group relative isolate flex min-h-48 flex-col justify-end overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${tone} ${i === 0 ? "row-span-2 min-h-80" : ""}`}><span className="pointer-events-none absolute -right-5 -top-5 -z-10 opacity-[.12] transition duration-500 group-hover:scale-110"><FeatureIcon className="h-40 w-40"/></span><span className="mb-auto flex items-center justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/30 shadow-lg"><FeatureIcon className="h-6 w-6"/></span><span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">Explore</span></span><span className="mt-8 block text-2xl font-black tracking-tight">{n.name}</span><span className="mt-2 block max-w-xs text-sm leading-6 text-white/70">{n.description}</span><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Open workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span>{domainFor(n.slug) && <span className="mt-3 text-[11px] font-medium text-white/45">{domainFor(n.slug)}</span>}</a>; })}
        </div>
    </section>

    <section id="explore" className="mx-auto max-w-7xl px-5 py-16 md:py-20">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">The niche directory</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">What do you flip?</h2><p className="mt-3 max-w-2xl text-slate-400">Choose a specialist product. Each niche is designed to have its own entry point and workspace.</p></div><div className="text-sm text-slate-400"><span className="font-bold text-white">{niches.length}</span> niche concepts in the directory</div></div>
      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_240px]"><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-4"><Search className="h-5 w-5 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coins, clothes, electronics..." className="w-full bg-transparent py-3.5 text-white outline-none placeholder:text-slate-500" aria-label="Search niches"/></label><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#111722] px-4 py-3.5 text-white outline-none" aria-label="Filter by category">{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((n) => { const NicheIcon = n.icon || Icon; return <a key={n.slug} href={hostFor(n.slug)} className="group rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-lime-300/40 hover:bg-white/[.05]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-lime-200"><NicheIcon className="h-5 w-5"/></span><ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-lime-200"/></div><h3 className="mt-4 font-bold">{n.name}</h3><p className="mt-1 text-xs font-medium text-slate-500">{n.category}</p><p className="mt-2 text-sm leading-6 text-slate-400">{n.description}</p><p className="mt-4 text-xs font-semibold text-lime-200">{domainFor(n.slug) || "Planned specialist niche"}</p></a>; })}</div>
      {filtered.length === 0 && <p className="py-12 text-center text-slate-400">No niches match that search. Try another term.</p>}
    </section>

    <section id="how-it-works" className="border-y border-white/10 bg-white/[.025]"><div className="mx-auto max-w-7xl px-5 py-16 md:py-20"><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">One connected workflow</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">From find to sold.</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[{title:'Capture',text:'Add photos and item details.'},{title:'Identify',text:'Use specialist workflows to understand what you have.'},{title:'Value',text:'Research comparable items and potential pricing.'},{title:'Organise',text:'Keep inventory and opportunities in one workspace.'},{title:'List & sell',text:'Prepare listings and manage supported marketplace activity.'}].map((step,i)=><div key={step.title} className="rounded-2xl border border-white/10 p-5"><span className="text-sm font-black text-lime-300">0{i+1}</span><h3 className="mt-4 text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p></div>)}</div><p className="mt-5 text-xs text-slate-500">Available workflows and integrations vary by niche; directory concepts do not imply every niche is already live.</p></div></section>

    <section id="get-started" className="mx-auto max-w-7xl px-5 py-16 md:py-20"><div className="rounded-3xl border border-lime-300/20 bg-gradient-to-br from-lime-300/10 to-sky-300/5 p-7 sm:p-10 md:flex md:items-center md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">Ready to get started?</p><h2 className="mt-3 text-3xl font-black">Your niche. Your workflow. One platform.</h2><p className="mt-3 max-w-2xl text-slate-300">Choose a niche to access its web workspace. The Android app and subscription options can be surfaced here as the release setup is finalised.</p></div><div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0"><a href="#explore" className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950"><LogIn className="h-4 w-4"/> Choose your niche</a><a href="#explore" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-semibold"><Download className="h-4 w-4"/> Explore web workspaces</a></div></div></section>
    <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} SWISHFLIP. Built for the business of flipping.</span><a href="#explore" className="hover:text-white">Explore all niches ↑</a></div></footer>
  </main>;
}
