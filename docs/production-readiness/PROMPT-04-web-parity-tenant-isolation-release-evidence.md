# SWISH Production Readiness — Prompt 04
## Web/App Parity, Tenant Isolation, and Release Evidence

**Target repository:** `troonvinyl-ux/SwishWeb`  
**Target branch:** `main`  
**Related repository:** `troonvinyl-ux/SWISH`  
**Mode:** Execute carefully in the existing codebase; commit verified SWISH Web changes directly to `main`.

## Role

Act as the senior release engineer, application-security engineer, React/TypeScript engineer, and QA lead for SWISH Web. Continue the existing production-readiness programme. Begin by inspecting the current `main` branch and recent commits; do not assume that previous fixes are correct merely because they were committed.

## Non-negotiable constraints

- Do **not** rebuild the application or replace its architecture.
- Do **not** create another database, authentication system, tenant model, or marketplace connector system.
- Do **not** redesign the UI or change the existing eBay listing architecture.
- Preserve the existing OnSpace/Supabase backend integration and current niche routes.
- Do not expose credentials, access tokens, refresh tokens, encryption keys, private customer data, or raw secret-bearing error messages in source, logs, tests, or reports.
- Do not claim that a production integration works unless it has been verified against the actual deployed service.
- Make the smallest safe changes needed to fix reproducible defects. Avoid unrelated refactors.
- Commit verified SWISH Web changes directly to `main`, as requested. Do not force-push or overwrite unrelated work.
- Treat the native app repository as a reference for intended behaviour, not as proof that the web implementation is correct.

## Current known context to verify

Recent SWISH Web commits addressed inventory query schema mismatches, workspace selection, legacy specialist IDs, inventory lifecycle tabs, draft submission entry points, and parity tooling. The native SWISH repository recently changed eBay item-specific persistence and the manual Android APK workflow. Re-test these areas against the current branch; do not presume the changes are complete.

The current SWISH Web `package.json` exposes `build` and `lint` scripts but no obvious dedicated test script. Determine what tests and CI workflows actually exist before choosing verification commands. The native repository has an open pull request, #33, for eBay credential-refresh persistence guards; its live backend and deployed-secret verification are not confirmed by repository source alone.

## Mission

Establish evidence-based readiness for SWISH Web's critical user journeys, particularly niche/tenant isolation and parity with SWISH Main App. Fix only confirmed defects that can be safely resolved in this repository, and produce a clear release-gate report.

### 1. Baseline and repository health

1. Inspect the current branch, recent commits, project structure, package manager and lockfiles, build configuration, CI workflows, routing, auth/session handling, Supabase client setup, and existing tests.
2. Confirm that changes target `main` and that the working tree/branch has no unexpected changes that would be overwritten.
3. Identify build, lint, type-check, and test commands that are actually supported by the project. Do not invent scripts.
4. Record the baseline results before modifying code.

### 2. Niche and tenant isolation — P0

Audit every data path involved in:
- selecting the authenticated user's workspace/tenant;
- resolving the user's subscribed niche and entitlements;
- loading inventory, drafts, active listings, orders, and marketplace connector state;
- creating, editing, deleting, and changing the status of inventory/listing records;
- importing eBay listings and refreshing eBay data;
- identifying an item and saving it into inventory;
- stock-check and staff-facing inventory views;
- master-admin niche switching and any explicitly authorised cross-tenant administration.

For every query and mutation, verify that the tenant/workspace and niche are derived from trusted authenticated context and consistently applied. Check that client-provided IDs cannot be used to read or modify another tenant's records. Confirm that legacy specialist IDs are mapped deliberately and only to the intended niche; do not make broad filters that leak inventory across niches.

Inspect relevant Row Level Security policies and Edge Function authorization assumptions where repository evidence is available. If live backend policies or deployed functions cannot be accessed, mark them **UNVERIFIED** and specify the exact evidence needed. Never treat a client-side filter as a substitute for server-side authorization.

### 3. Web/native parity — P1

Compare critical behaviour with the current SWISH Main App source where accessible:
- sign-in and workspace/niche resolution;
- inventory lifecycle/status tabs and record visibility;
- create/edit/save listing drafts and persistence of category/item specifics;
- image/media handling and record refresh;
- eBay draft submission, publishing, listing sync, orders, and messages;
- loading, empty, error, retry, and success states;
- stock-check workflow.

Create a compact parity matrix: journey, web behaviour, native reference, test/evidence, outcome, and remaining gap. Implement only clear, reproducible web defects that fit the constraints above.

### 4. Marketplace and credential safety — P0

Inspect web code for accidental credential exposure and unsafe direct access to connector credential payloads. Ensure marketplace secrets and token refresh/decryption remain server-side in the existing backend. Never move OAuth exchange, token refresh, or credential decryption into browser code. Do not print credential values while debugging.

Distinguish source-code verification from live verification. The following require authorised live evidence and must not be marked passed on source inspection alone:
- encryption-key secret exists in the deployed Edge Function environment;
- encrypted credential values can be decrypted by the deployed function;
- existing connected tenants remain connected and can refresh tokens;
- eBay listing, sync, order, message, and finance operations work end-to-end;
- tenant RLS and function authorization prevent cross-tenant access.

Do not make schema or credential migrations as part of this prompt unless an existing, reviewed migration is demonstrably required and safe; document blockers otherwise.

### 5. Regression coverage and verification

Add or extend focused automated tests for confirmed defects, especially:
- niche/tenant filtering and legacy specialist-ID mapping;
- workspace selection;
- listing item-specific persistence and draft save/load;
- inventory lifecycle and draft-submission behaviour;
- protection against cross-tenant reads and mutations at the application boundary.

Use the existing test setup if present. Do not introduce a large new testing framework without necessity. Run available tests, lint, type-check (if configured), and production build. Record exact commands and outcomes. If a command fails, capture the actionable error and fix only if the cause is within scope. Never report an unrun command as passed.

### 6. CI and release workflow

Inspect current GitHub Actions workflows and their latest available results. Verify the web production build workflow exists and is appropriate; do not add duplicate or speculative workflows. Check whether the workflow runs build, lint, and relevant tests and whether required environment variables are safely configured. Do not put secrets in workflow files.

For native APK workflow findings, document issues for the SWISH repository rather than making unrelated changes to SWISH Web.

### 7. Production-readiness report

Create or update a concise report under `docs/production-readiness/` containing:
- date and commit SHA inspected;
- files changed and why;
- P0/P1/P2 findings;
- test/build/lint commands and exact results;
- parity matrix;
- security checks and what was or was not verified;
- live backend/OnSpace/eBay checks that remain outstanding;
- deployment and rollback considerations;
- a release decision of **GO**, **CONDITIONAL GO**, or **NO-GO**, with explicit evidence and blockers.

Use **NO-GO** if a critical tenant-isolation or credential-security risk remains unresolved, or if essential verification is unavailable. Do not equate a successful frontend build with production readiness.

## Completion criteria

This prompt is complete only when:
1. The audit and parity matrix are committed.
2. Any in-scope fixes have focused regression coverage where feasible.
3. All available checks have been run and reported honestly.
4. Changes are committed directly to `main` without force-pushing.
5. The final response gives the commit SHA, changed files, verification results, outstanding live checks, and release decision.

If a critical issue depends on inaccessible OnSpace/Supabase configuration or production credentials, do not guess or bypass the check. Document the blocker and the exact safe action an authorised operator must perform.

**Start with inspection and evidence, then make the smallest justified changes. Do not declare SWISH Web production-ready until all critical release gates have evidence.**
