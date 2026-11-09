/** SWISH web shared scan-to-list contract.
 * Pure UI orchestration; no database writes or marketplace publication.
 * All niches use the same stages and only the evidence requirements differ.
 */
export type ScanStage = 'scan' | 'review' | 'submitting';
export type ScanAction = 'save_for_later' | 'list_now';
export type EvidenceSlot = { id: string; label: string; required: boolean };
export type ScanProfile = { name: string; evidence: readonly EvidenceSlot[]; barcode: boolean };
const slot = (id: string, label: string, required = true): EvidenceSlot => ({ id, label, required });
const standard = [slot('front', 'Front'), slot('back', 'Back')];
export const SCAN_PROFILES: Record<string, ScanProfile> = {
  coins: { name: 'Coin Flipper', barcode: false, evidence: [slot('obverse','Obverse'),slot('reverse','Reverse')] },
  motocross: { name: 'MX Flipper', barcode: true, evidence: [slot('item','Machine or part'),slot('model','Model / serial label',false)] },
  bicycles: { name: 'Bike Flipper', barcode: true, evidence: [slot('item','Bicycle or component'),slot('model','Model / frame label',false)] },
  clothing: { name: 'Threads Flip', barcode: true, evidence: [slot('garment','Garment'),slot('brand','Brand label'),slot('care','Care / size label',false)] },
  trading_cards: { name: 'Card Flipper', barcode: true, evidence: standard },
  antiques: { name: 'Antique Flipper', barcode: false, evidence: [slot('item','Whole object'),slot('mark','Maker mark',false)] },
  fossils: { name: 'Fossil Flipper', barcode: false, evidence: [slot('specimen','Specimen'),slot('reverse','Reverse / scale',false)] },
  beauty: { name: 'Beauty Flipper', barcode: true, evidence: [slot('product','Product'),slot('batch','Batch / seal',false)] },
  tech: { name: 'Tech Flipper', barcode: true, evidence: [slot('device','Device'),slot('model','Model / serial label',false)] },
  surplus_flip: { name: 'Surplus Flip', barcode: true, evidence: [slot('lot','Lot or item'),slot('manifest','Manifest / label',false)] },
  tools: { name: 'Tool Flipper', barcode: true, evidence: [slot('tool','Tool'),slot('model','Model / rating plate',false)] },
  tunes_flip: {
    name: 'Tunes Flip',
    barcode: true,
    evidence: [
      slot('front', 'Front packaging'),
      slot('back', 'Rear / barcode / catalogue number'),
      slot('media', 'Record label or disc face'),
      slot('matrix', 'Matrix / runout detail', false),
      slot('condition', 'Media and sleeve condition', false),
    ],
  },
  collectibles: {
    name: 'Collectibles Flipper',
    barcode: true,
    evidence: [
      slot('item', 'Complete item'),
      slot('packaging', 'Packaging / edition / maker mark'),
      slot('accessories', 'Accessories and completeness', false),
      slot('condition', 'Damage, wear or restoration', false),
    ],
  },
};
export function missingEvidence(profile: ScanProfile, supplied: ReadonlySet<string>): string[] {
  return profile.evidence.filter(s => s.required && !supplied.has(s.id)).map(s => s.label);
}
export type ListingReadiness = { title?: string; price?: number | null; ebayCategoryId?: string; missingRequiredSpecifics?: readonly string[]; identityConfirmed?: boolean };
export function publicationBlockers(value: ListingReadiness): string[] {
  const missing: string[] = [];
  if (!value.identityConfirmed) missing.push('Confirm item identity');
  if (!value.title?.trim()) missing.push('Listing title');
  if (!(typeof value.price === 'number' && Number.isFinite(value.price) && value.price > 0)) missing.push('Selling price');
  if (!value.ebayCategoryId?.trim()) missing.push('eBay category');
  missing.push(...(value.missingRequiredSpecifics ?? []).map(s => 'Required: ' + s));
  return missing;
}
export function canSaveDraft(): boolean { return true; }
export function canPublish(value: ListingReadiness): boolean { return publicationBlockers(value).length === 0; }

