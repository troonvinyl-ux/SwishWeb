# Shared scan-to-list implementation — web rollout

The web prototype follows the app's documented Photos → Next → List now / Save for later contract (SWISH/docs/SWISH_SHORT_LISTING_FLOW.md). The new pure contract in `src/lib/sharedScanFlow.ts` centralises evidence slots and publication readiness for twelve profiles, including Tunes and Tools. It is a foundation, **not** a wired end-to-end scanner or a verified eBay publication flow.

## Next integration gates
1. Replace the niche-specific capture forms with one shared capture UI and a configuration adapter, retaining existing tenant/entitlement guards.
2. Wire existing authenticated identification, catalogue/barcode, valuation and photo-storage services. Preserve original evidence and accepted processed photos; never infer physical condition from a catalogue.
3. Show one listing preview with only missing required specifics as questions. Save for later must persist the existing canonical item ID even when publication is blocked.
4. Wire List now to the existing seller-approved server-side publication pipeline; no client secrets, fake publication success, or new database.
5. Confirm specialist IDs against the main app before enabling Tunes/Tools routes. Existing web routing currently supports fewer niches; profiles alone do not activate subscriptions.
6. Add tests for every niche's evidence requirements, save/reopen, no duplicate items, photo persistence, scoped inventory, barcode ambiguity, eBay preflight, and both action paths.
7. Run typecheck/build and authenticated device tests before asking the owner to press Publish in OnSpace.

## Known current limitation
The existing `NicheCapture.tsx` and `Identify.tsx` remain separate legacy experiences. This commit introduces shared rules without changing production routes. It is not yet ready to publish as the new three-action workflow.
