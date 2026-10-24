/**
 * Canonical browser-side niche context for SWISH Web.
 *
 * This controls presentation/query scoping only. It is not an authorization
 * boundary: tenant ownership and niche row access must still be enforced by
 * Supabase Row Level Security and server Edge Functions.
 */
export const ACTIVE_NICHE_KEY = 'swish_active_niche';
export const ACTIVE_NICHE_NAME_KEY = 'swish_active_niche_name';

export type NicheId =
  | 'coins' | 'cards' | 'antiques' | 'bikes' | 'mx'
  | 'fossils' | 'clothing' | 'beauty' | 'tech' | 'tools';

export interface NicheDefinition {
  id: NicheId;
  name: string;
  shortName: string;
  /** Exact specialist identifiers used by the SWISH app where known. */
  specialistIds: string[];
  /** Fields accepted as niche identifiers by existing web schemas. */
  fields: string[];
}

export const NICHES: Record<NicheId, NicheDefinition> = {
  coins: { id:'coins', name:'Coin Flipper', shortName:'Coins', specialistIds:['coins','coin_flipper','islamic_silver','gold','silver','banknotes'], fields:['niche_id','niche','specialist_id','specialist'] },
  cards: { id:'cards', name:'Card Flipper', shortName:'Cards', specialistIds:['cards','trading_cards','tcg'], fields:['niche_id','niche','specialist_id','specialist'] },
  antiques: { id:'antiques', name:'Antique Flipper', shortName:'Antiques', specialistIds:['antiques','antique_collectables','vintage'], fields:['niche_id','niche','specialist_id','specialist'] },
  bikes: { id:'bikes', name:'Bike Flipper', shortName:'Bikes', specialistIds:['bicycles','cycling','bikes','bike_flipper'], fields:['niche_id','niche','specialist_id','specialist'] },
  mx: { id:'mx', name:'Flipper MX', shortName:'Motocross', specialistIds:['motocross','mx','flipper_mx'], fields:['niche_id','niche','specialist_id','specialist'] },
  fossils: { id:'fossils', name:'Fossil Flipper', shortName:'Fossils', specialistIds:['fossils','minerals','specimens'], fields:['niche_id','niche','specialist_id','specialist'] },
  clothing: { id:'clothing', name:'Clothing Flipper', shortName:'Clothing', specialistIds:['clothing','fashion','trainers','trainers_sneakers','threads_flip'], fields:['niche_id','niche','specialist_id','specialist'] },
  beauty: { id:'beauty', name:'Beauty Flipper', shortName:'Beauty', specialistIds:['beauty','cosmetics','fragrance'], fields:['niche_id','niche','specialist_id','specialist'] },
  tech: { id:'tech', name:'Tech Flipper', shortName:'Tech', specialistIds:['tech','electronics','gaming'], fields:['niche_id','niche','specialist_id','specialist'] },
  tools: { id:'tools', name:'Tool Flipper', shortName:'Tools', specialistIds:['tools','power_tools','equipment'], fields:['niche_id','niche','specialist_id','specialist'] },
};

export function normalizeNicheId(value: unknown): NicheId | null {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  if (id in NICHES) return id as NicheId;
  if (['bicycles','cycling','bike_flipper'].includes(id)) return 'bikes';
  if (['motocross','flipper_mx'].includes(id)) return 'mx';
  if (['fashion','threads_flip','trainers_sneakers'].includes(id)) return 'clothing';
  if (['coin_flipper','islamic_silver','gold','silver','banknotes'].includes(id)) return 'coins';
  return null;
}

export function getActiveNiche(): NicheDefinition | null {
  try {
    const stored = normalizeNicheId(localStorage.getItem(ACTIVE_NICHE_KEY));
    return stored ? NICHES[stored] : null;
  } catch {
    return null;
  }
}

export function setActiveNiche(id: NicheId): void {
  try {
    localStorage.setItem(ACTIVE_NICHE_KEY, id);
    localStorage.setItem(ACTIVE_NICHE_NAME_KEY, NICHES[id].name);
  } catch {
    // The app remains usable if browser storage is blocked; the route is still explicit.
  }
}

export function matchesNicheValue(value: unknown, niche: NicheDefinition): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.toLowerCase().trim().replace(/[ -]+/g, '_');
  return niche.specialistIds.some(id => id.toLowerCase().replace(/[ -]+/g, '_') === normalized)
    || normalized === niche.id;
}
