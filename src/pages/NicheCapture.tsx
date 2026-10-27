import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInsert } from '@/hooks/useSupabaseQuery';
import { getSupabaseClient, getSupabaseClientAsync } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentTenantId } from '@/hooks/useCurrentTenantId';
import { getDefaultSpecialistForNiche } from '@/lib/niche';
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
  clothing: { name:'Threads Flip', specialistId:'clothing', description:'Photograph the labels and garment. Threads Flip fills in the details for you to review and edit.', icon:Shirt, fields:[{key:'brand',label:'Brand',placeholder:'Read from the garment label'},{key:'category',label:'Garment type',placeholder:'Jacket, dress, trainers, jeans…'},{key:'size',label:'Tagged size',placeholder:'Exact size from label'},{key:'gender_category',label:'Gender category',placeholder:'Menswear, womenswear, unisex…'},{key:'colour',label:'Colour / pattern',placeholder:'Colour and pattern from photo'},{key:'material',label:'Material / fabric composition',placeholder:'From care label where legible'},{key:'country_manufacture',label:'Country of manufacture',placeholder:'From label if visible'},{key:'style',label:'Style / era',placeholder:'Era only where supported by evidence'},{key:'era_evidence',label:'Era evidence',placeholder:'Label, care symbols, construction…'},{key:'condition',label:'Condition assessment',placeholder:'AI assessment from visible evidence'},{key:'flaws',label:'Flaws / wear',placeholder:'Stains, holes, pilling, repairs…'},{key:'authenticity_risk',label:'Authentication risk',placeholder:'Low / medium / high / not applicable'},{key:'authenticity_risk_reason',label:'Authentication evidence',placeholder:'Visible markers and uncertainties'},{key:'selling_points',label:'Key selling points',placeholder:'Evidence-backed features'}] },
  bikes: { name:'Bike Flipper', specialistId:'bikes', description:'Capture the bicycle or component identity, fit and mechanical condition.', icon:Bike, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model',placeholder:'Model / year'},{key:'category',label:'Bike type / component',placeholder:'Road, MTB, hybrid, frame…'},{key:'frame_size',label:'Frame size',placeholder:'e.g. 54 cm / M / 18 in'},{key:'wheel_size',label:'Wheel size',placeholder:'e.g. 700c / 29 in'},{key:'material',label:'Frame / material',placeholder:'Aluminium, carbon, steel…'},{key:'condition',label:'Mechanical condition',type:'select',options:['New','Rides well','Needs service','Needs repair','Parts only']},{key:'issues',label:'Issues / missing parts',placeholder:'Brakes, gears, cracks, missing parts…'}] },
  mx: { name:'Flipper MX', specialistId:'mx', description:'Record machine identity and condition before estimating repair costs or resale.', icon:Wrench, fields:[{key:'brand',label:'Make',placeholder:'Honda, Yamaha, KTM…'},{key:'model',label:'Model / engine size',placeholder:'Model and cc'},{key:'category',label:'Item type',placeholder:'Dirt bike, engine, part…'},{key:'year',label:'Year',placeholder:'Year'},{key:'condition',label:'Running condition',type:'select',options:['Runs well','Runs with issues','Non-runner','Unverified','Parts only']},{key:'hours',label:'Engine hours / mileage',placeholder:'Hours or mileage'},{key:'issues',label:'Known faults',placeholder:'Mechanical faults, damage, missing parts…'}] },
  cards: { name:'Card Flipper', specialistId:'cards', description:'Record set, card number, edition and visible condition before grading or valuation.', icon:Gamepad2, fields:[{key:'brand',label:'Game / publisher',placeholder:'Pokémon, MTG, sports league…'},{key:'category',label:'Set / series',placeholder:'Set or series name'},{key:'card_number',label:'Card number',placeholder:'Collector number'},{key:'edition',label:'Edition / variant',placeholder:'1st edition, holo, parallel…'},{key:'condition',label:'Visible condition',type:'select',options:['Near Mint','Lightly Played','Moderately Played','Heavily Played','Damaged','Unverified']}] },
  antiques: { name:'Antique Flipper', specialistId:'antiques', description:'Record maker, period, materials and visible damage before research.', icon:Gem, fields:[{key:'brand',label:'Maker / artist',placeholder:'Maker, artist or workshop'},{key:'category',label:'Object type',placeholder:'Furniture, pottery, jewellery…'},{key:'period',label:'Period / date',placeholder:'Era or date'},{key:'material',label:'Material',placeholder:'Wood, ceramic, metal…'},{key:'condition',label:'Condition',type:'select',options:COMMON.find(f=>f.key==='condition')!.options},{key:'damage',label:'Damage / restoration',placeholder:'Cracks, repairs, missing parts…'}] },
  fossils: { name:'Fossil Flipper', specialistId:'fossils', description:'Record specimen type, locality if known, dimensions and visible condition.', icon:FlaskConical, fields:[{key:'category',label:'Specimen type',placeholder:'Fossil, mineral, shell…'},{key:'period',label:'Geological period',placeholder:'If known'},{key:'locality',label:'Locality / provenance',placeholder:'Only if known and documented'},{key:'material',label:'Material',placeholder:'Mineral / matrix'},{key:'condition',label:'Condition',type:'select',options:['Excellent','Good','Fair','Fragmentary','Restored','Unverified']}] },
  beauty: { name:'Beauty Flipper', specialistId:'beauty', description:'Record product identity, volume, packaging and expiry/seal status.', icon:Sparkles, fields:[{key:'brand',label:'Brand',placeholder:'Brand'},{key:'category',label:'Product type',placeholder:'Fragrance, skincare, makeup…'},{key:'model',label:'Product / variant',placeholder:'Product name / shade / scent'},{key:'size',label:'Volume / size',placeholder:'ml / g / unit count'},{key:'batch_code',label:'Batch / lot code',placeholder:'If visible'},{key:'condition',label:'Packaging / seal',type:'select',options:['Sealed new','Open box','Opened / used','Packaging damaged','Expired / unknown']}] },
  tech: { name:'Tech Flipper', specialistId:'tech', description:'Record model, key specifications, testing status and faults.', icon:Monitor, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model / SKU',placeholder:'Model number'},{key:'category',label:'Device type',placeholder:'Phone, console, laptop…'},{key:'specs',label:'Key specs',placeholder:'Storage, RAM, generation…'},{key:'condition',label:'Test status',type:'select',options:['Tested working','Partially tested','Untested','Faulty','Parts only']},{key:'issues',label:'Faults / accessories missing',placeholder:'Screen, battery, charger…'}] },
  tools: { name:'Tool Flipper', specialistId:'tools', description:'Record manufacturer, model, power system and tested condition.', icon:Hammer, fields:[{key:'brand',label:'Brand',placeholder:'Manufacturer'},{key:'model',label:'Model / SKU',placeholder:'Model number'},{key:'category',label:'Tool type',placeholder:'Drill, saw, garden tool…'},{key:'power_source',label:'Power source',placeholder:'Mains, battery platform, petrol…'},{key:'condition',label:'Test status',type:'select',options:['Tested working','Partially tested','Untested','Faulty','Parts only']},{key:'issues',label:'Faults / missing accessories',placeholder:'Battery, charger, guards…'}] },
  surplus_flip: { name:'Surplus Flip', specialistId:'surplus_flip', description:'Identify bulk and surplus stock from photos or manifests, then review product details and quantities.', icon:Package, fields:[{key:'brand',label:'Brand / manufacturer',placeholder:'Brand if visible'},{key:'category',label:'Product type',placeholder:'Product category'},{key:'model',label:'Model / SKU',placeholder:'SKU or model number'},{key:'quantity',label:'Quantity',type:'number'},{key:'condition',label:'Condition',type:'select',options:['New','New other','Used - Like New','Used - Good','Used - Acceptable','For parts / repair']},{key:'lot_reference',label:'Lot / manifest reference',placeholder:'Manifest or batch reference'},{key:'issues',label:'Damage / missing items',placeholder:'Visible faults or missing components…'}] },
  generic: { name:'SWISH Specialist', specialistId:'curiosities_collectibles', description:'Capture evidence and review the item details before saving.', icon:Package, fields:COMMON },
};
export default function NicheCapture() {
  const { niche: routeNiche = 'coins' } = useParams();
  // Normalise every supported entry alias before selecting a workflow. A
  // Threads route must never fall through to the coin scanner just because
  // its URL uses a product alias rather than the internal specialist ID.
  const niche = ['clothing', 'threads', 'threads-flip', 'threads_flip', 'clothes'].includes(routeNiche)
    ? 'clothing'
    : ['bikes', 'bicycle', 'bicycles'].includes(routeNiche)
      ? 'bikes'
      : ['mx', 'motocross'].includes(routeNiche)
        ? 'mx'
        : ['surplus', 'surplus-flip', 'surplus_flip'].includes(routeNiche)
          ? 'surplus_flip'
          : routeNiche;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useCurrentTenantId();
  const insert = useInsert('items');
  const config = useMemo(() => CONFIG[niche] || CONFIG.generic, [niche]);
  const Icon = config.icon;
  const [form, setForm] = useState<Record<string,string>>({status:'review'});
  const [clothingPhotos, setClothingPhotos] = useState<Record<string, File | null>>({ brand: null, garment: null, detail: null });
  const clothingFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const clothingCameraInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [clothingPreviews, setClothingPreviews] = useState<Record<string, string>>({});
  const [identifyingClothing, setIdentifyingClothing] = useState(false);
  const [clothingIdentified, setClothingIdentified] = useState(false);
  const [clothingAiResult, setClothingAiResult] = useState<Record<string, unknown> | null>(null);
  const [clothingAiError, setClothingAiError] = useState('');
  const [generatingClothingCopy, setGeneratingClothingCopy] = useState<'title' | 'description' | null>(null);
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
        const original = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read the selected photo'));
          reader.readAsDataURL(file);
        });
        // Match the mobile app's payload discipline: resize to max 1024px and JPEG
        // quality 0.65 before sending images to the Edge Function.
        const image = await new Promise<string>((resolve, reject) => {
          const source = new Image();
          source.onload = () => {
            const scale = Math.min(1, 1024 / Math.max(source.naturalWidth, source.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) { reject(new Error('Photo compression is unavailable in this browser')); return; }
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          };
          source.onerror = () => reject(new Error('Could not prepare the selected photo for identification'));
          source.src = original;
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
      // The shared SWISH identification contract returns clothing-specific fields
      // separately from generic confirmed/inferred attributes. Merge all supported
      // shapes so Threads Flip gets the same specialist data as the mobile app.
      const object = (value: unknown): Record<string, unknown> =>
        value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
      const attrs = {
        ...object(result.attributesInferred),
        ...object(result.attributes),
        ...object(result.attributesConfirmed),
        ...object(result.clothingFields),
        ...object(result.garmentFields),
      };
      const usable = (value: unknown) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') {
          const text = value.trim();
          return !!text && !/^(not established|not legible|unknown|n\/a|none)$/i.test(text);
        }
        return typeof value === 'number' || typeof value === 'boolean';
      };
      const setIfPresent = (formKey: string, ...values: unknown[]) => {
        const value = values.find(usable);
        if (value !== undefined) setF(formKey, String(value));
      };
      setIfPresent('title', result.canonicalTitle, result.title, attrs.canonicalTitle);
      setIfPresent('brand', attrs.brand, attrs.brand_label, attrs.labelBrand, result.brand);
      setIfPresent('category', attrs.garmentType, attrs.garment_type, attrs.category, attrs.objectType, result.garmentType);
      setIfPresent('size', attrs.labelledSize, attrs.labelled_size, attrs.taggedSize, attrs.tagged_size, attrs.size, result.size);
      setIfPresent('gender_category', attrs.genderCategory, attrs.gender_category, result.genderCategory);
      setIfPresent('colour', attrs.colourDescription, attrs.colour_description, attrs.colour, attrs.color, attrs.colour_pattern, attrs.color_description, result.colour);
      setIfPresent('material', attrs.fiberComposition, attrs.fiber_composition, attrs.fibreComposition, attrs.fibre_composition, attrs.primaryMaterial, attrs.material, attrs.fabric, attrs.composition, result.material);
      setIfPresent('country_manufacture', attrs.countryManufacture, attrs.country_manufacture, attrs.country_of_manufacture);
      setIfPresent('style', attrs.eraEstimate, attrs.era_estimate, attrs.style, attrs.era, result.style);
      setIfPresent('era_evidence', attrs.eraEvidence, attrs.era_evidence);
      setIfPresent('condition', result.condition, attrs.condition, result.conditionGrade, result.conditionNotes);
      const damage = Array.isArray(attrs.visibleDamage) ? attrs.visibleDamage.join('; ') : attrs.visibleDamage;
      setIfPresent('flaws', attrs.flaws, attrs.visibleFlaws, attrs.damage_notes, damage, result.conditionNotes);
      setIfPresent('authenticity_risk', attrs.authenticityRiskLevel, attrs.authenticity_risk_level);
      setIfPresent('authenticity_risk_reason', attrs.authenticityRiskReason, attrs.authenticity_risk_reason, attrs.authenticityMarkers, attrs.authenticity_markers);
      const sellingPoints = Array.isArray(attrs.keySellingPoints) ? attrs.keySellingPoints.join('; ') : attrs.keySellingPoints;
      setIfPresent('selling_points', sellingPoints, attrs.selling_points);
      const gender = attrs.genderCategory ?? attrs.gender_category;
      if (usable(gender)) setIfPresent('description', [f('description'), 'Gender category: ' + String(gender)].filter(Boolean).join('\n'));
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
  const generateClothingCopy = async (kind: 'title' | 'description') => {
    if (!clothingIdentified || !clothingAiResult) {
      toast.error('Identify the garment photos first so AI has evidence to work from.');
      return;
    }
    setGeneratingClothingCopy(kind);
    setClothingAiError('');
    try {
      const labels = [['brand','Brand label'],['garment','Garment front'],['detail','Care label / detail / flaw']] as const;
      const selected = labels.filter(([key]) => clothingPhotos[key]);
      const images = await Promise.all(selected.map(async ([key]) => {
        const file = clothingPhotos[key]!;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read the selected photo'));
          reader.readAsDataURL(file);
        });
        return await new Promise<string>((resolve, reject) => {
          const source = new Image();
          source.onload = () => {
            const scale = Math.min(1, 1024 / Math.max(source.naturalWidth, source.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) { reject(new Error('Photo processing is unavailable in this browser')); return; }
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          };
          source.onerror = () => reject(new Error('Could not prepare a photo for AI copy generation'));
          source.src = dataUrl;
        });
      }));
      const sb = getSupabaseClient() || await getSupabaseClientAsync();
      if (!sb) throw new Error('SWISH backend is not connected. Please reload and try again.');
      const attributes = Object.fromEntries(config.fields.map(field => [field.key, f(field.key)]).filter((entry) => String(entry[1] ?? '').trim()));
      const { data, error } = await sb.functions.invoke('swish-identify', {
        body: {
          images,
          imageLabels: selected.map(([, label]) => label),
          specialistId: 'clothing',
          outputMode: 'listing_copy',
          acquisitionContext: kind === 'title'
            ? 'Threads Flip eBay listing-copy mode. Generate a concise, searchable eBay UK title of no more than 80 characters using only the supplied garment photos and attributes. Include brand, garment type, supported gender category, colour and tagged size where known. Do not invent details or claim authenticity. Put the requested output in listingCopy.title.'
            : 'Threads Flip eBay listing-copy mode. Write a ready-to-use factual eBay UK description using the garment photos and supplied attributes. Include garment type, brand, tagged size, colour, material only when evidenced, condition and visible flaws. Omit unknown facts and never claim designer authenticity. Put the requested output in listingCopy.description.',
          knownAttributes: { existingAttributes: { ...attributes, niche: 'clothing', currentTitle: f('title'), currentDescription: f('description'), requestedOutput: kind } },
        },
      });
      if (error) throw new Error(error.message || 'AI listing copy generation failed');
      const result = (data?.identification || data?.result?.identification || data?.result || data) as Record<string, unknown>;
      const listingCopy = result.listingCopy && typeof result.listingCopy === 'object'
        ? result.listingCopy as Record<string, unknown>
        : {};
      const textValue = kind === 'title'
        ? listingCopy.title ?? result.canonicalTitle ?? result.title ?? (result.attributes as Record<string, unknown> | undefined)?.canonicalTitle
        : listingCopy.description ?? result.description ?? result.listingDescription ?? result.listing_description;
      if (typeof textValue === 'string' && textValue.trim()) {
        setF(kind, textValue.trim());
        toast.success(kind === 'title' ? 'AI listing title generated — check and edit it.' : 'AI listing description generated — check and edit it.');
      } else if (kind === 'title') {
        const parts = [f('brand'), f('category'), f('style'), f('colour'), f('size')].filter(Boolean);
        if (!parts.length) throw new Error('AI did not return a title. Check the garment details and try again.');
        setF('title', parts.join(' ').slice(0, 80));
        toast.success('Created a title from the identified garment details. Please review it.');
      } else {
        const parts = [
          f('title'),
          f('brand') ? 'Brand: ' + f('brand') : '',
          f('category') ? 'Garment: ' + f('category') : '',
          f('size') ? 'Tagged size: ' + f('size') : '',
          f('colour') ? 'Colour: ' + f('colour') : '',
          f('material') ? 'Material: ' + f('material') : '',
          f('condition') ? 'Condition: ' + f('condition') : '',
          f('flaws') ? 'Flaws / wear: ' + f('flaws') : '',
        ].filter(Boolean);
        if (parts.length < 2) throw new Error('AI did not return a description. Add or confirm a few details and try again.');
        setF('description', parts.join('\n\n'));
        toast.success('Created a draft from the identified details. Please review it.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate listing copy.';
      setClothingAiError(message);
      toast.error(message);
    } finally {
      setGeneratingClothingCopy(null);
    }
  };
  const save = async () => {
    if (niche === 'coins') { navigate('/identify'); return; }
    if (niche === 'clothing' && !clothingIdentified) { toast.error('Photograph the brand label and run Threads Flip identification before saving'); return; }
    if (!f('title').trim()) { toast.error('The AI needs to identify an item title before saving. Run identification, then review or edit the title.'); return; }
    if (!user?.id) { toast.error('Please sign in before creating inventory'); return; }
    if (!tenantId || tenantLoading) { toast.error('Your SWISH workspace is not ready.'); return; }
    const sb = getSupabaseClient() || await getSupabaseClientAsync();
    if (!sb) { toast.error('Backend not connected'); return; }
    const attributes:Record<string,string> = {};
    config.fields.forEach(field => { if (f(field.key).trim()) attributes[field.key]=f(field.key).trim(); });
    const row:Record<string,unknown> = {
      tenant_id:tenantId,
      canonical_title:f('title').trim(),
      description:f('description').trim(),
      specialist_id: niche === 'bikes' ? getDefaultSpecialistForNiche('bicycles') : niche === 'mx' ? getDefaultSpecialistForNiche('motocross') : niche === 'surplus_flip' ? getDefaultSpecialistForNiche('surplus_flip') : config.specialistId,
      status:'review',
      disposition_decision:'pending',
      condition:f('condition'),
      attributes,
      acquired_cost:f('cost').trim() ? Number(f('cost')) : null,
      valuation_mid:f('valuation').trim() ? Number(f('valuation')) : null,
      expected_selling_price:f('sale_price').trim() ? Number(f('sale_price')) : null,
      media:[],
      warnings:niche === 'clothing' && clothingIdentified ? ['AI-generated clothing attributes require user review; authenticity is not guaranteed.'] : ['Manual review required: no verified niche-specific AI identification has been run.'],
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
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center" style={{borderColor:clothingPhotos[slot.key]?'#E91E8C':'#58304F',background:'#1B111B'}}>
                {clothingPreviews[slot.key]?<img src={clothingPreviews[slot.key]} alt={slot.title} className="max-h-60 w-full rounded-xl object-contain"/>:<Camera className="mb-3 h-10 w-10" style={{color:'#E91E8C'}}/>}
                <span className="mt-2 font-semibold">{slot.title}</span><span className="mt-1 text-xs font-semibold tracking-wider" style={{color:slot.required?'#FF3DAA':'#9A7090'}}>{slot.required?'REQUIRED':'OPTIONAL'}</span><span className="mt-2 text-sm" style={{color:'#9A7090'}}>{slot.hint}</span>
                <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                  <label htmlFor={`threads-camera-${slot.key}`} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold" style={{background:'#E91E8C',color:'#0C080C'}}><Camera className="h-4 w-4"/>Take photo</label>
                  <label htmlFor={`threads-file-${slot.key}`} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold" style={{borderColor:'#58304F',color:'#F5EEF5'}}><ImagePlus className="h-4 w-4"/>Choose file</label>
                </div>
                <input id={`threads-camera-${slot.key}`} ref={el=>{clothingCameraInputs.current[slot.key]=el}} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e=>{addClothingPhoto(slot.key,e.target.files?.[0]);e.currentTarget.value='';}}/>
                <input id={`threads-file-${slot.key}`} ref={el=>{clothingFileInputs.current[slot.key]=el}} type="file" accept="image/*" className="sr-only" onChange={e=>{addClothingPhoto(slot.key,e.target.files?.[0]);e.currentTarget.value='';}}/>
              </div>
            </div>)}
          </div>
          <p className="rounded-2xl p-3 text-sm leading-relaxed" style={{background:'#250014',color:'#FF3DAA'}}>Tip: photograph the brand label flat, well-lit and in focus. The care label helps identify fabric and era.</p>
          <button type="button" onClick={identifyClothing} disabled={identifyingClothing||!clothingPhotos.brand} className="w-full rounded-full py-4 font-extrabold disabled:opacity-40" style={{background:'#E91E8C',color:'#0C080C'}}>{identifyingClothing?'Identifying with Threads Flip AI…':'✦ Identify Item'}</button>
          {clothingAiError&&<p role="alert" className="text-sm text-red-400">{clothingAiError}</p>}
        </section>
        {clothingIdentified ? <section className="space-y-4 rounded-3xl border p-4 sm:p-5" style={{background:'#160E16',borderColor:'#E91E8C'}}>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" style={{color:'#E91E8C'}}/><h2 className="text-lg font-bold">Review AI-filled details</h2></div>
          <p className="text-sm" style={{color:'#9A7090'}}>Threads Flip has populated these fields from your photos. Check the suggestions and edit anything that is incorrect before saving. AI identification does not prove designer authenticity.</p>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><label className="block text-sm" style={{color:'#9A7090'}}>eBay listing title *</label><button type="button" onClick={()=>void generateClothingCopy('title')} disabled={generatingClothingCopy!==null} className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{borderColor:'#E91E8C',color:'#FF3DAA'}}><Sparkles className="h-4 w-4"/>{generatingClothingCopy==='title'?'Generating…':'Generate with AI'}</button></div>
            <input className="input-field mt-1" value={f('title')} onChange={e=>setF('title',e.target.value)} placeholder="AI-generated searchable eBay title"/>
            <p className="mt-1 text-xs" style={{color:'#9A7090'}}>Generate from the photos and confirmed garment details. Review before listing.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{config.fields.map(field=><div key={field.key}><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>{field.label}</label>{field.type==='select'?<select className="input-field mt-1" value={f(field.key)} onChange={e=>setF(field.key,e.target.value)}><option value="">Select or confirm…</option>{(field.options||[]).map(option=><option key={option} value={option}>{option}</option>)}</select>:<input className="input-field mt-1" type={field.type||'text'} value={f(field.key)} onChange={e=>setF(field.key,e.target.value)} placeholder={field.placeholder||field.label}/>}</div>)}</div>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><label className="block text-sm" style={{color:'#9A7090'}}>eBay listing description</label><button type="button" onClick={()=>void generateClothingCopy('description')} disabled={generatingClothingCopy!==null} className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{borderColor:'#E91E8C',color:'#FF3DAA'}}><Sparkles className="h-4 w-4"/>{generatingClothingCopy==='description'?'Generating…':'Generate with AI'}</button></div>
            <textarea className="input-field mt-1" rows={5} value={f('description')} onChange={e=>setF('description',e.target.value)} placeholder="Generate an eBay-ready description from your photos and confirmed details, then edit it."/>
          </div>
          {clothingAiError&&<p role="alert" className="text-sm text-red-400">{clothingAiError}</p>}
          {clothingAiResult&&<details className="text-sm" style={{color:'#9A7090'}}><summary className="cursor-pointer">View identification evidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(clothingAiResult,null,2)}</pre></details>}
        </section> : <section className="rounded-3xl border p-5" style={{background:'#160E16',borderColor:'#301830'}}>
          <h2 className="text-lg font-bold">Next: AI fills in the details</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{color:'#9A7090'}}>Add the required brand-label photo and any optional garment or care-label photos, then tap <strong style={{color:'#E91E8C'}}>Identify Item</strong>. Threads Flip will fill in the item title, brand, garment type, size, colour, fabric, style and condition. You will be able to edit the suggestions before saving — no need to type them all yourself.</p>
        </section>}
        <section className="space-y-3 rounded-3xl border p-4 sm:p-5" style={{background:'#160E16',borderColor:'#301830'}}>
          <h2 className="text-lg font-bold">3. Purchase and value details</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['cost','Purchase cost (£)'],['valuation','Estimated value (£)'],['sale_price','Planned listing price (£)']].map(([key,label])=><div key={key}><label className="mb-1 block text-sm" style={{color:'#9A7090'}}>{label}</label><input className="input-field mt-1" type="number" min="0" step="0.01" value={f(key)} onChange={e=>setF(key,e.target.value)}/></div>)}</div><p className="text-xs" style={{color:'#9A7090'}}>Values entered here are estimates, not verified sold-comparable valuations.</p>
        </section>
        <div className="flex flex-wrap justify-between gap-3"><Link to="/inventory" className="btn-secondary"><Package className="h-4 w-4"/>Wardrobe / Inventory</Link><button className="btn-primary" onClick={save} disabled={insert.isPending || tenantLoading || !tenantId || !clothingIdentified}><Save className="h-4 w-4"/>{insert.isPending?'Saving…':!clothingIdentified?'Identify photos to continue':'Save item for review'}</button></div>
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
    <div className="flex flex-wrap justify-between gap-3"><Link to="/inventory" className="btn-secondary"><Package className="w-4 h-4"/>Inventory</Link><button className="btn-primary" onClick={save} disabled={insert.isPending || tenantLoading || !tenantId}><Save className="w-4 h-4"/>{insert.isPending?'Saving…':niche==='coins'?'Open coin capture':'Save for review'}</button></div>
  </div>;
}
