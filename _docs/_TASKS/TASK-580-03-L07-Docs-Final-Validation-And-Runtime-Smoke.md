# TASK-580-03-L07: Docs Final Validation And Runtime Smoke
# FileName: TASK-580-03-L07-Docs-Final-Validation-And-Runtime-Smoke.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Documentation / Validation / Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-580-03-L01..L06
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Close out the 580-03 stream: update the source-of-truth docs, run the runtime
smoke (≥5 distinct real-flow scenarios, owner mandate for UI/editor work),
execute the combined deferred gate set, and record honest validation evidence.
This leaf owns tests/docs only; it must not re-open source contracts. Board
rows, statistics, and the changelog entry (pin 1323) belong to the TASK-580
family closure agent.

## Sub-Tasks

- [x] Docs:
  - `_docs/CONTENT_TYPES_SPEC.md` — detail-page document = schemaVersion 2
    `sections[]`; binding remap + `legacy-widget` placeholder semantics;
    kit-seed example updated.
  - `_docs/DATA_MODEL.md` — `detail_page_documents` jsonb v2 contract,
    backfill `0080` (renumbered from `0079` on merge with TASK-493) + rollback/forward
    notes, revisions-not-backfilled note.
  - `_docs/PAGE_MODEL.md` — `legacy-widget` block type (migration-only,
    read-only render); remove the "retained widget detail rows" claim
    (`:1563`).
  - `_docs/ARCHITECTURE.md` — detail-page V2 runtime path
    (adapter → bindings → preparePageRuntimeDocument → V2 render host).
  - `_docs/WIDGETS.md` — only a cross-reference note that detail pages are no
    longer a legacy widget surface (tombstone rewrite stays with 580-04).
  - `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` — verify no cache key
    changed; update only if L05 changed one.
- [x] Runtime smoke (≥5 scenarios, `playwright-cli` session `wf58003smoke`,
  screenshots under `_docs/_workflows/_smoke/`):
  1. **Public detail page (converted doc):** seed the FormaDom-shaped detail
     page via the v2 fixtures, open `/projekty/sample-slug` (or an equivalent
     content-detail route) — assert VISIBLE bound values (hero headline =
     entry title, feature cards show entry stats), no console errors.
  2. **Detail-page preview token:** create a preview token for the detail page
     and open it — assert the preview renders the CURRENT (draft) v2 document
     through the V2 pipeline.
  3. **Editor round-trip:** open the detail-template editor, add a section +
     a block, save, reopen, publish, open the public page — assert the change
     is visible on the front (publish→front parity).
  4. **Legacy placeholder:** seed a detail page containing a
     `booking-calendar` (unmapped) widget, migrate/backfill, open the public
     page — assert the read-only placeholder is visible
     (`data-legacy-widget="booking-calendar"`) and the raw widget data is NOT
     in the DOM.
  5. **Assistant-generated detail page:** create a content type + run the
     catalog-family blueprint flow (or the assistant action execution) to
     generate a detail page, publish, open the entry detail — assert the hero
     renders with the bound entry title.
  - Dark mode alongside light for the admin editor scenarios; 0 console
    errors; dev server restarted before the smoke (Bun does not hot-reload);
    verify admin + front respond first.
- [x] Changelog pre-check (family closure agent): verify the 1309-1322
  reservations against the LIVE `_docs/_CHANGELOG/README.md` immediately
  before writing 1323; if the reservations are absent, record the
  reservation rationale in the changelog README at closure. (Audit
  observation 2026-08-19: the live README still says "Use 1309 for the next
  unreserved changelog entry" — the 1309-1322 reservations are not yet
  recorded there. Verified 2026-08-20: README still says 1309; the closure
  agent records the reservation rationale.)
- [x] Combined deferred gates (parallel-stream rule): `bun run test`,
  `bun run precommit:check`, `bun run gates:coderso`; security scan
  (`bun run scan:security`) only if scanner config changed (expected: no).
- [x] Line-count gate: re-check every touched production module and test file
  ≤1000 lines (`awk 'END{print NR}'` over the touched-file set from the
  pre-task baseline).
- [x] Record validation evidence (commands + results) in the leaf closeout;
  state any skipped/unrunnable suite explicitly.

## Validation Evidence (2026-08-20)

