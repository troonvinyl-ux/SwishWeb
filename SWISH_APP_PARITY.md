# SWISH Web ↔ App parity upgrade

This checklist records app capabilities that the web repository should preserve and align with. The web app uses the existing OnSpace/Supabase backend; do not add a second database or client-side secrets.

## Existing web capabilities retained
- Authenticated React/Vite app shell, inventory, identification, listings, orders, dispatch, repricing, insights, money, tasks and eBay areas.
- Existing eBay web pages: hub, listings, orders, messages, offers, returns, cases, finances, analytics, import/export and logs.
- Coin identification flow already calls identification/value Edge Functions and supports image capture/upload, weight/diameter evidence, ranked candidates and explicit confirmation.
- Listing flow already defaults to draft and documents Simple Delivery + buyer-pays shipping.

## App capabilities to align
- Niche-aware entry/routing: coins, bicycles, clothing and motocross; ensure inventory/listings remain scoped to the selected niche.
- Specialist tools visible in the app: Islamic/countermark batch identification, silver batch workflow, bike flipper, listing preflight, eBay account/admin, CSV import/export, and stock/audit/review workflows.
- eBay seller operation: account/OAuth connection, listings, orders and fulfilment transitions, messages, offers, returns, cases, funds/finances, analytics, import/sync and logs.
- Orders should use the current fulfilment model (awaiting dispatch, packing, label created, dispatched, delivered, completed and returned) where supported by shared backend fields.
- Seller-side funds and financial summaries must come from existing server Edge Functions; the browser must never read or store eBay client secret/access/refresh tokens.
- Simple Delivery is the default shipping method; do not introduce eBay shipping business policies or calculated shipping.

## Integration guardrails
- Keep the existing OnSpace/Supabase backend and table architecture.
- Do not mirror the database or invent Edge Function endpoints. If a matching server function is absent or not confirmed, show an explicit unavailable state rather than mock success.
- Filter inventory- and item-linked counts by the active niche/specialist where that relationship is available. Clearly label seller-account-wide data such as funds and message counts.
- Keep credential encryption/decryption exclusively server-side.
- Run build and lint checks in CI before publication; review each new route against the app's real screen and server function before enabling production actions.

## Current gap summary
The web UI has many of the main destinations, but some current app tools and niche-aware shell behavior have no dedicated web destination yet. Some web eBay pages rely on earlier table/function naming and should be checked against the app's current swish-ebay-* Edge Functions before claiming full parity.
