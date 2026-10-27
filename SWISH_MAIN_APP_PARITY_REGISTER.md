# SWISH Main App ↔ Web parity register

This is the working parity register for `troonvinyl-ux/SWISH` (Expo main app) and `troonvinyl-ux/SwishWeb` (React/Vite web client). The target is functional parity, not merely matching page names.

## Guardrails

- Reuse the existing OnSpace/Supabase backend, tenant model, tables, storage buckets and deployed Edge Functions.
- Do not create a second database, invent backend endpoints, or report success when a server operation fails.
- All item-linked reads and writes must be tenant-scoped and niche-scoped wherever the main app scopes them.
- Marketplace secrets and access/refresh tokens remain server-only. Browser code may call existing Edge Functions but must not access credentials directly.
- Keep Simple Delivery as the default; do not introduce eBay shipping business policies or calculated shipping.
- Do not auto-confirm uncertain identifications or auto-publish drafts without an explicit user action.

## Current implementation pass

| Main app capability | Web status in this branch | Notes |
|---|---|---|
| Authentication, tenant workspace and niche entry | Existing | Existing AuthContext, workspace routing and niche context retained. |
| Inventory browse/detail/create | Existing | Existing web inventory pages retained; niche scoping requires regression tests. |
| Single-item capture/identification | Existing | Uses existing identify/value Edge Functions and review/confirmation flow. |
| Islamic/Indian silver and countermark batch identification | Implemented in this pass | New batch screen invokes existing `swish-islamic-identify` sequentially, supports obverse/reverse images and measurements, shows server results/errors. It does not auto-confirm or publish. |
| Silver rapid-capture commercial workflow | Partial | Web batch identification is available; native batch lifecycle, commercial grouping, valuation strategy, batch resume/save and bulk listing still require parity implementation. |
| Bike Flipper | Partial | Web route opens bicycle capture; repair cost/profit decision engine and native buying recommendation flow still require implementation. |
| Listing creation/editor and item specifics | Existing | Existing web listing editor retained; regression tests must verify item specifics save/reopen and eBay revise. |
| Listing preflight | Partial | Tool opens the listing workspace. Dedicated native-equivalent checklist, category browse, validation result display and explicit submit confirmation still require porting. |
| Orders and dispatch | Existing | Web pages exist; every native fulfilment state and transition needs verification against the same backend fields. |
| Repricing, insights, money, tasks, acquisitions, opportunities, review-required, audit | Existing | Pages exist; calculation and niche isolation parity tests remain required. |
| eBay hub, listings, orders, messages, offers, returns, cases, finances, analytics, import, logs | Existing | Pages exist; verify each route against the current server Edge Functions and native behaviour. |
| eBay account connection/admin/category admin/CSV tools | Partial / audit needed | Native has separate screens. Map each action to an existing web page or implement a dedicated page using existing backend routes; do not fake success. |
| Stock check / stock listing workflows | Gap / audit needed | Native screens exist; web must port checklists, quantity/price edits, safe save and summary. |
| Deep ID lab, image enhancement, coin flipper commercial score, MX profit tools, surplus auction bid engine, niche-specific home actions | Gap / audit needed | Need function-by-function review of native screens/services before declaring parity. |
| Master admin and subscription | Existing | Access and entitlements must remain owner/tenant controlled. |

## Next required work

1. Port stock check and stock-listing flows with safe, tenant-scoped writes.
2. Port native listing preflight with the same checks and the existing server verification functions.
3. Port Silver Batch persistence/resume, commercial decisions, groups and bulk listing using the existing services/tables/functions.
4. Port Bike Flipper and motocross/surplus commercial decision screens using the existing decision engines and real data.
5. Complete the eBay account/admin/category/CSV action map and make every web action call an existing confirmed Edge Function.
6. Compare each native service and route against web behaviour, then add route, tenant-isolation, save/reopen, error-state and build/lint tests.

## Acceptance criteria for claiming full parity

- Every production main-app screen/function has a web destination and equivalent working action, or is explicitly excluded with a product decision.
- No placeholder route is represented as a completed feature.
- Reads/writes use the correct tenant and active niche.
- Edge Function failures and missing endpoints are visible; no mocked success.
- Save/reopen and eBay submission tests pass for listings and item specifics.
- Web production build and lint pass, and route smoke tests cover all parity destinations.