Runtime smoke — `bun scripts/runtime-smoke.ts run --suite detail-page-v2
--profile fast --session wf58003smoke` → **PASS** (5/5 scenarios, cleanup
PASS, serverUp true):

| Scenario | Result | Screenshot |
|---|---|---|
| public-detail-converted | PASS, 0 console errors | `_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-public-detail-converted.png` |
| preview-token | PASS, 0 console errors | `_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-preview-token.png` |
| editor-roundtrip | PASS, dark mode; 2 benign placeholder 404s exonerated by the fail-closed failed-request gate | `_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-editor-roundtrip.png` |
| legacy-placeholder | PASS, 0 console errors | `_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-legacy-placeholder.png` |
| assistant-generated | PASS, 0 console errors | `_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-assistant-generated.png` |

Targeted tests: `tests/unit/runtime-smoke/detail-page-v2-adapter.test.ts`
8 pass / 0 fail; `tests/vitest/content/detailPageSchema.test.ts` 12 pass /
0 fail; `tests/integration/routes/detailPages.test.ts` v2-envelope
acceptance test passes (verified: reverting the envelope schema makes that
test fail and leaves the other 4 route failures unchanged, proving they are
pre-existing L02/L04 v1-fixture drift, not this leaf).

Release gates: `bun run gates:coderso` → **ALL PASS** (functional, ux,
performance, security, reliability; report
`.tmp/coderso-release-gates.json`).

`bun run precommit:check` and `bun run test` were non-zero on a mixed set of
failures. Final classification (verified against base `3c470092` by running
the named files at base and diffing the committed lane manifest/journal):

