/**
 * Web-side niche routing map aligned with the canonical specialist IDs used by
 * SWISH's main app. Route/hostname aliases are normalised before querying.
 *
 * Keep the IDs here in sync with creation and import flows. Unknown values must
 * not silently fall back to coins.
 */
export type SwishNicheId =
  | 'coins'
  | 'motocross'
  | 'bicycles'
  | 'clothing'
  | 'trading_cards'
  | 'antiques'
  | 'fossils'
  | 'beauty'
  | 'tech'
  | 'surplus_flip';

export const NICHE_SPECIALISTS: Record<SwishNicheId, string[]> = {
  coins: [
    'coins', 'coins_uk', 'coins_world', 'islamic_silver', 'banknotes', 'gold', 'silver',
    'jewellery_precious_metals', 'ancient_artefacts', 'curiosities_collectibles',
  ],
  motocross: ['motocross', 'mx'],
  bicycles: ['bicycles', 'bikes'],
  clothing: ['clothing', 'trainers_sneakers', 'clothing_specialist'],
  trading_cards: ['pokemon_cards', 'trading_cards', 'cards'],
  antiques: ['antiques', 'curiosities_collectibles'],
  fossils: ['fossils'],
  beauty: ['beauty'],
  tech: ['tech', 'retro_games', 'retro_consoles'],
  surplus_flip: ['surplus_trader', 'surplus_flip'],
};

export const NICHE_DEFAULT_SPECIALIST: Record<SwishNicheId, string> = {
  coins: 'coins',
  motocross: 'motocross',
  bicycles: 'bicycles',
  clothing: 'clothing',
  trading_cards: 'pokemon_cards',
  antiques: 'antiques',
  fossils: 'fossils',
  beauty: 'beauty',
  tech: 'tech',
  surplus_flip: 'surplus_trader',
};

const NICHE_ALIASES: Record<string, SwishNicheId> = {
  coins: 'coins',
  mx: 'motocross',
  motocross: 'motocross',
  bikes: 'bicycles',
  bicycles: 'bicycles',
  threads: 'clothing',
  clothes: 'clothing',
  clothing: 'clothing',
  cards: 'trading_cards',
  trading_cards: 'trading_cards',
  antiques: 'antiques',
  fossils: 'fossils',
  beauty: 'beauty',
  tech: 'tech',
  surplus: 'surplus_flip',
  surplus_flip: 'surplus_flip',
  surplus_trader: 'surplus_flip',
};

const VALID_NICHES = Object.keys(NICHE_SPECIALISTS) as SwishNicheId[];

export function normaliseNicheId(value: unknown): SwishNicheId | null {
  const key = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return NICHE_ALIASES[key] ?? null;
}

export function getActiveNicheId(): SwishNicheId {
  // A registered product hostname is authoritative for that product's UI queries.
  // This prevents stale localStorage from another niche leaking into a standalone domain.
  try {
    const host = window.location.hostname.toLowerCase().split(':')[0];
    const hostProduct: Record<string, SwishNicheId> = {
      'coinflipper.com': 'coins', 'www.coinflipper.com': 'coins', 'coins.swishflip.co.uk': 'coins',
      'mxflipper.com': 'motocross', 'www.mxflipper.com': 'motocross', 'mx.swishflip.co.uk': 'motocross',
      'bikeflipper.com': 'bicycles', 'www.bikeflipper.com': 'bicycles',
      'bikesflipper.com': 'bicycles', 'www.bikesflipper.com': 'bicycles', 'bikes.swishflip.co.uk': 'bicycles',
      'clothesflipper.com': 'clothing', 'www.clothesflipper.com': 'clothing',
      'clothes.swishflip.co.uk': 'clothing', 'threads.swishflip.co.uk': 'clothing',
      'cards.swishflip.co.uk': 'trading_cards', 'antiques.swishflip.co.uk': 'antiques',
      'fossils.swishflip.co.uk': 'fossils', 'beauty.swishflip.co.uk': 'beauty',
      'tech.swishflip.co.uk': 'tech',
      'surplusflip.com': 'surplus_flip', 'www.surplusflip.com': 'surplus_flip',
      'surplus.swishflip.co.uk': 'surplus_flip',
    };
    const fixedNiche = hostProduct[host];
    if (fixedNiche) return fixedNiche;
    const value = normaliseNicheId(localStorage.getItem('swish_active_niche'));
    return value && VALID_NICHES.includes(value) ? value : 'coins';
  } catch {
    return 'coins';
  }
}

export function getSpecialistIdsForNiche(niche: SwishNicheId = getActiveNicheId()): string[] {
  return NICHE_SPECIALISTS[niche];
}

export function getDefaultSpecialistForNiche(niche: SwishNicheId = getActiveNicheId()): string {
  return NICHE_DEFAULT_SPECIALIST[niche];
}
