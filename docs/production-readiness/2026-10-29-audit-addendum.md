# SWISH Web Audit Addendum — 2026-10-29

## Verified CI result
Web verification run 40931625024 completed successfully. Dependency installation, lint and production build all passed after commit 3473bd0d6024d8b8abf73e10ad5f89be4cd2591d.

## Additional tenant-scoping finding
The initial call-site review found:
- src/pages/InventoryItem.tsx reads the item using useTableRow('items', id, '*', tenantId), but constructs update and delete hooks without tenantId. These mutations filter by row ID only in the shared helper unless RLS rejects cross-tenant access.
- src/pages/InventoryNew.tsx includes tenant_id in the inserted row but constructs useInsert('items') without tenantId, so the shared mutation helper does not enforce the resolved tenant.

These are confirmed source-level inconsistencies and should be corrected before release. An attempt to update these source files was blocked by the GitHub write safety check; no source change was committed for these findings.

## Current release gate
Decision remains NO-GO. The successful web build and lint only verify compilation and static linting. The tenant-scoping inconsistencies above, deployed RLS policy verification, live server-side credential configuration, and eBay end-to-end tests remain outstanding.
