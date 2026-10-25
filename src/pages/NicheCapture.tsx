import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInsert } from '@/hooks/useSupabaseQuery';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Package, Shirt, Bike, Coins, Wrench, Gamepad2, Gem, FlaskConical, Monitor, Hammer, Sparkles, Camera, CheckCircle2, ImagePlus } from 'lucide-react';
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
  const [clothingPhotos, setClothingPhotos] = useState<Record<string, File | null>>({ brand: null, garment: null, detail: null });
  const [clothingPreviews, setClothingPreviews] = useState<Record<string, string>>({});
  const [identifyingClothing, setIdentifyingClothing] = useState(false);
  const [clothingIdentified, setClothingIdentified] = useState(false);
  const [clothingAiResult, setClothingAiResult] = useState<Record<string, unknown> | null>(null);
  const [clothingAiError, setClothingAiError] = useState('');
  const setF = (key:string,value:string) => setForm(p=>({...p,[key]:value}));
  const f = (key:string) => form[key] || '';
  const addClothingPhoto = (slot: string, file?: File) => {
    if (!file) return;
    setClothingPhotos(previous => ({ ...previous, [slot]: file }));
    setClothingPreviews(previous => {
      if (previous[slot]) URL.revokeObjectURL(previous[slot]);
      return { ...previous, [slot]: URL.createObjectURL(file) };
    });
    setClothingIdentified(false);
    setClothingAiResult(null);
    setClothingAiError('');
  };
  const identifyClothing = async () => {
    if (!clothingPhotos.brand) { toast.error('Add the brand-label photo first'); return; }
    setIdentifyingClothing(true);
    setClothingAiError('');
    try {
      const labels = [['brand','Brand label'],['garment','Garment front'],['detail','Care label / detail / flaw']] as const;
      const selected = labels.filter(([key]) => clothingPhotos[key]);
      const images = await Promise.all(selected.map(async ([key]) => {
        const file = clothingPhotos[key]!;
        const image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read the selected photo'));
          reader.readAsDataURL(file);
        });
        return image;
      }));
      const sb = getSupabaseClient() || await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected. Please reload and try again.');
      const { data, error } = await sb.functions.invoke('swish-identify', {
        body: {
          images,
          imageLabels: selected.map(([, label]) => label),
          specialistId: 'clothing',
          acquisitionContext: 'Threads Flip fashion identification. Read the brand label exactly, identify garment type, care/composition label, tagged size, gender category, era evidence, colour/style, visible condition and authentication risks. Do not guess brand or authenticity from style alone.',
          knownAttributes: { existingAttributes: { niche: 'clothing', photoSlots: selected.map(([, label]) => label) } },
        },
      });
      if (error) throw new Error(error.message || 'Clothing identification request failed');
      const result = (data?.identification || data?.result?.identification || data?.result || data) as Record<string, unknown>;
      if (!result || typeof result !== 'object' || !Object.keys(result).length) throw new Error('The clothing identification engine returned no result.');
      setClothingAiResult(result);
      const attrs = (result.attributesConfirmed || result.attributes || result.attributesInferred || {}) as Record<string, unknown>;
      const setIfPresent = (formKey: string, ...values: unknown[]) => {
        const value = values.find(v => v !== undefined && v !== null && String(v).trim());
        if (value !== undefined) setF(formKey, String(value));
      };
      setIfPresent('title', result.canonicalTitle, result.title);
      setIfPresent('brand', attrs.brand, result.brand);
      setIfPresent('category', attrs.category, attrs.garmentType, result.garmentType);
      setIfPresent('size', attrs.size, attrs.taggedSize, result.size);
      setIfPresent('colour', attrs.colour, attrs.color, result.colour);
      setIfPresent('material', attrs.material, attrs.fabric, result.material);
      setIfPresent('style', attrs.style, attrs.era, result.style);
      setIfPresent('condition', result.condition, attrs.condition);
      setIfPresent('flaws', attrs.flaws, attrs.visibleFlaws, result.conditionNotes);
      const evidence = [
        ...(Array.isArray(result.evidenceSupporting) ? result.evidenceSupporting : []),
        ...(Array.isArray(result.missingInformation) ? result.missingInformation.map((v: unknown) => 'Missing information: '+String(v)) : []),
        ...(Array.isArray(result.warnings) ? result.warnings : []),
      ].map(String);
      if (evidence.length) setF('description', [f('description'), ...evidence].filter(Boolean).join('\n'));
      setClothingIdentified(true);
      toast.success('Threads Flip identification complete — review the suggested details.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Identification failed. Please try again.';
      setClothingAiError(message);
      toast.error(message);
    } finally {
      setIdentifyingClothing(false);
    }
  };
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
    insert.mutate(row,{onSuccess:async(saved)=>{
      const id=(saved as Record<string,unknown>)?.id as string;
      if (niche === 'clothing' && id) {
        const photoSlots = [['brand','brand-label'],['garment','garment-front'],['detail','care-label-detail']] as const;
        const mediaUrls: string[] = [];
        for (const [slot, label] of photoSlots) {
          const file = clothingPhotos[slot];
          if (!file) continue;
          const path = `${id}/${label}-${Date.now()}.jpg`;
          const { error: uploadError } = await sb.storage.from('item-images').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
          if (uploadError) { toast.error(`Item saved, but ${label} photo upload failed: ${uploadError.message}`); continue; }
          const { data: publicUrl } = sb.storage.from('item-images').getPublicUrl(path);
          if (publicUrl?.publicUrl) mediaUrls.push(publicUrl.publicUrl);
        }
        if (mediaUrls.length) {
          const { error: mediaError } = await sb.from('items').update({ media: mediaUrls }).eq('id',id).eq('tenant_id',tenants[0].id);
          if (mediaError) toast.error('Item saved, but photo links could not be attached: '+mediaError.message);
        }
      }
      toast.success(clothingIdentified ? 'Threads Flip item saved for review' : 'Saved to specialist inventory — review required');
      navigate(id?'/inventory/'+id:'/inventory');
    },onError:e=>toast.error(e.message)});
  };
  if (niche === 'clothing') {
    const photoSlots = [
      { key: 'brand', title: 'Brand Label', required: true, hint: 'Inside neck or waist label — required' },
      { key: 'garment', title: 'Garment Front', required: false, hint: 'Full front view of the item' },
      { key: 'detail', title: 'Care Label / Detail / Flaw', required: false, hint: 'Composition, damage, hardware or distinctive details' },
    ];
    return <div className="threads-page min-h-screen -mx-4 -mt-4 px-4 pb-8" style={{background:'#0C080C',color:'#F5EEF5'}}>
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b px-4 py-4" style={{background:'#0C080C',borderColor:'#301830'}}>
        <Link to="/workspace/clothing" aria-label="Back to Threads Flip" className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{borderColor:'#6D124A',background:'#250014',color:'#E91E8C'}}><ArrowLeft/></Link>
        <div className="min-w-0 flex-1"><div className="text-xl font-extrabold tracking-tight"><span>Threads</span> <span style={{color:'#E91E8C'}}>Flip</span> <span className="ml-2 rounded-full px-2 py-1 text-[10px] font-black tracking-widest" style={{background:'#E91E8C',color:'#0C080C'}}>PRO</span></div><p className="text-[10px] tracking-[.2em]" style={{color:'#9A7090'}}>IDENTIFY · VALUE · STYLE · SELL</p></div>
        <Shirt className="h-7 w-7 shrink-0" style={{color:'#E91E8C'}}/>
      </header>
      <nav className="sticky top-[76px] z-10 -mx-4 flex gap-2 overflow-x-auto border-b px-4 py-3" style={{background:'#120B12',borderColor:'#301830'}}>
        {['Identify','Value','Style','Sell','Insights'].map((label,index)=><button type="button" key={label} onClick={()=>index===0?undefined:navigate(index===1?'/opportunities':index===3?'/listings':'/insights')} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold" style={{background:index===0?'#250014':'transparent',color:index===0?'#E91E8C':'#9A7090'}}>{label}</button>)}
      </nav>
      <main className="mx-auto w-full max-w-3xl space-y-5 py-5">
        <section><p className="text-xs font-bold uppercase tracking-[.22em]" style={{color:'#E91E8C'}}>Threads Flip · Identify</p><h1 className="mt-2 text-3xl font-extrabold">Identify your item</h1><p className="mt-2 leading-relaxed" style={{color:'#9A7090'}}>Photograph the label and garment. Threads Flip will analyse the evidence and suggest details for you to review.</p></section>
        <section className="space-y-4 rounded-3xl border p-4 sm:p-5" style={{background:'#160E16',borderColor:'#301830'}}>
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Photos</h2><span className="text-sm" style={{color:'#E91E8C'}}>{Object.values(clothingPhotos).filter(Boolean).length} of 3 added</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {photoSlots.map(slot=><div key={slot.key} className={slot.key==='brand'?'sm:col-span-2':''}>
              <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center" style={{borderColor:clothingPhotos[slot.key]?'#E91E8C':'#58304F',background:'#1B111B'}}>
                {clothingPreviews[slot.key]?<img src={clothingPreviews[slot.key]} alt={slot.title} className="max-h-60 w-full rounded-xl object-contain"/>:<Camera className="mb-3 h-10 w-10" style={{color:'#E91E8C'}}/>}
                <span className="mt-2 font-semibold">{slot.title}</span><span className="mt-1 text-xs font-semibold tracking-wider" style={{color:slot.required?'#FF3DAA':'#9A7090'}}>{slot.required?'REQUIRED':'OPTIONAL'}</span><span className="mt-2 text-sm" style={{color:'#9A7090'}}>{slot.hint}</span>
                <span className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold" style={{background:'#E91E8C',color:'#0C080C'}}><ImagePlus className="h-4 w-4"/>{clothingPhotos[slot.key]?'Change photo':'Take photo / choose file'}</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e=>addClothingPhoto(slot.key,e.target.files?.[0])}/>
              </label>
            </div>)}
          </div>
          <p className="rounded-2xl p-3 text-sm leading-relaxed" style={{background:'#250014',color:'#FF3DAA'}}>Tip: photograph the brand label flat, well-lit and in focus. The care label helps identify fabric and era.</p>
          <button type="button" onClick={identifyClothing} disabled={identifyingClothing||!clothingPhotos.brand} className="w-full rounded-full py-4 font-extrabold disabled:opacity-40" style={{background:'#E91E8C',color:'#0C080C'}}>{identifyingClothing?'Identifying with Threads Flip AI…':'✦ Identify Item'}</button>
          {clothingAiError&&<p role="alert" className="text-sm text-red-400">{clothingAiError}</p>}
        </section>
        <section className="space-y-4 rounded-3xl border p-4 sm:p-5" style={{background:'#160E16',borderColor:clothingIdentified?'#E91E8C':'#301830'}}>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" style={{color:'#E91E8C'}}/><h2 className="text-lg font-bold">{clothingIdentified?'2. Review AI suggestions':'2. Item details'}</h2></div>
          <p className="text-sm" style={{color:'#9A7090'}}>{clothingIdentified?'Check and correct the AI suggestions before saving. Identification is not proof of designer authenticity.':'You can enter details manually, or identify from a brand-label photo to prefill these fields.'}</p>
          <div><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>Item title *</label><input className="input-field mt-1" value={f('title')} onChange={e=>setF('title',e.target.value)} placeholder="e.g. Vintage Nike track jacket size L"/></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{config.fields.map(field=><div key={field.key}><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>{field.label}</label>{field.type==='select'?<select className="input-field mt-1" value={f(field.key)} onChange={e=>setF(field.key,e.target.value)}><option value="">Select…</option>{(field.options||[]).map(option=><option key={option} value={option}>{option}</option>)}</select>:<input className="input-field mt-1" type={field.type||'text'} value={f(field.key)} onChange={e=>setF(field.key,e.target.value)} placeholder={field.placeholder||field.label}/>}</div>)}</div>
          <div><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>Description / evidence</label><textarea className="input-field mt-1" rows={4} value={f('description')} onChange={e=>setF('description',e.target.value)} placeholder="Visible details, label text, condition notes…"/></div>
          {clothingAiResult&&<details className="text-sm" style={{color:'#9A7090'}}><summary className="cursor-pointer">View identification evidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(clothingAiResult,null,2)}</pre></details>}
        </section>
        <section className="space-y-3 rounded-3xl border p-4 sm:p-5" style={{background:'#160E16',borderColor:'#301830'}}>
          <h2 className="text-lg font-bold">3. Purchase and value details</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['cost','Purchase cost (£)'],['valuation','Estimated value (£)'],['sale_price','Planned listing price (£)']].map(([key,label])=><div key={key}><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>{label}</label><input className="input-field mt-1" type="number" min="0" step="0.01" value={f(key)} onChange={e=>setF(key,e.target.value)}/></div>)}</div><p className="text-xs" style={{color:'#9A7090'}}>Values entered here are estimates, not verified sold-comparable valuations.</p>
        </section>
        <div className="flex flex-wrap justify-between gap-3"><Link to="/inventory" className="btn-secondary"><Package className="h-4 w-4"/>Wardrobe / Inventory</Link><button className="btn-primary" onClick={save} disabled={insert.isPending}><Save className="h-4 w-4"/>{insert.isPending?'Saving…':'Save item for review'}</button></div>
      </main>
    </div>;
  }
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
