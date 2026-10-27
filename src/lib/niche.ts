/**
 * Web-side routing map aligned with the authoritative Main App constants/niches.ts
 * and constants/specialists.ts. Keep IDs canonical; do not infer niche from titles.
 */
export type SwishNicheId = 'coins' | 'motocross' | 'bicycles' | 'clothing' | 'surplus_flip';

export const NICHE_SPECIALISTS: Record<SwishNicheId, string[]> = {
  coins: [
    'coins', 'islamic_silver', 'banknotes', 'gold', 'silver',
    'jewellery_precious_metals', 'ancient_artefacts', 'curiosities_collectibles',
  ],
  motocross: ['motocross'],
  bicycles: ['bicycles'],
  clothing: ['clothing', 'trainers_sneakers'],
  surplus_flip: ['surplus_trader'],
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
  try {
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
