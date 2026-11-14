# SWISH web source, synchronization and release policy

## Authority and scope

Native source: https://github.com/troonvinyl-ux/SWISH, inspected at `345a3cfcb7be78f18c0257d55694afb015ddf9c2` on 2026-11-14. The web client remains React/Vite; native Expo UI is not copied into this runtime. `config/swish-source.json` pins the source and contract subtree IDs, **not a parity approval**. The initial review is deliberately pending.

The existing web backend URL matches the literal callback backend in native `app/ebay-account.tsx` and `supabase/functions/swish-ebay-oauth/index.ts`: `https://iwgaqieyoahmcjfziwga.backend.onspace.ai`. The native runtime uses `EXPO_PUBLIC_SUPABASE_URL` in `template/core/config.ts`; therefore this source match does **not** prove deployed runtime identity, ownership, Cloud binding, RLS, or service availability. Verify those against the existing SWISH OnSpace project before live acceptance. Do not initialize a replacement Cloud project or Stripe integration here. Never copy native `.env`, service-role credentials, marketplace tokens or payment secrets to browser code.

## Source-derived corrections in this pass

- Login product branding uses the existing twelve-product registry rather than a contradictory partial list. Shared accounts and subscription-governed niche switching are described accurately. Verification PIN normalization uses the correct digit regex; the existing four-digit configured UI is retained, not claimed independently verified against deployed email settings.
- Onboarding delegates connection to `/ebay`, which already uses the confirmed `swish-ebay-oauth` subscriber action. Connector status is read from tenant-scoped `marketplace_connectors`, not guessed `ebay_accounts` or `ebay-auth-url` contracts. Profile and completion actions inspect backend errors before claiming success.
- `/ebay/account` now renders native-equivalent connection health and five granted capability flags. No encrypted connector field or token is queried.
- The existing eBay OAuth flow stores only a user/tenant-scoped start timestamp to resume status polling after same-tab navigation. The inspected callback serves HTML; it does **not** promise an automatic web redirect. Users return to the web tab or `/ebay` and refresh; a fully reviewed browser return journey remains a release requirement.
- Shared tables refresh through foreground polling and focus refetch rather than assuming unsupported Realtime. Query caches clear on account changes; route state remounts on user/niche changes. These measures do not replace RLS or comprehensive tenant isolation tests.
- Listing verification results remain visible; editing invalidates the result. Drafts must be saved, server verification must pass, and a separate explicit confirmation precedes the existing eBay publish request. Publication uses the canonical resolved tenant instead of an arbitrary membership. These are frontend guards; existing server authorization remains authoritative.
- Frontend public-key validation rejects service-role, expired and wrong-project JWT configurations before client creation.

## Confirmed payment blockers — do not paper over them

At the pinned source, `swish-create-checkout` takes `{ nicheId, appScheme? }`, creates a real subscription using its existing price, and hardcodes native `${callbackScheme}://subscription/success` and `.../cancel` URLs. `swish-customer-portal` hardcodes `onspaceapp://subscription`. Browser-supplied web return URLs are not supported. Do not invent `returnUrl`/`successUrl` parameters, new Stripe customers/products, or a new billing backend. Tunes Flip checkout is explicitly disabled in the existing native backend pending an owner-approved rollout.

A source-repository change must be separately reviewed to allow exact HTTPS web return URLs for `swishflip.co.uk` while retaining existing native callbacks and shared Stripe user ownership. This workspace has not changed or deployed that backend. Record passing real-account evidence before enabling a full-parity web release.

## Continuous cross-repository update review

`SWISH source contract review` runs on web PRs, main pushes, manual dispatch, and every six hours. It checks the pinned snapshot and compares native main's app/services/constants/tenant hooks/auth/template/shared/niches/backend/workflows trees. It fails closed on source access failure, removed contracts or drift and emits a compare link and JSON report without private source bodies. No source code, backend migration or native change is automatically imported or deployed.

For private source access, configure a **read-only** `SWISH_SOURCE_READ_TOKEN` limited to native repository contents. The web `GITHUB_TOKEN` generally does not grant cross-private-repository access. Fork PRs without that token fail closed. Do not use `pull_request_target` to run untrusted branch scripts with secrets.

When native changes:

1. Read the native compare report; identify changed screens, schemas, payloads, tenant/niche rules, billing and marketplace semantics.
2. Create a web PR containing corresponding implementations, tests and parity-register updates. Run `node scripts/check-swish-source.mjs --record <full-native-sha>` locally to record a **pending** baseline candidate, never to approve automatically.
3. Complete impact review and mark baseline review `approved` with its SwishWeb pull-request URL only after an actual owner review. Exclusions require a documented product decision, not a silent placeholder.
4. Run both clients' applicable regressions against the same approved backend. Refresh evidence after any candidate source change.

The polling check works without editing native CI. To shorten detection latency, native maintainers may later add a reviewed dispatch integration; no native workflow was modified by this session.

## Required GitHub settings — operator action, not assumed active

Configure a main-branch ruleset requiring PRs, Code Owner approval, dismissal of stale reviews, approval of the latest push, `Web build and lint / verify`, and `SWISH source contract review / source-contracts`. Restrict direct push and bypass permission. `.github/CODEOWNERS` declares review ownership but cannot itself enforce those settings.

Create the `swishflip-production` environment with required owner review, prevent self-review and permit only main. Environment protection settings cannot be created by these file tools; an unprotected environment does not constitute reviewed approval.

## Pre-publication evidence and candidate workflow

`web-release-evidence.json` starts blocked, with no fabricated results. Fill every required check in `scripts/lib/swish-contracts.mjs` with `{ "status": "passed", "reviewer": "...", "evidenceUrl": "https://..." }`, real `testedAt` and an empty `knownGaps` only once gaps are resolved. Evidence must cover shared accounts, registration, tenant/niche isolation, inventory/photos, save/reopen specifics, preflight/publish, OAuth return, uncertain eBay recovery, dispatch, Stripe web callbacks and full native parity.

After committing all non-evidence candidate changes, compute `node scripts/check-swish-source.mjs --digest`. Paste the exact digest into evidence and commit the evidence only. The digest covers every tracked file except this evidence file and `.env*`; changing code/config/docs/tests/workflows invalidates prior evidence. Newly added files must be tracked first. Run the release candidate workflow from main; it requires exact native-head alignment and evidence no older than seven days, then lint, regressions and build. The output is a reviewed build artifact, **not a deployment**.

This workflow does not deploy to OnSpace, configure DNS or control the OnSpace Publish button. To enforce the boundary, the publishing operator must use only the approved candidate and restrict platform publishing rights through the existing team's process. Do not publish `swishflip.co.uk` from an unverified preview, an old artifact or a source-drifted branch.

## Verification honesty

No shell/test runner, authenticated native/mobile account, production eBay/Stripe credentials, GitHub ruleset API or existing Cloud binding was available in this editor session. Added checks run in GitHub or locally; they are not recorded as passing live acceptance. Static route checks are regression guards, not proof that every native workflow is functional. See `SWISH_MAIN_APP_PARITY_REGISTER.md` for remaining gaps.
