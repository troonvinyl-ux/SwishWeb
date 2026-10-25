import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInsert } from '@/hooks/useSupabaseQuery';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Package, Shirt, Bike, Coins, Wrench, Gamepad2, Gem, FlaskConical, Monitor, Hammer, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type Field = { key: string; label: string; placeholder?: string; type?: 'text' | 'number' | 'select'; options?: string[] };
type Config = { name: string; specialistId: string; description: string; fields: Field[]; icon: typeof Coins };
const COMMON: Field[] = [
  { key: 'brand', label: 'Brand / maker', placeholder: 'Brand or manufacturer' },
  { key: 'model', label: 'Model / style / reference', placeholder: 'Model, style, reference or range' },
  { key: 'category', label: 'Category', placeholder: 'Item category' },
  { key: 'condition', label: 'Condition', type: 'select', options: ['New with tags', 'New without tags', 'Used - Like New', 'Used - Very Good', 'Used - Good', 'Used - Acceptable', 'For parts / repair'] },
  { key: 'location', label: 'Storage location', placeholder: 'Where the item is stored' },
];
const CONFIG: Record<string, Config> = {
  coins: { name:'Coin Flipper', specialistId:'coins', description:'Coin identification starts with the dedicated obverse/reverse workflow.', icon:Coins, fields:[{key:'metal',label:'Metal / composition',placeholder:'Silver, bronze, gold…'},{key:'weight_g',label:'Weight (g)',type:'number'},{key:'diameter_mm',label:'Diameter (mm)',type:'number'},{key:'reference',label:'Catalogue reference',placeholder:'Numista / KM / other'}] },
  clothing: { name:'Threads Flip', specialistId:'clothing', description:'Record garment details first. Add brand, label, size and condition evidence before valuation and listing.', icon:Shirt, fields:[{key:'brand',label:'Brand',placeholder:'Brand on garment or label'},{key:'category',label:'Garment type',placeholder:'Jacket, dress, trainers, jeans…'},{key:'size',label:'Tagged size',placeholder:'Label size'},{key:'colour',label:'Colour / pattern',placeholder:'Colour and pattern'},{key:'material',label:'Material / fabric',placeholder:'Cotton, wool, leather…'},{key:'style',label:'Style / era',placeholder:'Vintage, streetwear, formal…'},{key:'condition',label:'Condition',type:'select',options:COMMON.find(f=>f.key==='condition')!.options},{key:'flaws',label:'Flaws / wear',placeholder:'Stains, holes, pilling, repairs…'}] },
  bikes: { name:'Bike Flipper', specialistId:'bikes', description:'Capture the bicycle or component identity, fit and mechanical condition.', icon:Bike, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model',placeholder:'Model / year'},{key:'category',label:'Bike type / component',placeholder:'Road, MTB, hybrid, frame…'},{key:'frame_size',label:'Frame size',placeholder:'e.g. 54 cm / M / 18 in'},{key:'wheel_size',label:'Wheel size',placeholder:'e.g. 700c / 29 in'},{key:'material',label:'Frame / material',placeholder:'Aluminium, carbon, steel…'},{key:'condition',label:'Mechanical condition',type:'select',options:['New','Rides well','Needs service','Needs repair','Parts only']},{key:'issues',label:'Issues / missing parts',placeholder:'Brakes, gears, cracks, missing parts…'}] },
  mx: { name:'Flipper MX', specialistId:'mx', description:'Record machine identity and condition before estimating repair costs or resale.', icon:Wrench, fields:[{key:'brand',label:'Make',placeholder:'Honda, Yamaha, KTM…'},{key:'model',label:'Model / engine size',placeholder:'Model and cc'},{key:'category',label:'Item type',placeholder:'Dirt bike, engine, part…'},{key:'year',label:'Year',placeholder:'Year'},{key:'condition',label:'Running condition',type:'select',options:['Runs well','Runs with issues','Non-runner','Unverified','Parts only']},{key:'hours',label:'Engine hours / mileage',placeholder:'Hours or mileage'},{key:'issues',label:'Known faults',placeholder:'Mechanical faults, damage, missing parts…'}] },
  cards: { name:'Card Flipper', specialistId:'cards', description:'Record set, card number, edition and visible condition before grading or valuation.', icon:Gamepad2, fields:[{key:'brand',label:'Game / publisher',placeholder:'Pokémon, MTG, sports league…'},{key:'category',label:'Set / series',placeholder:'Set or series name'},{key:'card_number',label:'Card number',placeholder:'Collector number'},{key:'edition',label:'Edition / variant',placeholder:'1st edition, holo, parallel…'},{key:'condition',label:'Visible condition',type:'select',options:['Near Mint','Lightly Played','Moderately Played','Heavily Played','Damaged','Unverified']}] },
  antiques: { name:'Antique Flipper', specialistId:'antiques', description:'Record maker, period, materials and visible damage before research.', icon:Gem, fields:[{key:'brand',label:'Maker / artist',placeholder:'Maker, artist or workshop'},{key:'category',label:'Object type',placeholder:'Furniture, pottery, jewellery…'},{key:'period',label:'Period / date',placeholder:'Era or date'},{key:'material',label:'Material',placeholder:'Wood, ceramic, metal…'},{key:'condition',label:'Condition',type:'select',options:COMMON.find(f=>f.key==='condition')!.options},{key:'damage',label:'Damage / restoration',placeholder:'Cracks, repairs, missing parts…'}] },
  fossils: { name:'Fossil Flipper', specialistId:'fossils', description:'Record specimen type, locality if known, dimensions and visible condition.', icon:FlaskConical, fields:[{key:'category',label:'Specimen type',placeholder:'Fossil, mineral, shell…'},{key:'period',label:'Geological period',placeholder:'If known'},{key:'locality',label:'Locality / provenance',placeholder:'Only if known and documented'},{key:'material',label:'Material',placeholder:'Mineral / matrix'},{key:'condition',label:'Condition',type:'select',options:['Excellent','Good','Fair','Fragmentary','Restored','Unverified']}] },
  beauty: { name:'Beauty Flipper', specialistId:'beauty', description:'Record product identity, volume, packaging and expiry/seal status.', icon:Sparkles, fields:[{key:'brand',label:'Brand',placeholder:'Brand'},{key:'category',label:'Product type',placeholder:'Fragrance, skincare, makeup…'},{key:'model',label:'Product / variant',placeholder:'Product name / shade / scent'},{key:'size',label:'Volume / size',placeholder:'ml / g / unit count'},{key:'batch_code',label:'Batch / lot code',placeholder:'If visible'},{key:'condition',label:'Packaging / seal',type:'select',options:['Sealed new','Open box','Opened / used','Packaging damaged','Expired / unknown']}] },
  tech: { name:'Tech Flipper', specialistId:'tech', description:'Record model, key specifications, testing status and faults.', icon:Monitor, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model / SKU',placeholder:'Model number'},{key:'category',label:'Device type',placeholder:'Phone, console, laptop…'},{key:'specs',label:'Key specs',placeholder:'Storage, RAM, generation…'},{key:'condition',label:'Test status',type:'select',options:['Tested working','Partially tested','Untested','Faulty','Parts only']},{key:'issues',label:'Faults / accessories missing',placeholder:'Screen, battery, charger…'}] },
  tools: { name:'Tool Flipper', specialistId:'tools', description:'Record manufacturer, model, power system and tested condition.', icon:Hammer, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model / SKU',placeholder:'Model number'},{key:'category',label:'Tool type',placeholder:'Drill, saw, garden tool…'},{key:'power_source',label:'Power source',placeholder:'Mains, battery platform, petrol…'},{key:'condition',label:'Test status',type:'select',options:['Tested working','Partially tested','Untested','Faulty','Parts only']},{key:'issues',label:'Faults / missing accessories',placeholder:'Battery, charger, guards…'}] },
};
export default function NicheCapture() {
  const { niche = 'coins' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const insert = useInsert('items');
  const config = useMemo(() => CONFIG[niche] || CONFIG.coins, [niche]);
  const Icon = config.icon;
  const [form, setForm] = useState<Record<string,string>>({status:'review'});
  const setF = (key:string,value:string) => setForm(p=>({...p,[key]:value}));
  const f = (key:string) => form[key] || '';
  const save = async () => {
    if (niche === 'coins') { navigate('/identify'); return; }
    if (!f('title').trim()) { toast.error('Enter an item title before saving'); return; }
    if (!user?.id) { toast.error('Please sign in before creating inventory'); return; }
    const sb = getSupabaseClient() || await getSupabaseClientAsync();
    if (!sb) { toast.error('Backend not connected'); return; }
    const { data: tenants, error } = await sb.from('tenants').select('id').order('created_at',{ascending:true}).limit(1);
    if (error || !tenants?.[0]?.id) { toast.error(error?.message || 'No workspace found for this account'); return; }
    const attributes:Record<string,string> = {};
    config.fields.forEach(field => { if (f(field.key).trim()) attributes[field.key]=f(field.key).trim(); });
    const row:Record<string,unknown> = {
      tenant_id:tenants[0].id,
      canonical_title:f('title').trim(),
      description:f('description').trim(),
      specialist_id:config.specialistId,
      status:'review',
      disposition_decision:'pending',
      condition:f('condition'),
      attributes,
      acquired_cost:f('cost').trim() ? Number(f('cost')) : null,
      valuation_mid:f('valuation').trim() ? Number(f('valuation')) : null,
      expected_selling_price:f('sale_price').trim() ? Number(f('sale_price')) : null,
      media:[],
      warnings:['Manual review required: no verified niche-specific AI identification has been run.'],
      tags:[config.specialistId],
    };
    insert.mutate(row,{onSuccess:(saved)=>{
      toast.success('Saved to specialist inventory — review required');
      const id=(saved as Record<string,unknown>)?.id as string;
      navigate(id?'/inventory/'+id:'/inventory');
    },onError:e=>toast.error(e.message)});
  };
  return <div className="space-y-4 animate-fade-in max-w-4xl" style={{'--workspace-accent':'#ff557e'} as React.CSSProperties}>
    <div className="flex items-center gap-3"><Link to={'/workspace/'+niche} className="btn-ghost py-1.5 px-2"><ArrowLeft className="w-4 h-4"/></Link><div className="flex-1"><h1 className="page-title">{config.name}: scan & assess</h1><p className="page-subtitle">Capture item details, review them, then save to the specialist inventory.</p></div></div>
    <div className="swish-card p-4 flex gap-3 items-start"><Icon className="w-6 h-6 swish-gold shrink-0 mt-1"/><div><h2 className="font-semibold">{config.name} workflow</h2><p className="text-sm text-muted-foreground mt-1">{config.description}</p>{niche==='coins'&&<p className="text-xs mt-2">Coin Flipper keeps its dedicated obverse/reverse identification workflow.</p>}</div></div>
    <div className="swish-card p-4 space-y-4"><h2 className="font-semibold">1. Identify the item</h2><p className="text-xs text-muted-foreground">This form records evidence and user-confirmed details. It does not claim an AI identification has run.</p>
      <div><label className="text-xs text-muted-foreground">Item title *</label><input className="input-field mt-1" value={f('title')} onChange={e=>setF('title',e.target.value)} placeholder={niche==='clothing'?'e.g. Vintage Nike track jacket size L':'Item title'}/></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{config.fields.map(field=><div key={field.key}><label className="text-xs text-muted-foreground">{field.label}</label>{field.type==='select'?<select className="input-field mt-1" value={f(field.key)} onChange={e=>setF(field.key,e.target.value)}><option value="">Select…</option>{(field.options||[]).map(option=><option key={option} value={option}>{option}</option>)}</select>:<input className="input-field mt-1" type={field.type||'text'} value={f(field.key)} onChange={e=>setF(field.key,e.target.value)} placeholder={field.placeholder||field.label}/>}</div>)}</div>
      <div><label className="text-xs text-muted-foreground">Description / notes</label><textarea className="input-field mt-1" rows={4} value={f('description')} onChange={e=>setF('description',e.target.value)} placeholder="Visible details, label text, measurements, included accessories and evidence…"/></div>
    </div>
    <div className="swish-card p-4 space-y-3"><h2 className="font-semibold">2. Purchase and value details</h2><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['cost','Purchase cost (£)'],['valuation','Estimated value (£)'],['sale_price','Planned listing price (£)']].map(([key,label])=><div key={key}><label className="text-xs text-muted-foreground">{label}</label><input className="input-field mt-1" type="number" min="0" step="0.01" value={f(key)} onChange={e=>setF(key,e.target.value)}/></div>)}</div><p className="text-xs text-muted-foreground">Values entered here are user estimates, not verified sold-comparable valuations.</p></div>
    <div className="flex flex-wrap justify-between gap-3"><Link to="/inventory" className="btn-secondary"><Package className="w-4 h-4"/>Inventory</Link><button className="btn-primary" onClick={save} disabled={insert.isPending}><Save className="w-4 h-4"/>{insert.isPending?'Saving…':niche==='coins'?'Open coin capture':'Save for review'}</button></div>
  </div>;
}
