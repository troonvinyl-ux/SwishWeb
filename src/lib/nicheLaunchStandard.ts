/**
 * SWISHFLIP's reusable commercial defaults.
 *
 * These are product defaults, not live billing configuration. Actual prices,
 * entitlement checks and referral credits must be enforced by the existing
 * backend before being advertised as purchasable/redeemable.
 */

export type NicheLifecycle = 'live' | 'pilot' | 'coming-soon' | 'paused';
export type NicheInvestmentBand = 'growth' | 'emerging' | 'low-demand';

export type SubscriptionTier = {
  id: 'basic' | 'middle' | 'premium';
  name: string;
  monthlyPriceGbp: 9.99 | 19.99 | 39.99;
  intendedFor: string;
};

export const SWISHFLIP_SUBSCRIPTION_TIERS: readonly SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPriceGbp: 9.99,
    intendedFor: 'Hobby sellers and new community members',
  },
  {
    id: 'middle',
    name: 'Plus',
    monthlyPriceGbp: 19.99,
    intendedFor: 'Regular sellers who need a fuller workflow',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPriceGbp: 39.99,
    intendedFor: 'High-volume sellers and specialist businesses',
  },
] as const;

/**
 * Initial portfolio targets. These are planning targets and must not be
 * presented as forecasts or guarantees.
 */
export const SWISHFLIP_PORTFOLIO_TARGETS = {
  plannedNicheCount: 100,
  initialSubscriberTargetPerNiche: 10,
  initialValidationWindowMonths: 6,
  personalTakeHomeGoalGbpPerMonth: 5000,
  reviewCadenceMonths: 3,
} as const;

/**
 * Referral programme rules for product design and backend implementation.
 * The server must validate qualifying paid referrals and maintain the ledger.
 * Do not award credits from client-side state or localStorage.
 */
export const SWISHFLIP_REFERRAL_POLICY = {
  reward: 'one-month-subscription-credit',
  qualifyingEvent: 'new-customer-completes-first-paid-subscription',
  creditsRollOver: true,
  creditsCashConvertible: false,
  creditsTransferable: false,
  creditsSellable: false,
  requireFraudChecks: true,
  annualCashCompetitionEnabled: false,
  annualCashCompetitionNote:
    'Keep disabled until promotion terms and UK legal/advertising review are complete.',
} as const;

/**
 * Suggested operating rules for portfolio review. A niche is not automatically
 * promoted or paused by these thresholds; the owner reviews real subscription,
 * retention, acquisition-cost and margin data before changing investment.
 */
export const SWISHFLIP_NICHE_REVIEW_RULES = {
  investmentBands: ['growth', 'emerging', 'low-demand'] as const,
  reviewMetrics: [
    'paidSubscribers',
    'monthlyRecurringRevenue',
    'freeToPaidConversion',
    'monthlyChurn',
    'customerAcquisitionCost',
    'grossMarginAfterAiAndPlatformCosts',
  ] as const,
  principle:
    'Invest more in niches with proven demand; keep low-demand niches stable and revisit them on the scheduled review.',
} as const;
