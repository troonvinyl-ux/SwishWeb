# SWISHFLIP 100-Niche Launch Standard

## Commercial model

SWISHFLIP is one shared platform delivering independent-feeling specialist products. The existing SWISH / SwishWeb application and OnSpace-hosted backend remain authoritative. A niche is a product configuration and customer experience, not a separately rebuilt technical stack.

The target portfolio is 100 niche products. The initial validation target is 10 paying subscribers per niche within six months, but this is a target rather than a guarantee. The owner should review real demand and unit economics before assigning more development or marketing budget.

## Standard launch package

Every niche should receive the same minimum launch checklist:

1. Niche name, slug, audience, value proposition and category-specific terminology.
2. Landing page with accurate availability status; planned niches must not imply that their specialist workflows are already live.
3. Account, authentication and subscription flow using existing platform services.
4. Fixed niche context and server-enforced access/data isolation; browser storage or host-based branding alone is not authorisation.
5. Core inventory/listing workflow only where the existing product can support it accurately.
6. Referral entry point and a server-backed credit ledger once the backend implementation is available.
7. Product analytics for visitors, registrations, paid conversions, active paid subscribers, MRR, churn, AI/platform cost and gross margin.
8. Mobile-web acceptance checks and Android distribution status.
9. Clear pricing, renewal, cancellation, privacy and support information.
10. A release owner and review date.

## Subscription tiers

Suggested price points for testing are:

- Basic: £9.99/month
- Plus: £19.99/month
- Premium: £39.99/month

These are proposed prices, not active Stripe prices. A niche should only show a tier when its features, entitlements, billing price and cancellation journey are implemented and verified. Low-demand niches can remain on the lowest appropriate tier; popular niches can earn investment in higher tiers and niche-specific functionality.

## Portfolio investment bands

- **Growth:** proven paid conversion, retention and positive contribution margin; prioritise feature improvements and measured acquisition.
- **Emerging:** some demand, but insufficient evidence; maintain the core workflow and run bounded experiments.
- **Low demand:** keep the stable minimum experience, handle security/compatibility maintenance and revisit on the review cadence rather than continuously expanding features.

Do not assign a band from sign-ups alone. Use paid subscribers, MRR, conversion, churn, acquisition cost and gross margin after AI and platform costs.

## Referral credit design

Intended customer experience:

- A referral area in each niche dashboard.
- A unique referral link and a history of referred sign-ups and qualifying paid conversions.
- One month of eligible subscription credit for each qualifying new paid customer.
- Credits accumulate and roll over; they cannot be cashed out, transferred or sold.
- Clear redemption order, eligible tiers, refund/cancellation reversals, anti-abuse rules and support process.
- Server-side validation and a server-maintained ledger. Do not create credits from localStorage or trust client-submitted referral counts.

**Implementation status:** this repository change records the reusable commercial defaults only. It does not create a backend referral ledger, payment entitlement, credit redemption, or live subscription prices. Those must be implemented and verified against the existing authoritative backend before the dashboard advertises credits as available.

## Annual cash referral competition

The proposed annual cash prize must remain disabled until the exact promotion mechanics and terms have received UK legal and advertising review. Define eligibility, qualifying referrals, fraud handling, ties, closing time, winner selection, prize funding and payout before advertising a prize. The ordinary subscription-credit programme and any cash competition should have separate rules and records.

## Initial validation

- Start with the existing niche entry points and only advertise specialist features that are genuinely available.
- Test different customer propositions across communities such as clothing, coins and surplus/auction reselling.
- Use organic demonstrations, community participation and referrals before scaling paid ads.
- Review each niche on a regular cadence and reinvest only where customer demand and unit economics support it.
