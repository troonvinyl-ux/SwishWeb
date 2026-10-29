# SWISH Web Production Readiness Audit
Date: 2026-10-29
Repository: troonvinyl-ux/SwishWeb
Branch: main
Decision: NO-GO pending critical release evidence.

## Findings
- CI workflow .github/workflows/web-verify.yml runs npm install, npm run lint, and npm run build.
- Run 40931403157 installed dependencies successfully, failed lint at src/pages/Inventory.tsx:11 because of an explicit any type, and skipped build.
- Commit 3473bd0d6024d8b8abf73e10ad5f89be4cd2591d replaces the explicit any with a typed row and corrects useMemo dependencies. CI run 40931625024 was triggered; confirm its final result before marking the fix passed.
- package.json defines build and lint scripts but no test script.
- useCurrentTenantId selects the oldest tenant visible to the authenticated user under RLS. Live membership/RLS behaviour has not been verified.
- Inventory.tsx scopes item and listing queries by tenant ID and niche specialist IDs. Other query/mutation call sites and deployed RLS policies still need a complete audit.
- Existing parity register records partial or unverified areas including listing preflight, stock-check parity, silver batch lifecycle, bike-flipper decisions, eBay admin/category tools, and end-to-end listing/item-specific persistence.
- Source review cannot verify deployed backend configuration or live eBay operations.

## Parity and release gates
| Journey | Current status | Required evidence |
|---|---|---|
| Sign-in and workspace selection | Partial | Test session lifecycle and multi-tenant membership in the deployed environment. |
| Niche isolation | Unverified | Audit all reads/writes and test server-side denial of cross-tenant access. |
| Inventory | Partial | Verify every inventory screen and mutation, not just the main Inventory page. |
| Listing draft and item specifics | Unverified | Save, reopen, revise and submit a draft; confirm persisted data. |
| eBay sync, orders, messages and finances | Unverified | Run authorised end-to-end tests against deployed Edge Functions. |
| Stock check | Partial | Verify persistence and staff access. |
| Master admin | Unverified | Confirm privileges are enforced server-side. |
| Production build | Pending | Confirm CI lint and build both pass on the latest commit. |

## Next steps
1. Confirm CI for commit 3473bd0d6024d8b8abf73e10ad5f89be4cd2591d.
2. Audit query and mutation call sites for tenant/niche scoping.
3. Add focused regression tests using existing test infrastructure where available.
4. Complete the web/native parity register with evidence.
5. Verify deployed row-level security, backend secret configuration, credential compatibility and live eBay operations with authorised access.
6. Update this report with the exact verification results.

Do not declare production readiness based on a successful frontend build alone. Keep the release decision NO-GO until critical tenant isolation, credential safety and live integration gates have evidence.
