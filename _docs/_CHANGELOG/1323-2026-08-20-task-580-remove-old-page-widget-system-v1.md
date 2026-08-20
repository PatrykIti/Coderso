# 1323 - TASK-580 Remove Old Page Widget System V1

**Date:** 2026-08-20
**Version:** Unreleased
**Tasks:** TASK-580, TASK-580-01, TASK-580-02, TASK-580-03, TASK-580-03-L01, TASK-580-03-L02, TASK-580-03-L03, TASK-580-03-L04, TASK-580-03-L05, TASK-580-03-L06, TASK-580-03-L07, TASK-580-04

## Key Changes

### TASK-580 Remove Old Page Widget System V1 (family)
- Removed the v1 page-widget authoring/render system end to end: the
  `core/widgets/**` render kernel, the v1 public page runtime
  (`core/site/pageRuntime.tsx`, `renderPublicPageHtml`,
  `renderPublicPageRuntimeHtml`), per-type block hydration, the v1 admin
  widget surface (`core/admin/ui/widgets/**`,
  `core/admin/ui/pages/builder/**`), Widget Library, widget templates, and the
  `modulePackMatrix` pack gate. Public pages and entry detail pages now render
  exclusively through the Page V2 pipeline
  (`renderPublicPageV2RuntimeHtml` + `core/services/pages/*`).
- Relocated the V2-shared widget contracts into
  `core/services/renderContracts/*` (legacy widget block placeholder, hero,
  listing filters + renderer, navigation, content list, appointment form,
  template section) so surviving domain callers keep working without a widget
  kernel.
- Migrated stored `detail_page_documents` off `WidgetBlock[]` to
  `PageDocumentV2` (schemaVersion 2, `sections[]`/`bindings[]`); migration
  `0079` backfilled existing v1 rows and the read adapter converts any
  remaining v1 row in memory. Unmapped v1 widget types survive only as
  read-only `legacy-widget` placeholder blocks (byte-identical `props.data`,
  never rendered or logged).
- Retired the `task-467` runtime-smoke adapter (its surface — the v1 widget
  editor — no longer exists) and its evidence contract; the shared
  runtime-smoke entry point, suite registry, and CLI were rewired
  accordingly.
- Deleted the tests whose production files were removed and rewired the
  surviving suites to the relocated contracts; added a deletion-guard suite
  (`tests/vitest/admin/legacy-widget-surface-retired.test.ts`) pinning the
  absence of the kernel, v1 render exports, hydration/registration calls, and
  `widgets:read` permission.
- Docs: `_docs/WIDGETS.md` and `_docs/_WIDGETS/*` reduced to tombstones;
  `_docs/WIDGET_PACK_MATRIX.md` updated; `_docs/ADMIN_CACHE*.md`,
  `docs/develop/*`, `_docs/TESTING_STRATEGY.md`, and `_docs/ARCHITECTURE.md`
  updated to state the v1 widget surface is removed, not retained.
- Validation: `bun --cwd core lint` + `lint:types`, full Vitest
  (853 files / 6665 tests) and full Bun lane green, `check:admin-boundary` +
  `check:admin-bundle` green, lane manifest regenerated (423 rows:
  A166/B201/C51/perf5). Stale `AGENTS.md` policy line recorded as a
  follow-on note (no AGENTS.md edit without owner sanction).
- Closure correction (verified at final HEAD): the 4
  `tests/integration/runtime/detail-page-composer-runtime.test.tsx` failures
  were a real TASK-580-03 L04 regression, not the pre-existing flake noted in
  L07. The fixture authored a v1 `stats-kpi` block with an `items.0.value`
  binding; after the V2 public render cutover that converts to a `custom`
  section + `legacy-widget` placeholder (`detailPageV2WidgetMap.ts`), the
  entry-field binding was dropped. Re-run at base `3c470092`: 7/7 pass; at
  final HEAD before the fix: 4/4 deterministic assertion failures. Fixed the
  fixture to the V2 contract (`feature-grid` with `items[0].title`, binding
  `items.0.title` via `itemBindingRemap`); final isolated run 7/7 pass.
- Closure runtime smoke: `detail-page-v2` suite (`wf58004smoke`) PASS 5/5
  scenarios (public-detail-converted, preview-token, editor-roundtrip dark,
  legacy-placeholder, assistant-generated; 0 console errors; screenshots in
  `_docs/_workflows/_smoke/`), plus a playwright-cli sanity pass covering the
  remaining required flows: Dashboard widgets untouched (TASK-480 registry +
  renderers load, 0 legacy-widget nodes), custom screens admin surface (light
  + dark visible effect), and the retired Widget Library route renders "Page
  not found" with no nav entry. The shared DB admin path was snapshot/forced
  to `/admin` for the smoke and restored to `/admin-panel` afterwards
  (matching the task-540 lease pattern; `site.publicBaseUrl` likewise).
