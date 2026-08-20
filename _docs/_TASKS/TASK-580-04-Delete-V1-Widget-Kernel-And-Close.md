# TASK-580-04: Delete V1 Widget Kernel And Close
# FileName: TASK-580-04-Delete-V1-Widget-Kernel-And-Close.md

> **Pre-implementation drift audit (2026-08-20, fresh-context agents on the
> live worktree after 580-01/02/03 landed):** 2 HIGH + 9 MEDIUM + 11 LOW
> findings were verified on disk and integrated below. The two HIGH findings
> (Sub-Task 7 rewire plan + WidgetBlock type home; 580-02's un-landed
> assistantRoutes rewire) are pre-assigned to specific sub-tasks in this file.
> Anchors re-verified: `pageRuntime.tsx` exists, `siteCache.ts:211` exact,
> `widgetPreviewRoutes.ts` exists, `routes/index.ts:35/:175` exact, editors
> dir = 46, `_docs/_WIDGETS` = 44, `tests/vitest/widgets` = 59,
> `tests/unit/widgets` = 7, `FormDesignPanel.tsx:30` uses relocated
> `SharedColorControl`, `AGENTS.md:87/:622-626` current, `PageEditor.tsx`,
> `DetailTemplate*`, `publicEntryRender.tsx`, `publicSite.tsx` are V2-only.
> `core/widgets/core/` has 60 modules (not 63; 3 relocated by 580-01).

**Parent Task:** TASK-580
**Priority:** High
**Category:** Legacy Removal / Docs / QA
**Estimated Effort:** Large
**Dependencies:** TASK-580-01 (shared-contract extraction), TASK-580-02 (authoring-surface deletion), TASK-580-03 (entry-detail-page migration to V2)
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20
**Started:**
**Completed:**

---

## Overview

- **Goal:** Delete the v1 page-widget render kernel and every remaining authoring/preview
  surface that 580-01/02/03 made dead, then close the TASK-580 family with docs, tests,
  changelog 1323, board sync, and runtime smoke. After this leaf, `core/widgets/**` and
  `core/admin/ui/widgets/**` no longer exist as importable modules, the public entry-detail
  path renders exclusively through Page V2, and no admin surface still references the old
  Widget Library, v1 builder panels, preview routes, or module-pack matrix.
- **Owning module/service:** `core/site` (public render path), `core/server` (render context
  + routes), `core/admin/ui/pages/builder`, `core/admin/ui/widgets`, `core/services/customScreens`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/TESTING_STRATEGY.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, `_docs/WIDGETS.md`,
  `_docs/WIDGET_PACK_MATRIX.md`, `_docs/_WIDGETS/*`, root `AGENTS.md` (Product Contract Rules).
- **Out of scope (do NOT touch):** Dashboard widgets (`TASK-480`, `core/services/dashboard/**`,
  `core/admin/ui/dashboard/**`); the plugin store (`core/plugins/**`, `store/**`, `packages/sdk/**`);
  Page V2 files owned by S3 (`core/services/pages/**`, `PageEditor.tsx`) unless the sibling
  contract explicitly assigns them here; `core/services/widgets/*` service layer only if 580-02
  has already scheduled its removal (see Sub-Task 5 note).

**Land order:** 580-04 lands FOURTH and LAST. It must re-verify the current on-disk state before
every deletion because 580-01/02/03 mutate the same import graph. This file matches that land
order; the parent author owns `_docs/_TASKS/README.md` rows for the family, and only the closure
sub-task in this file touches `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`.

**Strategy note (from S6 research R1–R4, verified at HEAD `3c470092`):** Strategy A approved.
A partial registry/validator deletion is NOT safe: `normalizeWidgetBlock` throws
`widget_unknown_type` and the detail-page resolver catch turns that into a whole-page 404
(`core/widgets/validator.ts:150-152`, `detailPageRuntimeResolver.ts`). Therefore deletion is
all-or-nothing per surface and must happen only after 580-03 proves the entry-detail path no
longer imports the v1 kernel. `core/widgets/core/*` additionally contains shared contracts
consumed by Page V2 (`contentList`, `formEmbedContract`, `listingFilters`, `navigation`,
`widgetSafeHref`, `timelineLucideIcons`, `appointmentFormContract`); 580-01 owns relocating
those to a neutral module before 580-04 deletes the remainder.

---

## Security Contract

- **Endpoint visibility:** removal only; no new endpoints. Four admin-internal preview routes
  (`entryTeaserPreviewRoutes.ts`, `productComparePreviewRoutes.ts`, `productGalleryPreviewRoutes.ts`,
  `productTablePreviewRoutes.ts`) are deleted, and their remaining registration file
  `core/server/routes/widgetPreviewRoutes.ts` (renamed by 580-02 from `widgetRoutes.ts`; the
  `GET /widgets` catalog aggregator was already removed by 580-02) becomes empty and is deleted.
  They were registered under `core/server/routes/index.ts` with admin session + RBAC
  (`widgets:read` for the catalog). Their deletion closes attack surface; it must not leave a
  permissive fallback route or a dangling registration entry.
- **Auth model:** n/a (no surviving endpoints introduced). Admin/internal sessions continue to use
  the existing middleware unchanged.
- **RBAC:** n/a for new surface. Verify no route file still references the deleted
  `widgets:read` permission after removal (or keep the permission only if another surviving
  resource legitimately owns it — do not invent a new owner).
- **CSRF:** n/a (no admin/internal write endpoints added; deleted routes are read/JSON-preview only).
- **Rate-limit bucket:** n/a for removal. If any surviving route registration must be renumbered,
  preserve the existing bucket assignment; do not change buckets as part of deletion.
- **Validation:** no new schemas. Deletion of `widgets/validator.ts` and `widgets/types.ts` is safe
  only after 580-01 relocated the shared contracts and 580-03 stopped calling
  `ensureRuntimeWidgetsRegistered` / `normalizeWidgetBlocks` / `normalizeWidgetBlock`. The
  implementation gate is `grep`-proven absence of importers (see Sub-Task 1).
- **Anti-abuse:** n/a.
- **Secret handling:** confirm none. No secrets, provider keys, or privileged settings may move into
  browser cache, logs, or debug payloads. The deleted preview clients never held secrets; verify no
  redacted debug payload references them after removal.

---

## Sub-Tasks

### Sub-Task 1 — Pre-flight import-graph verification (gate for every later delete)

Verify, at implementation time, that each file scheduled for deletion has zero importers. 580-01/02/03
landed first and changed the graph, so re-verify fresh, do not trust this contract's line numbers.

