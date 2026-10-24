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

## Audit findings (2026-10-24)

### Confirmed gaps before this branch
- Workspace pages set a localStorage niche, but shared inventory/listing/order queries did not scope to it.
- The niche picker offered ten workspaces although the app's production entry routes explicitly brand four subscriber apps (coins, bicycles, clothing and motocross); aliases and niche IDs need to remain consistent.
- The web identification screen is coin-specific. The workspace UI linked non-coin niches to it without gating, risking coin-only questions and Edge Function submissions for other goods.
- New inventory writes hard-coded specialist_id to curiosities_collectibles instead of the current active niche.
- Specialist tools had a tracking page, but most entries correctly remained unavailable pending verified integration; links must not imply a complete working workflow.
- Account-wide eBay data (funds/messages/cases) needs to remain clearly distinct from niche-scoped item data.
- Authentication and browser environment variables expose only the public/anon backend key; eBay secrets must remain in server-side Edge Functions.

### Changes in the audit branch
- Added a shared niche catalogue/normalisation helper and reused it in niche entry/workspace and the sidebar.
- Direct /workspace/:niche URLs hydrate the chosen niche; unknown workspace IDs are redirected to the niche picker instead of silently becoming Coin Flipper.
- Item-linked generic query hooks attempt a supported niche-field filter and fail closed when the current table schema cannot be safely scoped. This is a compatibility guard, not a substitute for server-side Row Level Security.
- New manual inventory rows are tagged with the active niche and specialist identifier, when selected.
- Coin identification is explicitly gated outside the coins niche until the other niches have verified specialist identification functions and save schemas.
- Existing integration-required tool states remain honest; no fake AI results or mock seller success were added.

### Remaining work before claiming full app parity
- Verify the production schema's exact niche field and allowed values for each table (items, inventory, listings, orders, tasks, sales/acquisitions/opportunities) and replace compatibility probing with typed schema-specific filters.
- Ensure insert/update/delete operations and all direct Supabase queries carry matching niche context; query hook scoping alone does not cover direct calls or mutations.
- Apply explicit fixed-niche subscriber gating (coins/bicycles/clothing/motocross) using verified subscription/account claims, not a client-provided route value.
- Build dedicated bicycle, motocross and clothing identification/valuation flows wired to verified backend functions, plus the Islamic/countermark and silver batch workflows and listing preflight.
- Audit all eBay order/dispatch/funds/messages/cases pages against the existing deployed Edge Functions and actual schema fields. No backend function was invented in this branch.
- Add tests for every niche: selected niche, direct URL entry, item read filters, item creation tags, unknown niche rejection, account-wide eBay summaries, and no cross-niche listing/order visibility.
- Run npm install, npm run lint, npm run build, and real browser/sandbox tests. The GitHub connector used for this audit can edit repository files but cannot execute this repository's Node test/build commands; CI must provide the final pass/fail evidence.