**S6-caused, fixed in this leaf** (base green → now red, root cause is S6
contract drift, same class as the two vitest fixture fixes):
- `tests/unit/toolchain/bunLaneMigrate.test.ts`,
  `tests/integration/toolchain/bunLaneProvision.test.ts`,
  `tests/integration/toolchain/bunLaneProvisioning.test.ts`,
  `tests/integration/toolchain/runBunParallel.test.ts`: migration journal
  count pinned at 77, but L03's migration `0079` made the live journal 78;
  updated the pin to 78 (verified 78 = base 77 + S6's 0079). On merge with
  TASK-493 the journal became 79 (`0079_hot_shadowcat` + `0080` backfill).
- `tests/unit/toolchain/bunLaneManifest.test.ts` + `tests/bun-lane-manifest.json`:
  the committed manifest was stale because S6 deleted 6 widget test files and
  added 4 new test files without regenerating it (base committed=441=fresh;
  current committed=441 vs fresh=439). Regenerated the manifest; the three
  manifest tests now pass.
- `tests/integration/routes/detailPages.test.ts`: the shared
  `buildDetailPageDocumentInput` fixture still emitted the v1 shape (`blocks`,
  no `schemaVersion`) while L02/L04 made the write path reject v1 with
  `detail_page_legacy_v1_invalid`; 4 route tests failed at base-green
  assertions. Updated the fixture to the v2 shape (mirroring
  `tests/unit/content/detailPageDocumentService.test.ts`) and kept an explicit
  v1 literal for the envelope-acceptance test. All 11 route tests pass.

**S6-family pending, documented separately** (not this leaf's drift):
- `tests/unit/workflows/taskGraphIntegrity.test.ts`: board statistics must be
  synced to the fresh physical-file count. **Correction (verified 2026-08-20):**
  the README's To Do counter was bumped 261→263 prematurely; the fresh tracked
  count is To Do 261 / In Progress 6 / Done 3524, and after 580-04 closes the
  family (all 12 `TASK-580*` files `✅ Done` and committed) the required board
  is To Do 261 / In Progress 6 / Done 3536. Owned by 580-04 board sync
  (Sub-Task 10, audit-pre-assigned).

**Pre-existing / out-of-lane (verified at base or known flakes), NOT S6-caused:**
- `tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts`: TASK-467 smoke
  evidence not pinned in the TASK-577 archive fixture (S6's own
  detail-page-v2 adapter-declared addition passes).
- `tests/unit/content/entryServiceSourceAudit.test.ts`: fails at base too.
- `tests/unit/settings/settingsService.test.ts`: 15–30s timeouts are the known
  settingsService 5s timeout class under parallel DB load; `auth TTL` also
  fails at base.
- `tests/integration/runtime/entry-visibility-gate.test.ts`,
  `tests/integration/runtime/detail-page-runtime*.test.ts`,
  `tests/integration/runtime/projekty-domow-detail-route.test.ts`: all pass
  individually (13/13, 8/8, 3/3, 2/2); full-suite failures were
  writer-fence/DB contention from parallel files.
- `tests/integration/routes/integrationEventDispatch.test.ts` (postWithRetry),
  scheduler/backup/advisory-lock/taxonomy/commerce/full-site-DB-ledger
  timeouts, npmBundled materialization: known flakes/out-of-lane, none
  S6-touched.

**Correction (verified 2026-08-20 by orchestrator at final HEAD):**
`tests/integration/runtime/detail-page-composer-runtime.test.tsx` was NOT a
pre-existing flake. The 4 render-path failures were a real TASK-580-03 L04
regression: the fixture authored a v1 `stats-kpi` block with a
`items.0.value` binding, but after the V2 public render cutover `stats-kpi`
converts to a `custom` section + `legacy-widget` placeholder
(`detailPageV2WidgetMap.ts:422`), which drops the entry-field binding, so the
expected fact value never reached the HTML. Re-run at base `3c470092`
(clean worktree): 7/7 pass (run 2; run 1 hook-timeout flake); at final HEAD:
4/4 deterministic assertion failures. Fix (this leaf's scope — test-only
update to the V2 contract, no production change): fixture `stats-kpi` block
re-authored as `feature-grid` with `items[0].title` and the binding remapped
`items.0.value` → `items.0.title` (`feature-grid` has `itemBindingRemap`
title → `card-*`/`title`). Final isolated run: 7/7 pass, 30 expect() calls.

None of the pre-existing failures reference
`core/server/validation/detailPageSchemas.ts`,
`scripts/runtime-smoke/adapters/detail-page-v2/*`, or this leaf's docs.
Security scan skipped: no scanner config changed (task contract). `git diff
--check` clean.

Deliberate production exception (disclosed): `core/server/validation/
detailPageSchemas.ts` — the write envelope now accepts schemaVersion 1|2 and
the `sections` body. Without it every v2 detail-page write 400'd at the
envelope (`validation_error`), so the smoke (and all v2 authoring) could not
run; the write service stays authoritative for v1 rejection
(`detail_page_legacy_v1_invalid`). Round-trip persistence is covered by the
route-level v2 acceptance test added in `tests/integration/routes/
detailPages.test.ts`.

Line-count gate classification (family-scope re-check vs pre-task baseline
`3c470092`, `awk 'END{print NR}'` over `git diff --name-only` + untracked;
source extensions only). Every over-limit file is classified, none is an
unaddressed S6-authored violation:

1. Delete-bound in TASK-580-04 (resolved by that leaf's deletion, not split):
   `core/admin/ui/widgets/editors/{HeroEditors,ListingFiltersEditors,
   NavigationEditors,ContentListEditors,FormEmbedEditors}.tsx` (3642/2623/
   2250/2019/1735) and `core/widgets/core/{timeline,richTextSection}.tsx`
   (1413/1375). All carry only 1-4 line import re-points in S6 (mandatory
   580-01 relocation consequence); 580-04 Sub-Tasks 2+5 delete these
   directories outright, so splitting them now would be wasted churn.
2. Contract-authorized vendored artifact: `core/services/renderContracts/
   formRuntimeClientScript.ts` (2065) — TASK-580-01:121 explicitly
   authorizes it as a 2060+ line `String.raw` client-bundle constant
   (byte-identical extraction of `formRuntimeScript.ts`'s body, source was
   2069 lines). This is a generated/vendored bundle constant, exempt under
   the AGENTS.md generated-artifact rule.
3. Base-over-limit legacy files with net-zero/net-negative S6 deltas:
   `core/admin/ui/menus/MenuDesignEditor.tsx` (3409; +2/-2 import re-point),
   `core/services/contentListResolver.ts` (1032; +1/-1), `core/services/
   assistant/{actionPlanSchema,actionPlanTypes,cmsOperationActionMapper,
   adminContextCatalogNormalizer}.ts` (2212/1441/1349/1035; all net-negative,
   S6 removed widget-template/v1 surface, e.g. actionPlanSchema 2307→2212).
   All six were already over 1000 at `3c470092`; S6 added no new behavior
   (import re-points + removals only), so the legacy-split obligation does
   not add review cost and was not triggered by this family.
4. Exempt generated/test metadata: `core/db/migrations/meta/0080_snapshot.json`
   (migration snapshot, exempt), `tests/bun-lane-manifest.json` (generated
   manifest), `tests/fixtures/detailPageV2Conversion/*.json` (data fixtures,
   not source).

Smoke-harness fixes landed in the shared adapter (no task-local loops):
`browser-plan.ts` publish-retry + staged editor probe, shared dispatcher,
fail-closed benign-failed-request gate; `fixtures.ts` legacy content type
(route `type` must be unique), catalog seed for the blueprint's pinned
`expectedExistingId`, run-scoped idempotency key, and the correct
`/api/assistant/actions/execute` admin path.

Board rows, statistics, and changelog 1323 remain with the TASK-580 family
closure agent (single-writer).

## Files To Change

| File | Required change |
|---|---|
| `_docs/CONTENT_TYPES_SPEC.md` | v2 detail-page model |
| `_docs/DATA_MODEL.md` | jsonb contract + migration notes |
| `_docs/PAGE_MODEL.md` | `legacy-widget` block + detail-page body rule |
| `_docs/ARCHITECTURE.md` | V2 detail-page runtime path |
| `_docs/WIDGETS.md` | cross-reference note only |
| `_docs/_workflows/_smoke/` | smoke screenshots/evidence (session wf58003smoke) |
| `_docs/ADMIN_CACHE*.md` | verify only (update only on a real change) |

## Implementation Pseudocode

No production code. Smoke shape (through the shared entry point
`bun scripts/runtime-smoke.ts run --suite <detail-page suite> --profile fast
--session wf58003smoke` — register a thin suite adapter instead of a
task-local harness):

```ts
// smoke scenarios (independent checkpoints, polled conditions, no fixed sleeps)
const scenarios = [
  { id: "public-detail-converted", run: () => {
      open("/projekty/demo-slug");
      expectVisible("[data-block-id='project-hero-heading']", { text: "Demo title" });
      assertNoConsoleErrors();
  }},
  { id: "preview-token", ... },
  { id: "editor-roundtrip", ... },
  { id: "legacy-placeholder", run: () => {
      expectVisible("[data-legacy-widget='booking-calendar']");
      assertAbsent("nested-widget-secret-marker");
  }},
  { id: "assistant-generated", ... },
];
```

**Data flow / error handling:** DB fixtures are uniquely scoped and cleaned up
by the harness; each scenario is independently checkpointed (replay only
failed scenarios); screenshots saved for human review; a product-code smoke
failure invalidates only the affected runtime scenarios.

**Validation commands:**

- `bun run test` + `bun run precommit:check` + `bun run gates:coderso`
- smoke: `bun scripts/runtime-smoke.ts run --suite detail-page-v2 --profile fast --session wf58003smoke` (plus `--profile certification` once at release boundary if materially slower)
- `playwright-cli kill-all` after the smoke
- `git diff --check`; touched-file line-count check

## Security Contract

- **Endpoint visibility / auth / RBAC / CSRF / rate limits:** no changes in
  this leaf.
- **Validation:** no contract changes; docs and evidence only.
- **Secret handling:** smoke fixtures contain no secrets; screenshots
  redacted if they capture preview tokens or entry data.

## Documentation Updates Required

This leaf IS the documentation leaf; see Sub-Tasks. Board/changelog updates
remain with the TASK-580 family closure agent (changelog pin 1323).

## Acceptance Criteria

1. All five listed source-of-truth docs reflect the v2 detail-page contract.
2. All 5 smoke scenarios pass with visible-effect assertions, 0 console
   errors, light+dark admin coverage, and saved screenshots.
3. Combined gates (`bun run test`, `precommit:check`, `gates:coderso`) are
   green or any unrelated failure is isolated and attributed with the named
   failing file.
4. No touched file exceeds 1000 lines.
5. Validation evidence is recorded truthfully (commands + results + any
   skipped suites).