- [x] For each deletion candidate run `grep -ran "<target-path-or-module>" core tests scripts --include=*.ts --include=*.tsx` and confirm **0 matches** outside the file itself, its own directory, and already-approved remove-with-file siblings.
- [x] Known TSX binary-misdetection: use `grep -an` (not bare `rg`) on `PageEditor.tsx`, `MenuDesignEditor.tsx`, `menuDocumentV2.ts`, `menuDocumentCss.ts`, and any other file where `rg` returns an empty result unexpectedly. An empty `rg` result on those files is not evidence of absence.
- [x] Record the residual importer list. Each leftover importer must be attributed to exactly one owner: `580-01` (contract relocation), `580-02` (authoring surface), `580-03` (detail-page migration), or **in-scope rewire in this leaf**. If a leftover importer belongs to a sibling, STOP and coordinate; do not delete its target.
- [x] Build the per-directory deletion manifests (Sub-Tasks 2–7) only from files that pass the zero-importer check.

**Verification commands (run and record output):**

```bash
cd /home/coder/project/Coderso-s6
# top-level kernel
grep -rln "widgets/types\|widgets/registry\|widgets/runtime\|widgets/validator\|widgets/slots\|widgets/renderContext\|widgets/editorContract\|widgets/runtimeScripts\|widgets/modulePackMatrix" core tests scripts --include=*.ts --include=*.tsx
# renderers + core
grep -rln "widgets/renderers/widgetRenderer\|widgets/core/" core tests scripts --include=*.ts --include=*.tsx
# admin widget surface
grep -rln "admin/ui/widgets/\|@/ui/widgets/\|ui/widgets/editors/" core tests scripts --include=*.ts --include=*.tsx
# builder surface
grep -rln "pages/builder/" core tests scripts --include=*.ts --include=*.tsx
# preview routes + clients
grep -rln "PreviewRoutes\|PreviewClient\|bookingCalendarPreview" core tests scripts --include=*.ts --include=*.tsx
```

**Regression-test shape:** none (read-only). This sub-task is the gate that makes every deletion
safe; a false-clean (skipped grep / misdetected binary) is a blocking finding.

### Sub-Task 2 — Delete the v1 render kernel `core/widgets/**`

