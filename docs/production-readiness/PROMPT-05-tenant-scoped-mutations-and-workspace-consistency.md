# SWISH Production Readiness — Prompt 05
## Close Tenant-Scoped Mutation Gaps and Verify Workspace Selection

**Target repository:** troonvinyl-ux/SwishWeb  
**Target branch:** main  
**Related repository:** troonvinyl-ux/SWISH  
**Priority:** P0 — tenant/data isolation  
**Mode:** Make minimal verified fixes in the existing app and commit directly to main.

## Role

Act as the senior React/TypeScript engineer and application-security engineer responsible for resolving the specific tenant-scope gaps found in the 29 October 2026 production-readiness audit.

## Non-negotiable constraints

- Do not rebuild or redesign SWISH.
- Do not create a new database, authentication system, tenant model, or marketplace connector architecture.
- Do not change the existing eBay listing architecture.
- Preserve the existing OnSpace/Supabase setup, current UI, niche routes, and established data model.
- Keep changes narrowly scoped to verified tenant-selection and tenant-scoping defects.
- Do not weaken Row Level Security or rely on client-side filtering as the security boundary.
- Never expose credentials, access/refresh tokens, encryption keys, or secret-bearing error output.
- Do not use a workaround that bypasses repository safety controls. If a write or test is blocked, report the blocker honestly and do not claim it was fixed.
- Inspect the latest main before editing; preserve unrelated changes. Commit verified changes directly to main, without force-pushing.

## Confirmed source findings to verify against current main

The previous audit inspected these call sites:

1. src/pages/InventoryItem.tsx reads the item with useTableRow('items', id, '*', tenantId), but constructs mutations with useUpdate('items') and useDelete('items') without passing the resolved tenant ID.
2. src/pages/InventoryNew.tsx uses useInsert('items') without passing the resolved tenant ID, even though its row payload contains tenant_id.
3. src/pages/EbayFinances.tsx separately queries tenant_memberships with .limit(1).maybeSingle() to choose a tenant for the finances Edge Function, rather than using the same tenantId returned by useCurrentTenantId(). A user with multiple memberships could therefore see a workspace mismatch.
4. The generic hooks in src/hooks/useSupabaseQuery.ts accept an optional tenant ID for insert/update/delete and apply a tenant_id filter when supplied. Confirm current signatures and behavior before changing call sites.

These are source-level findings, not proof of an exploitable cross-tenant access. The deployed RLS policies and live authorization behavior were not verified in the earlier audit.

## Required work

### A. Inspect first

- Read the current versions of the four files above and the useCurrentTenantId hook.
- Search the repository for other inventory or marketplace mutations that omit tenant scope, especially update/delete/insert/upsert operations on tenant-owned tables.
- Confirm which tables are tenant-owned and which, if any, are intentionally global. Do not blindly add tenant_id to global/reference tables.
- Check the current hook semantics, React Query keys, error handling, and existing conventions.

### B. Apply the smallest safe fixes

- Pass the resolved tenantId into the inventory item update and delete hooks. Keep actions disabled or fail closed until the tenant ID is resolved; do not allow a mutation to proceed with a missing tenant.
- Pass the resolved tenantId into the new inventory insert hook so the hook enforces the workspace ID instead of trusting a row payload alone.
- Make the eBay finances summary use the same resolved tenantId as its financial rows. Avoid the arbitrary first-membership query. Ensure the summary does not fire until the workspace ID is available and refreshes correctly if the authenticated workspace changes.
- Review other call sites found by the search and fix only confirmed tenant-scope omissions using existing hook capabilities.
- Preserve the existing UI and user-facing workflows. Do not perform a broad refactor.

### C. Add or update focused tests

Use the test framework already installed; do not add a new framework just for this task.

Test or otherwise verify:
- insert/update/delete hooks fail closed when tenant-scoped but tenant ID is missing;
- tenant-scoped update/delete queries include both the row ID and tenant ID;
- inventory create uses the resolved workspace ID, not a client-supplied conflicting ID;
- eBay finances calls the Edge Function with the same tenant ID used for the financial rows;
- a user with multiple memberships does not silently get assigned an arbitrary workspace;
- existing niche-specific inventory behavior is preserved.

If hook tests are not feasible with the current setup, add the narrowest suitable regression coverage and clearly document any untested behavior.

### D. Verify

Run the actual project-supported commands for lint, production build, and tests. Inspect the final diff and ensure no unrelated files changed. Review all tenant-sensitive call sites again after the fix.

Do not claim live RLS or deployed Edge Function verification unless it was performed against the actual configured backend. If the environment is unavailable, list that as a release blocker rather than substituting assumptions.

### E. Commit and report

If and only if the changes and checks are successful, commit directly to main with a clear message such as:

fix: enforce workspace scope for inventory mutations

Update or add a concise report under docs/production-readiness/ recording:
- files changed and the exact defect addressed;
- commands run and their real results;
- CI workflow URLs/run IDs where available;
- remaining live-backend and multi-tenant verification gaps;
- the current GO/NO-GO recommendation.

Do not mark SWISH production-ready solely because lint/build pass.

## Acceptance criteria

- Inventory item reads, creates, updates, and deletes consistently use the resolved tenant ID.
- eBay finances summary and transaction rows use the same resolved workspace.
- No arbitrary first-membership selection remains in the audited finances flow.
- Missing tenant context fails closed.
- Niche isolation and existing eBay behavior remain intact.
- Lint, production build, and available tests pass.
- The final diff is narrow, reviewable, and committed to main.
- The release report distinguishes source-level evidence from live backend evidence.

## Final response format

Return:
1. Commit SHA and link, if committed.
2. Changed files and behavior fixed.
3. Lint/build/test results with workflow links.
4. Any remaining tenant/RLS/eBay integration blockers.
5. A clear GO or NO-GO decision and the reason.

If blocked by tool permissions or safety controls, stop without attempting alternate write paths and report exactly what remains for an authorised coding environment to do.
