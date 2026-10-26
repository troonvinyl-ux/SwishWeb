# Standalone niche products — completion plan

## Decision
Keep one SwishWeb repository, one SWISH mobile repository, and the existing shared SWISH/OnSpace backend and identification engine. Ship each niche as a standalone branded product using domain/host-based product configuration and niche-specific Android build profiles. Do not create separate repositories, duplicate the backend, or offer a niche picker to subscribers.

## Current verified gaps in SwishWeb
- `src/App.tsx` resolves the user's niche from auth metadata/localStorage; it has routes such as `/coins`, `/mx`, `/clothes`, and a `/niches` selection entry for the owner.
- `src/components/layout/AppLayout.tsx` renders the generic app shell/sidebar and mobile navigation for all users.
- `src/components/layout/Sidebar.tsx` contains generic navigation, a “Specialist workspace” selector, common inventory/identify routes and many broad tools.
- `src/pages/LoginPage.tsx` derives product from pathname and falls back to Coins. This is unsafe for product-specific domains because an unexpected route can show the wrong niche.
- `src/pages/Onboarding.tsx` derives product from user metadata or localStorage and shows common eBay/inventory onboarding steps, even when the product should have a narrower workflow.
- `src/pages/NicheWorkspace.tsx` already has niche-specific labels/actions. Reuse existing workflow components and shared Edge Functions wherever feasible.

## Target product experience
- Domain/host defines a single product: Clothes Flipper, MX Flipper, Bikes or Coin Flipper.
- Product entry domain opens its matching login/signup page, and then the same product after login.
- No public cross-sell, niche selector, other-product routes, or SWISH-wide branding in a niche customer's UI.
- Product-specific menu labels, capture, attributes, price guidance, listing editor, and stock terms.
- Coins keeps its specialist workflows; non-coin niches show only their relevant simple workflows.
- Shared backend stays the existing one; preserve current auth, Edge Function calls, eBay integration and data model. Do not add a second database or fake endpoints.
- Domain detection is a UX/config source, not an authorization boundary. Enforce the account's allowed niche on route access and data/API queries using existing auth claims/profile/subscription data and the backend's existing RLS/Edge Function guards. Do not depend only on localStorage or browser metadata.
- Keep owner Master Admin available only to the configured owner identity and do not expose niche switching to subscribers.
- If app/product entitlement cannot be validated, fail closed with a clear access message; never silently fall back to Coins.
- Shared eBay operations should remain available only where the product currently supports them; distinguish seller-account-wide metrics from niche-scoped inventory/listings. Keep Simple Delivery defaults and existing server-only eBay credential handling.

## Implementation order
1. Add a strongly typed product registry that maps approved hostnames to product ID, brand, logo/accent, tagline, terminology and allowed navigation/workflows. Support explicit local development overrides, but production product host is authoritative.
2. Add a single product-context hook used by App, Auth, Layout, Login, onboarding, header, sidebar and page route guards.
3. Gate routes against the host's product. On a product host, redirect disallowed niche routes to that product's home; do not expose /niches to subscribers.
4. Render product-aware shell/navigation; hide generic SWISH selector and irrelevant links. Use product terminology: e.g. clothing collection rather than generic/coin inventory where product design calls for it.
5. Simplify non-coin home/capture/listing experiences to task-focused flows, reusing current AI identification and listing APIs. Keep Coins capabilities intact.
6. Confirm per-user and per-niche record isolation in existing backend policies/Edge Functions, and ensure all listings/records are filtered by permitted niche. Add no new database.
7. Add automated tests/build validation for all product hosts, unknown host, signed-out/signed-in user, wrong-niche URL attempts, owner admin, product-specific signup metadata, existing onboarding, data isolation, and product page titles/branding.
8. Document deployment mappings for the domains and confirm hosting wildcard/SPA routing; configure Android application IDs/app names/icons/build profiles in the existing SWISH repo and point each build at its matching product context.
9. Run lint/build/tests and review all pages for unintended cross-niche labels/links before publishing.

## Acceptance tests
- Clothes Flipper host never shows Coin/MX/Bikes/Surplus choices, labels, links or branding.
- A clothing subscriber cannot reach another product by typing a route, changing localStorage, or modifying user metadata in the browser.
- Coin Flipper still exposes coin-specific reference, weight/diameter, batch and review functionality.
- MX Flipper only shows bike/motocross and compatible part fields.
- Sign in from the same account on each product domain does not let domain alone override the user's backend-authorised product entitlement.
- Master Admin works for the owner, not subscribers.
- No mocked listing success or invented Edge Function endpoints; unavailable capabilities are explicit.
- No change to backend architecture, no new database, no separate niche repositories.