Delete only after Sub-Task 1 proves zero importers (including that `core/services/pages/*` V2 modules
now import 580-01's relocated contracts, not `core/widgets/core/*`).

- [x] Delete top-level: `core/widgets/types.ts`, `registry.ts`, `runtime.tsx`, `validator.ts`, `slots.ts`, `renderContext.tsx`, `editorContract.ts`, `runtimeScripts.tsx`.
- [x] Delete `core/widgets/modulePackMatrix.ts` if 580-02 did not already delete it; verify its only surviving consumers (`assistantSiteBuilderIntakeAdvancedOptions.ts`, `assistantSiteBuilderIntakeBasicReview.ts`, `blueprintPageSectionLibrary.ts`, `blueprintPageSectionTypes.ts`, `core/widgets/registry.ts`) were rewired in 580-02. 580-02 rewires `registry.ts` to strip `listModulePackStatus`/`resolvePackStatus`/enforcement; its other modulePackMatrix consumers `WidgetLibraryPage.tsx` + `widgetCatalogService.ts` die in 580-02.
- [x] Delete `core/widgets/renderers/widgetRenderer.tsx`.
- [x] Delete `core/widgets/core/*` (60 modules on disk — audit-verified; 3 of the
      contract's original 63 were already relocated by 580-01) **only the residue** left after
      580-01 relocated shared contracts. The 580-01-owned shared set is `contentList`,
      `formEmbed`+`formEmbedContract`, `listingFilters`+`listingFiltersContract`,
      `navigation`+`navigationContract`, `widgetSafeHref`, `timelineLucideIcons`,
      `appointmentFormContract` (and any other module a V2/content/navigation/commerce/template
      file still imports). `navigationRenderer.tsx`/`navigationContract.ts` and `timelineIcons.ts`
      are the relocated homes for MenuDesignEditor's `NavigationItem` + `loadFullTimelineIcons`
      imports; the v1 `navigation.tsx`/`timeline.tsx` remnants
      (`navigationEditorContract`/`timelineEditorContract` + creator + Block) are residue.
      `listingFiltersContract` is shared only transitively via `listingFilters.tsx` (no direct
      external consumer). Do NOT delete a shared module out from under a relocated importer; if
      580-01 did not relocate it, list it as a 580-01 dependency, not a silent delete.
- [x] **580-04 in-scope rewire (audit HIGH-2, pre-assigned):** 580-02's assigned
      `core/server/routes/assistantRoutes.ts` rewire did NOT land on disk —
      `assistantRoutes.ts:148-161` still lazy-imports
      `import("../../services/widgets/widgetTemplateService")` and calls
      `widgetTemplateService.getWidgetTemplate`. Sub-Task 2 must remove that lazy-import branch
      and its call site (the widget-template route surface is dead after 580-02; the
      `detail-page` surfaceKind at `assistantRoutes.ts:472-473` keeps `widgets:read` — see
      Sub-Task 5's `widgets:read` retirement). Re-verify with `grep -an` fresh; if a later sibling
      stream already removed it, record that and move on. Do NOT delete `widgetTemplateService`
      here if it still has type-only importers — see the WidgetBlock home below.
- [x] **Designate the surviving `WidgetBlock` type home (audit HIGH-1, pre-assigned):** the
      `WidgetBlock` type has type-only imports in surviving files
      (`core/services/widgets/widgetTemplateService.ts:5`,
      `core/admin/services/customScreensEditorClient.ts:9`,
      `core/server/publicSiteRenderContext.ts`, `core/site/cache/siteCache.ts`,
      `core/services/customScreens/screenDocumentNormalizer.ts`,
      `core/services/customScreens/customScreenContracts.ts`,
      `core/services/customScreens/capabilities.ts`,
      `core/services/customScreens/customScreenService.ts:6` — reconcile-audit addendum, 2026-08-20)
      plus `core/admin/ui/pages/builder/types.ts` (re-export shim). Relocate a minimal
      `LegacyWidgetBlock` type-only shape to a neutral 580-01-style module
      (`core/services/renderContracts/legacyWidgetBlock.ts` or the customScreens contract owner)
      and re-point those type-only imports there BEFORE deleting `core/widgets/types.ts`. No
      value/behavior may live in the relocation; it is a pure type alias for stored-content
      compatibility. Record the chosen home in the closure notes.
- [x] The 580-04-owned residue among `core/widgets/core/*` (zero surviving consumers once hydration + preview routes die) includes `productCompare`, `productGallery`, `productTable`, `commerceWidgetShared`, `entryTeaser`, `postsFeed`, `postsFeedRuntime`.
- [x] Remove the now-empty `core/widgets/` directory.

**Implementation Pseudocode:**

```ts
// deletion guard (runs before each rm -rf; returns file paths that still import the target)
export function assertZeroImporters(rootDir: string, targetPatterns: string[]): string[] {
  // execSync(`grep -rln -e <pattern> ${rootDir}/core ${rootDir}/tests ${rootDir}/scripts --include=*.ts --include=*.tsx`)
  // normalize to absolute paths, filter out the target's own directory and remove-with-file siblings
  // return the residual list; throw with the list if non-empty
  return residualImporters; // [] means safe to delete
}
```

**Data flow:** importers verified absent → `rm` the module → re-run `lint:types` immediately after
each directory deletion so a broken import surfaces at the exact commit step.

**Error handling:** never delete on an empty/ambiguous grep (binary misdetection). If `lint:types`
fails after a delete, restore from `git` and attribute the dangling importer to the correct sibling
before retrying.

**Regression-test shape:** `bun --cwd core lint:types` + `bun --cwd core lint` must stay green after
the kernel deletion; the deletion-guard test added in Sub-Task 9 pins absence.

### Sub-Task 3 — Delete the v1 public page runtime and `renderPublicPage` v1 branches

- [x] Delete `core/site/pageRuntime.tsx` (`DefaultRuntimePageShell`, `WidgetRenderer` import, `WidgetRendererPageDefaults`). Verify `renderPublicPage.tsx` and `publicEntryRender.tsx` no longer import it after 580-03.
- [x] In `core/site/renderPublicPage.tsx`, remove `renderPublicPageHtml` (sync, `:334`) and `renderPublicPageRuntimeHtml` (`:391`) and any v1 template loading they own, keeping only the V2 `DefaultRuntimePageShellV2` path and its `renderPublicPage*V2` exports.
- [x] Verify `core/server/publicEntryRender.tsx` no longer calls `renderPublicPageRuntimeHtml` (previously `:338`, `:466`) or `hydrateRuntimeBlocks` (previously `:326`, `:468`). If it still does, STOP and report the 580-03 gap; do not delete the function out from under it.
- [x] Remove `blocksAllowSiteHtmlCache(blocks: WidgetBlock[])` from `core/site/cache/siteCache.ts:211` if its only consumer (`publicEntryRender.tsx:369`) is gone; otherwise keep and rewire its type import.

**Implementation Pseudocode:**

```ts
// renderPublicPage.tsx after removal: keep only the V2 exports and their imports
// REMOVE: import { DefaultRuntimePageShell, type PageTemplateProps } from "./pageRuntime";
// REMOVE: export function renderPublicPageHtml(...) { ... }            // v1 sync, production-dead
// REMOVE: export async function renderPublicPageRuntimeHtml(...) { ... } // v1 detail-page path
// KEEP:   export * from the V2 renderPublicPageRuntimeV2 pipeline and its options types
```

**Error handling:** a surviving call to a removed export fails `lint:types`; treat that as a
contract-drift signal against 580-03, fix the source of truth (the 580-03 migration) rather than
adding a shim.

**Regression-test shape:** delete/repurpose `tests/vitest/pages/*` and `tests/vitest/site/*` tests
that exercised `renderPublicPageHtml`/`renderPublicPageRuntimeHtml` (see Sub-Task 9); keep V2 render
tests green and add a guard that the v1 exports are absent from `renderPublicPage.tsx`.

### Sub-Task 4 — Delete `hydrateRuntimeBlocks` and per-type v1 hydration

- [x] In `core/server/publicSiteRenderContext.ts`, delete `hydrateRuntimeBlocks` (`:453`), `hydrateRuntimeBlock` (`:100`), and every v1 per-type hydration branch (content-list `:107`, posts-feed `:123`, listing-filters `:139`, search-box `:164`, entry-teaser `:184`, form-embed `:246`, contact `:261`, newsletter `:293`, booking-calendar `:327`, appointment-form `:360`, navigation `:380`, template-section `:392`), plus their now-unused `normalize*Data` imports (`:12-34`) and `WidgetBlock` import (`:1`).
- [x] Delete `core/services/commerce/commerceWidgetRuntime.ts`, `core/services/content/entryTeaserResolver.ts`, `core/services/content/postsFeedResolver.ts`, and `core/services/content/postsFeedRuntime.ts` together with the per-type hydration branches. Verified: their only consumers are `publicSiteRenderContext.ts` hydration + preview routes + v1 editors; `publicSiteRouteRuntime.ts` imports only `contentListResolver` + `contentList` (relocated by 580-01), so no v1 commerce/resolver import survives there.
- [x] Verify the only production consumer was `publicEntryRender.tsx` (now migrated by 580-03). If `publicSite.tsx` still imports `runtimeScripts`/`listingRuntimeScript` for the v1 listing path, rewire per 580-03 before deleting those `core/widgets` imports.
- [x] Keep the V2 data-preparation path intact: `pageRuntimeBindingContract.ts` and `pageRuntimeDataPreparation.ts` are V2-owned (S3) and must not be touched here.

**Implementation Pseudocode:**

```ts
// publicSiteRenderContext.ts after removal: no WidgetBlock, no v1 normalize*Data imports,
// no hydrateRuntimeBlocks/hydrateRuntimeBlock. The remaining exports serve the V2 render context only.
```

**Error handling:** deleting a helper still referenced by a V2 import is a hard `lint:types` failure;
restore and re-attribute rather than weaken.

**Regression-test shape:** Bun render-context tests that pinned v1 hydration are removed in Sub-Task 9;
V2 page-runtime preparation tests stay green and are the no-regression pin.

### Sub-Task 5 — Delete v1 preview routes, admin preview clients, and widget editors

- [x] Delete routes: `core/server/routes/entryTeaserPreviewRoutes.ts`, `productComparePreviewRoutes.ts`, `productGalleryPreviewRoutes.ts`, `productTablePreviewRoutes.ts`, and remove their registration from `core/server/routes/widgetPreviewRoutes.ts` (`registerWidgetPreviewRoutes`) and `core/server/routes/index.ts` (`:35`, `:175`). If `widgetPreviewRoutes.ts` becomes empty after those preview routes are removed, delete it too. 580-02 renamed `widgetRoutes.ts` → `widgetPreviewRoutes.ts` (it never deletes it); verify the current on-disk name fresh and update the `core/server/routes/index.ts` import/call if the rename left a dangling reference.
- [x] Delete admin preview clients: `core/admin/services/entryTeaserPreviewClient.ts`, `productComparePreviewClient.ts`, `productGalleryPreviewClient.ts`, `productTablePreviewClient.ts`, `bookingCalendarPreview.ts`.
- [x] Delete `core/admin/ui/widgets/editors/*` (46 entries) **after** 580-01 moved `SharedColorControl`/`TokenOrPixelField` (and the `colorValue` helper) to a shared location for `core/admin/ui/forms/FormDesignPanel.tsx:30`. Verify `FormDesignPanel.tsx` imports the relocated path before deleting the editors directory.
- [x] Delete the remaining `core/admin/ui/widgets/*` files (`registry.ts`, `WidgetLibraryPage.tsx`, `WidgetInsertDialog.tsx`, `WidgetDetailsDrawer.tsx`, `WidgetCard.tsx`, `WidgetCatalogFilters.tsx`, `widgetCategoryMeta.ts`, `widgetInsertUtils.ts`, `widgetLibraryUtils.ts`, `WidgetLibraryRowActions.tsx`, `WidgetLibraryTable.tsx`, `previewStateSupport.ts`, `types.ts`, `WidgetEditorOutlet.tsx`) that 580-02 did not already delete.
- [x] Retire the Widget Library admin route, alias, prefetch, and breadcrumb (`adminRoutes.tsx:381`, `adminRouteComponents.tsx:266-269`, `adminPaths.ts:67`, `adminPrefetch.ts:304`, `AdminBreadcrumbs.tsx:51-52`) if 580-02 left them; do not re-delete something 580-02 already removed.
- [x] Retire the `widgetCatalog:list` cache family end-to-end if it is now unused: cache key/TTL in `_docs/ADMIN_CACHE.md`, cached clients `getCachedWidgetCatalog`/`listWidgetCatalogCached` in `core/admin/services/widgetsClient.ts` (if still present), `cacheBus` broadcast refs, and `useAssistantAdminContext.ts`/`adminContextCatalogs.ts` consumers. Coordinate with 580-02 (only what 580-02 did not already retire). Audit-verified: the `widgetCatalog:list` cache family is ALREADY fully retired (0 refs; `_docs/ADMIN_CACHE.md:445-452` tombstone) — verify fresh and do not re-delete.
- [x] **Retire the surviving `widgets:read` permission (audit MEDIUM-8, pre-assigned):**
      full inventory of `widgets:read` refs (verified 2026-08-20):
      `assistantRoutes.ts:473` (`detail-page` surfaceKind),
      `productGalleryPreviewRoutes.ts:68` (deleted with the preview routes),
      `core/services/admin/permissionsCatalog.ts:40` (the permission definition — remove it and
      any RBAC grants referencing it),
      `tests/integration/routes/assistant-plan-routes.test.ts:351,462` (pin — see Sub-Task 9
      addendum),
      `tests/integration/routes/productGalleryPreview.test.ts` (deleted with the preview route),
      `scripts/runtime-smoke/adapters/task-467/production-handlers.ts` (smoke harness — reconcile
      with the task-467 adapter rewire in Sub-Task 9). No surviving resource legitimately owns
      `widgets:read` after the preview routes and Widget Library are gone; remove the permission
      checks and the catalog entry so no route file or RBAC grant still references the deleted
      permission. Do not invent a new owner.
- [x] **Bundle machinery (audit MEDIUM-4, pre-assigned):** `scripts/check-admin-bundle.ts:106-112`
      carries the L05-documented allowlist entry (`registerDocumentedNonTask467DynamicBudgetFollowUp`
      on the `AdminShell` chunk, explicitly assigned to 580-04 Sub-Task 2; remove it — the bundle
      guard then asserts zero `core/widgets`/`admin/ui/widgets` paths).
      `scripts/adminBundleReport.ts:483-494` reads `admin/ui/widgets/registry.ts` +
      `editors/index.ts` for the widget split evidence (`collectWidgetRegistryEvidence`) — remove/neutralize that read so
      `check:admin-bundle` does not crash after Sub-Task 5 deletes the editors dir.
      `tests/vitest/admin/adminBundleReport.test.ts` pins both — update its expectations
      (allowlist gone, split evidence gone) rather than weakening assertions.
- [x] **Delete preview-route/client tests (audit MEDIUM-3, pre-assigned):** add to the Sub-Task 9
      delete list: `tests/integration/routes/{entryTeaser,productCompare,productGallery,productTable}Preview.test.ts`
      and `tests/vitest/admin/{bookingCalendar,productCompare,productGallery,productTable}Preview(Client).test.ts`.

**Note on `core/services/widgets/*`:** `widgetCatalogService.ts`, `widgetTemplateService.ts`,
`widgetTemplateRevisionService.ts`, `widgetTemplateBlockContract.ts`, `templateSectionRuntime.ts`
depend on `core/widgets`. Their removal is primarily a 580-02 concern. Delete them here ONLY if they
are confirmed dead after 580-02/03 and the closure sub-task documents the boundary; otherwise list
them as a 580-02 dependency. `widgetTemplateCategoryService.ts` is already deleted by 580-02
(Sub-Task 3); `widgetTemplateSettings.ts` (no `core/widgets` import) may survive — decide at closure.

**Implementation Pseudocode:**

```ts
// route retirement guard: after removal, /admin/api/widgets and /advanced/widgets must 404/absent
export function assertWidgetLibraryRoutesRemoved(routeIndexPath: string): void {
  // read core/server/routes/index.ts, assert no `widgetPreviewRoutes` / `*PreviewRoutes` registration remains
  // read adminRoutes.tsx, assert no "/advanced/widgets" pattern remains
}
```

**Error handling:** a stale route/alias/prefetch reference fails `check:admin-boundary` /
`check:admin-bundle`; remove the reference at its owner, never leave a dead lazy import behind.

**Regression-test shape:** route-registration tests updated in Sub-Task 9; `check:admin-boundary`
and `check:admin-bundle` green; Form Design Panel tests stay green after the `SharedColorControl` move.

### Sub-Task 6 — Delete v1 builder widget parts

- [x] Delete the v1-widget parts of `core/admin/ui/pages/builder/*`: `WidgetPicker.tsx`, `WizardPanel.tsx`, `VisualPanel.tsx`, `AdvancedPanel.tsx`, `LayoutPanel.tsx` (widget-panel parts), the widget branches of `blockUtils.ts`, `BlockSettings.tsx`, `BlockList.tsx`, plus `AdminWidgetPreviewRuntimeBridge.tsx`, `bookingFlowContext.ts`, `widgetRegistry.ts` (3-line shim), `types.ts` (re-export shim).
- [x] Keep only what the V2 page editor needs. R4 verified `core/admin/ui/pages/builder/PageEditor.tsx` does **not** import `builder/*` (V2 editor is decoupled). Re-verify with `grep -an` before keeping any file. `BlockToolbar.tsx`, `FormPicker.tsx`, `LibraryPanel.tsx`, `pickers.tsx` (if present) must be individually attributed to S3 or deleted; no generic keep.
- [x] Verify `DetailTemplateEditorPage.tsx`, `DetailTemplateBindingPanel.tsx`, `detailTemplateEditorModel.ts` no longer import `builder/*` or `widgets/*` after 580-03. If they still do, STOP and record the 580-03 gap.
- [x] If any builder file is still needed by the V2 page editor, split ownership with S3 in the closure notes and keep only the V2-needed exports (files must stay ≤1000 lines after edits).

**Implementation Pseudocode:**

```ts
// per-builder-file gate: delete only files with zero importers outside the delete set
for (const file of builderFiles) {
  const importers = grepImporters(file);        // exclude builder dir + remove-with-file siblings
  if (importers.length) recordOwner(importers); // 580-03 gap OR S3 keep-needed, never silent delete
  else rm(file);
}
```

**Error handling:** `DetailTemplateEditorPage` still importing `blockUtils`/`widgetRegistry` means
580-03 did not finish its migration; escalate to the orchestrator instead of deleting.

**Regression-test shape:** `tests/vitest/pageBuilder/*` v1 suites removed in Sub-Task 9; Page V2 editor
tests stay green; `check:admin-boundary` proves the builder dir contains no orphan widget imports.

### Sub-Task 7 — Custom-screens compat removal or read-compat reduction

- [x] Verify V4 screen runtime does not need `bindingResolver.ts`, `customScreenLegacyAdapters.ts`, or the `customScreenService.ts:153` / `customScreensEditorClient.ts:57` compat projections after 580-01/02. R2 confirmed runtime renders `legacy-widget` as a read-only placeholder (`ScreenRuntimeLeafBlocks.tsx:624-633`), never through the v1 renderer.
- [x] If the admin custom-screen editor still projects `ScreenBlockV1 -> WidgetBlock` (admin-only), reduce to read-compat only or delete once 580-01/02 removed the projection. Delete the files only when zero admin editor importers remain; otherwise keep a minimal read-only adapter and note the reduction.
- [x] **Execution-ready rewire plan (audit HIGH-1, pre-assigned — do NOT delete these files out from under live importers):**
      `core/services/customScreens/bindingResolver.ts:1-2,101,105` imports/calls `getWidget`
      (`../../widgets/registry`) and `ensureRuntimeWidgetsRegistered` (`../../widgets/runtime`),
      and `core/services/customScreens/customScreenLegacyAdapters.ts:1-3,67-68` calls
      `ensureRuntimeWidgetsRegistered` + `normalizeWidgetBlock`. Both are imported by LIVE admin
      surfaces: `core/admin/ui/custom-screens/customScreenEntryDraft.ts:15`,
      `core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx:31`,
      `core/admin/ui/custom-screens/assistantSurface.ts:16`,
      `core/services/customScreens/capabilities.ts:4`,
      `core/admin/services/customScreensEditorClient.ts`,
      `core/admin/ui/custom-screens/customScreenEditorViewNormalizer.ts:4`, plus tests
      (`tests/vitest/admin/custom-screen-schemas.test.ts`,
      `tests/vitest/customScreens/customScreenSummaryContract.test.ts:214`,
      `tests/vitest/customScreens/bindingResolver.test.ts`). The rewire is:
      1. Replace `ensureRuntimeWidgetsRegistered()` calls in both files with a no-op or a
         V4-owned registration guard (the V4 screen runtime owns its own leaf-block registry).
      2. Replace `getWidget(block.type)` / `normalizeWidgetBlock(item)` with a V4-owned
         lookup that maps `legacy-widget` blocks to the read-only placeholder semantics
         (`ScreenRuntimeLeafBlocks.tsx:624-633` precedent) — no v1 kernel import.
      3. Import the relocated `LegacyWidgetBlock` type (Sub-Task 2's designated home) for the
         type-only needs instead of `core/widgets/types`.
      4. `core/admin/ui/pages/builder/types.ts:10` re-exports `WidgetBlock as Block` from
         `widgets/types` — re-point to the relocated type home or delete the re-export shim
         (audit MEDIUM-9; reconcile-audit corrected :17 → :10).
      After the rewire, the contract's own `assertCustomScreenCompatIsReadOnly` guard must pass
      on both files. `customScreenEntryDraft.ts`, `CustomScreenEntriesTable.tsx`,
      `assistantSurface.ts`, `capabilities.ts`, `customScreenEditorViewNormalizer.ts`,
      `customScreensEditorClient.ts` must not import any `core/widgets` path afterwards.
- [x] **Reconcile-audit addendum (2026-08-20): two more legacy-adapter importers are live and must
      be in the rewire scope, not just "zero admin editor importers":**
      `core/services/customScreens/customScreenDefinitionNormalizer.ts:26` imports
      `normalizeCustomScreenBlocks` from `./customScreenLegacyAdapters`, and
      `core/services/customScreens/customScreenSchemas.ts:92` imports from the same adapter.
      Both survive; the deletion criterion must be zero importers across core+tests (not only
      admin editors). Rewire both to the V4-owned placeholder semantics (Sub-Task 7 steps 1-3)
      or keep a minimal read-only adapter, then delete/neutralize the adapter's kernel calls.
- [x] `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx:20` imports the admin widget
      registry — after the rewire, re-point that import or delete the scenario; the contract's
      "keep passing" requirement applies only to V4 behavior, never to a v1 registry import
      (audit MEDIUM-6; note the file lives in `tests/vitest/ui-integration/`, not `tests/vitest/ui/`).
- [x] Do not touch the V4 screen block model (`ScreenBlockV1`), its normalizer, or the runtime leaf blocks — those are TASK-468/505/503 owned surfaces.

**Implementation Pseudocode:**

```ts
// if a projection must survive for a legacy admin read, reduce it to a pure, side-effect-free
// read adapter with no registry/runtime/validator import; otherwise delete the file outright.
export function assertCustomScreenCompatIsReadOnly(file: string): void {
  const text = readFileSync(file, "utf8");
  if (/ensureRuntimeWidgetsRegistered|normalizeWidgetBlock|getWidget\(|from ".*widgets\/(registry|runtime|types|validator)"/.test(text))
    throw new Error(`${file} still depends on the v1 kernel`);
}
```

**Error handling:** a surviving admin editor import of `bindingResolver`/`legacyAdapters` is a
580-01/02 gap; report before deleting.

**Regression-test shape:** custom-screen V4 authoring/binding tests stay green;
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` and the custom-screen binding flow keep
passing; any projection tests are deleted only with their production file.

### Sub-Task 8 — Documentation updates (this leaf owns all doc edits)

- [x] `_docs/WIDGETS.md` → replace the v1 catalog body with a tombstone: keep a short "Removed system" section and the historical boundary banner stating `core/widgets/**` is **removed** (not retained), delete the per-widget catalog and configuration contract, and point new work at `_docs/DASHBOARD_WIDGETS_SPEC.md` + domain section/block contracts. No permissive wording that re-authorizes a widget surface.
- [x] `_docs/WIDGET_PACK_MATRIX.md` → decide (recommended: collapse to a single removed-note tombstone, then delete the file only if no other source-of-truth doc links it as authoritative). Repo preference: keep a one-paragraph historical note rather than a dead empty file.
- [x] `_docs/_WIDGETS/*` (44 entries: 42 per-widget .md + `README.md` + a `tmp/` directory) → remove or collapse to a single `REMOVED.md` note. Recommended: delete all 42 per-widget files and replace with one `_docs/_WIDGETS/README.md` tombstone stating the v1 per-widget docs were removed with the kernel.
- [x] `_docs/ADMIN_CACHE.md` → remove `widgetCatalog:list` cache key (`:88`) and the "Retired widget-library compatibility cache note" (`:448-462`) if 580-02 did not; `_docs/ADMIN_CACHE_MAP.md` → remove the "Retired widget compatibility surfaces" rows (`:305-315`).
- [x] `docs/develop/content-and-widgets.md`, `docs/develop/project-structure.md`, `docs/develop/runtime-model.md` → remove `core/widgets` as a live/retained path; replace with "removed with TASK-580" and point to Dashboard widgets + domain section/block contracts.
- [x] `_docs/TESTING_STRATEGY.md`, `_docs/ARCHITECTURE.md` → update any `core/widgets` retained read-compat statements to reflect removal; keep the historical record factual (removed, not retained).
- [x] Root `AGENTS.md` policy line (`:622-626`, and the `_docs/WIDGETS.md` index entry at `:87`): update to state `core/widgets/*`, `core/widgets/modulePackMatrix.ts`, `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md`, and `_docs/_WIDGETS/*` are **removed** (or reduce `_docs/WIDGETS.md` to a tombstone). **Conditional:** edit `AGENTS.md` ONLY if the parent author/orchestrator sanctions an AGENTS.md change for this family; otherwise record the stale policy line as a follow-on note and leave `AGENTS.md` untouched.
- [x] `core/.tmp` cleanup: remove the widget-audit remnants (`widget_audit_all.tsx/.jsonl`, `widget_audit.tsx`, `widget_contract_diff.ts/.jsonl`, `.hm` files, `bunx-501-shadcn@latest/`). They are gitignored/untracked and currently live in the **main shared tree** `core/.tmp/` (absent from this worktree); remove from the main tree only after confirming no other in-flight stream references them. Do not `git add` them.

**Regression-test shape:** byte-identity guards for no-widget docs stay green
(`buildSiteShellCss(null)` and no-override document render); doc-link checker (if any) passes.

### Sub-Task 9 — Test deletion and deletion guards

- [x] Delete remaining v1-kernel suites that survived 580-02, verified each by grep:
  - `tests/unit/widgets/*` (contentList, entryTeaser, modulePackMatrix, postsFeedWidget, registry, runtimeRegistry, validator, widgetCatalogService, widgetTemplateCategoryService, widgetTemplateRevisionService, widgetTemplateService) — delete only those whose production module is deleted here; keep `widgetTemplateService` tests only if its production module survives per Sub-Task 5 note. `widgetTemplateCategoryService` tests are already removed in 580-02 (its production module is deleted there); do not resurrect them.
  - Delete `tests/unit/commerce/commerceWidgetRuntime.test.ts` with `core/services/commerce/commerceWidgetRuntime.ts`, and the entryTeaser/postsFeed resolver tests (`tests/unit/widgets/entryTeaser.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`) with `core/services/content/entryTeaserResolver.ts`/`postsFeedResolver.ts`/`postsFeedRuntime.ts` (all deleted in Sub-Task 4).
  - `tests/vitest/widgets/*` (~59 files), `tests/vitest/pageBuilder/*` v1 panels (advancedPanel, blockList, blockSettings, visualPanel, widgetLibrary, wizardPanel, wizardFlow, layoutPanels, pickers, unsavedChanges, blockToolbar), `tests/vitest/admin/widgetEditorOutlet.test.tsx`, `widgetRegistryReload.test.ts`, `widgetRegistryBoundary.test.ts`, `tests/integration/routes/widgets.test.ts`, and the v1 preview-route/renderer tests under `tests/vitest/pages`/`tests/vitest/site` that target `renderPublicPageHtml`/`renderPublicPageRuntimeHtml`.
  - Delete `tests/vitest/services/css-color-consumer-parity.test.ts` + its inventory helpers, and the `*-editor-wave.test.tsx` / `widget-*.test.tsx` / `widget-library*.test.tsx` suites whose production surface is removed here. Audit-verified: `detail-template-editor.test.tsx` is V2-only and must be KEPT (correct the keep list, not deleted).
  - **Unenumerated v1-kernel-dependent tests (audit MEDIUM-5, pre-assigned — verify each by grep, delete/rewire only with its production surface):**
    `tests/vitest/.../appointment-form-runtime-hydration.test.ts:327,357`,
    `tests/vitest/.../posts-feed-runtime-pagination.test.ts:11`,
    `tests/vitest/.../product-table-runtime-pagination.test.ts:22`,
    `assistantFullServiceSitePublicRuntime.test.ts:11`,
    `assistantSiteBuilderIntakeAdvancedOptions.test.ts:34-36` (production already rewired — rewire the test import),
    `heroTilt.test.tsx:6-7`, `customScreenSummaryContract.test.ts:214`,
    `publicAnalyticsInjection.test.tsx:4`, `public-page-locale.test.tsx:12`,
    `detail-page-runtime-lite.test.ts:259`, and the `tests/vitest/ui` extras
    (`clearable-fields*`, `shared-color-*`, `link-destination-field`,
    `commerce-widget-editor-shared`, `product-gallery-admin-preview`,
    `tabs-preview-activation`, `block-layout-shared-wave`, `widget-editors-wave-1`).
  - **Lane manifest + example pins (audit MEDIUM-1, pre-assigned):** `tests/bun-lane-manifest.json`
    currently pins 14 widget entries including 7 `tests/unit/widgets/*` files; the
    `bunLaneManifest.test.ts` (byte-identical fresh-classification pin) and
    `bunLanePure.test.ts:156,227,254,282` (pins `tests/unit/widgets/validator.test.ts` as a
    classification example) both break deterministically when those files are deleted. Regenerate
    the manifest via `bun scripts/bun-lane-classify.ts` after the widget test deletions and swap
    the `bunLanePure` example to a surviving fixture file. No vitest runner manifest exists.
  - **Public renderer test reclassification (audit MEDIUM-2, pre-assigned):**
    `tests/vitest/site/publicRenderer.test.tsx` (843 lines) is on the KEEP list but imports
    `renderPublicPageHtml` + `clearWidgets`/`registerWidget` + 8 `core/widgets/core/*` modules
    (hero, tabs, toggleBlock, navigation, contentList, postsFeed, entryTeaser, templateSection).
    Reclassify as delete/rewrite to the V2-only render path; do not keep a v1 kernel import.
- [x] Keep/update tests that cover surviving V2 behavior: `page-renderer-v2.test.tsx`, `page-editor-control-registry.test.ts`, `page-editor-content-controls.test.ts`, `page-data-block-presentation.test.tsx`, `siteShell.test.tsx`, forms/navigation/commerce resolver suites, `custom-screen-authoring-boundary.test.ts`, and any kit runtime test now rendering through the V2 path. Do not weaken behavior assertions; re-baseline only for an intended contract change.
- [x] **task-467 shared smoke adapter (audit MEDIUM-7, pre-assigned):** the shared smoke
      `browser-actions.ts:102,288` navigates `/advanced/widgets` and has 14 self-tests. Rewire it
      to a surviving admin route (or retire that navigation step) once the Widget Library route is
      gone; update the 14 self-tests accordingly. Do not leave a dead route navigation in the
      shared harness.
- [x] **`widgets:read` test pin (reconcile-audit addendum, 2026-08-20):**
      `tests/integration/routes/assistant-plan-routes.test.ts:351` asserts the `detail-page` plan
      does NOT request `widgets:read` (already expects removal), but `:462` asserts it DOES
      (`toContain("widgets:read")`). The `:462` assertion breaks when Sub-Task 5 retires the
      permission — update it to expect `widgets:read` absent. Also check
      `task-467 production-handlers.ts:32` and `permissionsCatalog.ts:40` for surviving
      `widgets:read` disposition and reconcile them with Sub-Task 5 (reconcile-audit LOW notes).
- [x] Add deletion guards mirroring the existing dead-code/boundary pattern (see `tests/vitest/ui/editor-surface-dead-code.test.ts`):
  - `assertCoreWidgetsDirectoryRemoved`: read `core/widgets/` via `fs.readdir` and assert ENOENT (or empty), and assert `core/admin/ui/widgets/` is absent.
  - Import/bundle guard: assert no `core/widgets/**` or `admin/ui/widgets/**` path appears in the admin bundle manifest produced by `check:admin-bundle`.
  - Route guard: assert `/admin/api/widgets` and `/advanced/widgets` are not registered (Sub-Task 5 helper).

**Implementation Pseudocode:**

```ts
// tests/vitest/admin/assertLegacyPageWidgetsAreRetired.ts (new helper)
import { existsSync, readdirSync } from "node:fs";
export function assertLegacyPageWidgetsAreRetired(): void {
  expect(existsSync(join(REPO_ROOT, "core/widgets"))).toBe(false);
  expect(existsSync(join(REPO_ROOT, "core/admin/ui/widgets"))).toBe(false);
  const bundle = readFileSync(BUNDLE_MANIFEST, "utf8");
  expect(bundle).not.toMatch(/core\/widgets\/|admin\/ui\/widgets\//);
}
```

**Error handling:** a test that still imports a deleted module fails loudly at collection time;
attribute it to the correct sibling and delete/rewire rather than `vi.mock`-ing around a dead import.

**Regression-test shape:** `bun --cwd core lint:types` + `bun --cwd core lint` + the full surviving
Vitest/Bun globs (Sub-Task 10 commands); `check:admin-boundary` + `check:admin-bundle` green.

### Sub-Task 10 — Closure (the ONLY sub-task that touches `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`)

- [x] Create changelog file `1323` under `_docs/_CHANGELOG/` and the index row in
      `_docs/_CHANGELOG/README.md`. Read the index **fresh immediately before editing**; touch only
      the S6/1323 row. The entry must list parent `TASK-580` and every closed leaf (580-01..580-04).
- [x] **Changelog reservation rationale (audit MEDIUM, pre-assigned):** `_docs/_CHANGELOG/README.md:65`
      still says "Use 1309 for the next unreserved changelog entry" and max on-disk entry is 1308.
      The 1309-1322 reservations exist ONLY in `_S6-collision-guards.md`. Record the reservation
      rationale in the changelog README (S1-S5 streams reserved 1309-1322; S6 pins 1323) so the
      index guidance matches reality before writing 1323. Then write 1323.
- [x] Mark `TASK-580` and children `✅ Done` in their task files (this file last), with `**Completed:**`
      dates. Do not leave open direct children under a closed parent.
- [x] **Task-file statuses + parent tables (audit MEDIUM, pre-assigned):** on disk only L07 is
      `✅ Done`; TASK-580, 580-01, 580-02, 580-03 (parent), 580-03-L01..L06, and 580-04 all still
      read `⏳ To Do`. Mark every physical 580-family file `✅ Done` with `**Started:**`/
      `**Completed:**` dates, and update the parent sub-task tables (e.g. the 580-03 parent table
      at `:176-182` shows L01-L07 all `⏳ To Do` while the L07 leaf says `✅ Done`). This is the
      closure leaf's job, not the implementer's.
- [x] Sync `_docs/_TASKS/README.md` rows + Statistics for the S6 family only (read fresh before editing;
      touch ONLY S6 rows and the three Statistics counters). **Statistics (audit HIGH, pre-assigned —
      the "261→263" note in the L07 file describes the already-applied premature bump and is WRONG
      as the end state):** `taskGraphIntegrity.test.ts:148-158` recomputes To Do/In Progress/Done
      from `git ls-files` tracked task files and asserts `board == counts`. Fresh tracked count
      today is **To Do 261 / In Progress 6 / Done 3524**, but the README currently says
      **263/6/3524** (a premature +2). After this family closes with all 12 `TASK-580*` files
      `✅ Done` and committed, the required board is **To Do 261 / In Progress 6 / Done 3536**
      (To Do reverts the premature +2; Done gains +12). Verify with the test's own counting
      (`git ls-files "_docs/_TASKS/TASK-*.md"` + status scan) immediately before writing. The
      parent author owns the family row; this leaf only completes the closure edits the parent
      author delegated. The README also currently lists ONLY the `TASK-580` parent row (`:166`) —
      add the 11 child rows (580-01..580-04 + 580-03-L01..L07) to the Done table.
- [x] Runtime smoke ≥5 DISTINCT real-flow scenarios via the shared entry point
      `bun scripts/runtime-smoke.ts run --suite <suite> --profile fast --session <name>` with a
      task-scoped session (e.g. `wf580smoke`), screenshots saved to `_docs/_workflows/_smoke/`:
      1. public page render (V2 page, no widget kernel), 2. entry detail render post-migration,
      3. admin page editor (V2), 4. Dashboard widgets untouched sanity (TASK-480), 5. custom screens.
      Restart the dev server first; assert visible effect (DOM/computed style, not control presence);
      zero console errors; dark mode alongside light for admin surfaces.
- [x] Closure evidence (2026-08-20): `detail-page-v2` suite session `wf58004smoke` PASS 5/5
      (public-detail-converted, preview-token, editor-roundtrip dark, legacy-placeholder,
      assistant-generated; 0 console errors; screenshots
      `_docs/_workflows/_smoke/detail-page-v2-wf58004smoke-*.png`), plus playwright-cli sanity
      for the two remaining contract flows: Dashboard widgets untouched (registry/renderers load,
      0 `data-legacy-widget` nodes) and custom screens admin surface (light + dark visible effect,
      screenshots `-dashboard-sanity.png` / `-custom-screens-{light,dark}.png`), and the retired
      Widget Library route renders "Page not found" with no nav entry. The shared DB admin path was
      snapshot/forced to `/admin` for the smoke and restored to `/admin-panel` afterwards
      (task-540 lease pattern; `site.publicBaseUrl` likewise).
- [x] Closure test correction (2026-08-20): `detail-page-composer-runtime.test.tsx` 4-fail was a
      real 580-03 L04 regression (v1 `stats-kpi` fixture binding dropped by the V2 cutover), NOT
      the pre-existing flake L07 recorded; fixture updated to the V2 contract (`feature-grid`
      `items.0.title`), isolated run 7/7 pass. See changelog 1323 and L07 correction note.
- [x] Report the per-stream commit scope (file set + changelog number 1323) for the owner.

---

## Implementation Pseudocode (top-level shape)

```ts
// Orchestration order the implementer follows; each phase is gated by the previous phase's checks.
async function deleteV1WidgetKernel() {
  const deletions = [
    verifyImportGraph(),            // Sub-Task 1: throw with residual importers if any
    deleteWidgetsKernel(),          // Sub-Task 2: core/widgets/** residue
    deletePublicPageV1Runtime(),    // Sub-Task 3: pageRuntime.tsx + renderPublicPage v1 branches
    deleteHydration(),              // Sub-Task 4: hydrateRuntimeBlocks + per-type branches
    deletePreviewSurface(),         // Sub-Task 5: routes + clients + editors + cache family
    deleteBuilderWidgetParts(),     // Sub-Task 6: v1 builder panels + shims
    reduceCustomScreenCompat(),     // Sub-Task 7: delete or read-compat reduce
  ];
  for (const phase of deletions) {
    await phase();
    await run("bun --cwd core lint:types");   // fail fast at the exact phase
  }
  await deleteLegacyTests();        // Sub-Task 9
  await addDeletionGuards();        // Sub-Task 9
  await updateDocs();               // Sub-Task 8
  await closeFamily();              // Sub-Task 10 (changelog 1323, board, smoke, scope report)
}
```

**Data flow:** verified-absent importers → delete production surface → lint/type gate per phase →
delete only the tests whose production file is gone → add absence guards → docs → closure. Each
phase's deletions are a superset of the sibling work already landed, so the implementer re-verifies
the live tree, never a stale contract.

**Error handling:** any dangling importer, `lint:types` failure, or surviving v1 route is a sibling
gap (580-01/02/03), reported to the orchestrator with file:line evidence rather than papered over
with a shim or a weakened test. The only sanctioned fallback is a minimal read-only adapter for a
stored-content read path the family explicitly chose to preserve; every such adapter is recorded in
the closure notes.

---

## Testing Requirements

- `bun --cwd core lint` and `bun --cwd core lint:types` after every deletion phase and once at the end.
- Targeted Vitest globs (Bun-free lanes):
  - `tests/vitest/pages/**` (V2 renderer + page editor survive),
  - `tests/vitest/site/**` (public renderer + site shell survive),
  - `tests/vitest/admin/**` minus deleted v1 widget suites (deletion guards green),
  - `tests/vitest/ui/**` minus deleted widget/editor-wave suites (forms, custom screens, menus survive).
- Targeted Bun suites (runtime lanes):
  - `tests/unit/navigation/navigationRuntimeResolver.test.ts`, `tests/unit/site/menu-document-render.test.tsx`, `tests/unit/assistant/support/*`, `tests/unit/kits/projekty-domow-*.test.tsx` after their production modules are rewired to V2,
  - `tests/integration/runtime/*` and `tests/integration/assistant-live/*` only if their production surface is touched.
- `check:admin-boundary` and `check:admin-bundle` (or their current equivalents) green after the
  admin surface deletion; the bundle guard must not contain `core/widgets` or `admin/ui/widgets` paths.
- `bun run precommit` before the manual commit (or the configured Git hook).
- Full relevant lanes: if the combined-stream deferred gate applies, run `bun run test` (Bun + Vitest),
  `bun run precommit:check`, `bun run gates:coderso`, and `bun run scan:security` after all streams land.
- State clearly in the closure summary any suite skipped or unable to run (e.g. DB-backed tests without
  `DATABASE_URL`).
- Load repo env with `set -a && source .env && set +a` before any DB/settings-touching test.

---

## Documentation Updates Required

See Sub-Task 8 for the complete doc plan (WIDGETS tombstone, WIDGET_PACK_MATRIX, `_docs/_WIDGETS/*`,
ADMIN_CACHE + MAP, `docs/develop/*`, `_docs/TESTING_STRATEGY.md`, `_docs/ARCHITECTURE.md`, conditional
`AGENTS.md`). Board index + Statistics and changelog 1323 are Sub-Task 10. `_docs/_CHANGELOG/README.md`
index row must cross-link changelog 1323 and the TASK-580 family.

---

## Changelog

- **Pinned number:** `1323` (family; this closure sub-task creates the file). Read
  `_docs/_CHANGELOG/README.md` fresh before editing. 1308 is the last committed entry; 1309–1322 are
  reserved by streams S1–S5 (as recorded in `_S6-collision-guards.md`), so 1323 is the next free S6
  number (do not renumber).

---

## Closure Checklist

- [x] Every deletion candidate passed the zero-importer grep gate (Sub-Task 1).
- [x] `core/widgets/**`, `core/admin/ui/widgets/**`, v1 builder parts, preview routes/clients removed.
- [x] Public entry-detail path renders V2-only; `hydrateRuntimeBlocks` and v1 render branches gone.
- [x] Docs updated per Sub-Task 8; no-widget byte-identity guards green.
- [x] Legacy tests deleted; V2 tests kept; deletion guards added.
- [x] `bun --cwd core lint` + `lint:types` + targeted Vitest/Bun + `check:admin-boundary` +
      `check:admin-bundle` green (or isolated with the named failing file recorded).
- [x] Runtime smoke ≥5 scenarios passed with screenshots in `_docs/_workflows/_smoke/`.
- [x] Changelog 1323 created and indexed; `TASK-580` + children `✅ Done`.
- [x] `_docs/_TASKS/README.md` rows + Statistics synced (S6 rows only).
- [x] Per-stream commit scope (file set + changelog 1323) reported to the owner.
