/**
 * Web-side routing map aligned with the authoritative Main App constants/niches.ts
 * and constants/specialists.ts. Keep IDs canonical; do not infer niche from titles.
 */
export type SwishNicheId = 'coins' | 'motocross' | 'bicycles' | 'clothing' | 'surplus_flip';

export const NICHE_SPECIALISTS: Record<SwishNicheId, string[]> = {
  coins: [
    'coins', 'coins_uk', 'coins_world', 'islamic_silver', 'banknotes', 'gold', 'silver',
    'jewellery_precious_metals', 'ancient_artefacts', 'curiosities_collectibles',
  ],
  motocross: ['motocross', 'mx'],
  bicycles: ['bicycles', 'bikes'],
  clothing: ['clothing', 'trainers_sneakers', 'clothing_specialist'],
  surplus_flip: ['surplus_trader', 'surplus_flip'],
};

export const NICHE_DEFAULT_SPECIALIST: Record<SwishNicheId, string> = {
  coins: 'coins',
  motocross: 'motocross',
  bicycles: 'bicycles',
  clothing: 'clothing',
  surplus_flip: 'surplus_trader',
};

const VALID_NICHES = Object.keys(NICHE_SPECIALISTS) as SwishNicheId[];

export function getActiveNicheId(): SwishNicheId {
  // A registered product hostname is authoritative for that product's UI queries.
  // This prevents stale localStorage from another niche leaking into a standalone domain.
  try {
    const host = window.location.hostname.toLowerCase().split(':')[0];
    const hostProduct = {
      'coinflipper.com': 'coins', 'www.coinflipper.com': 'coins', 'coins.swishflip.co.uk': 'coins',
      'mxflipper.com': 'motocross', 'www.mxflipper.com': 'motocross', 'mx.swishflip.co.uk': 'motocross',
      'bikeflipper.com': 'bicycles', 'www.bikeflipper.com': 'bicycles', 'bikesflipper.com': 'bicycles', 'www.bikesflipper.com': 'bicycles', 'bikes.swishflip.co.uk': 'bicycles',
      'clothesflipper.com': 'clothing', 'www.clothesflipper.com': 'clothing', 'clothes.swishflip.co.uk': 'clothing', 'threads.swishflip.co.uk': 'clothing',
      'surplusflip.com': 'surplus_flip', 'www.surplusflip.com': 'surplus_flip', 'surplus.swishflip.co.uk': 'surplus_flip',
    } as Record<string, SwishNicheId>;
    const fixedNiche = hostProduct[host];
    if (fixedNiche) return fixedNiche;
    const value = localStorage.getItem('swish_active_niche')?.toLowerCase();
    return VALID_NICHES.includes(value as SwishNicheId) ? value as SwishNicheId : 'coins';
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
