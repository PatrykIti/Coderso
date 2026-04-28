# TASK-105-10: Coverage Gap Rebaseline and Lane Backlog
# FileName: TASK-105-10_Coverage_Gap_Rebaseline_and_Lane_Backlog.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-04..09  
**Status:** Done (2026-03-08)

---

## Overview

Re-baseline `TASK-105` after the latest editor, listings, forms, and widget waves so the remaining path to real `100%` Vitest coverage is explicit again.

This analysis uses the live `2026-03-08` run of `bun run test:coverage` and maps the remaining backlog by:
- open `TASK-105` subtasks,
- existing `Vitest` suites,
- existing `Bun` suites that overlap in topic but should stay in the Bun lane,
- concrete new `Vitest` tests still required to close the metric honestly.

## Current Snapshot

Source: `bun run test:coverage` on `2026-03-08`

- `% Stmts`: `47.56`
- `% Branch`: `42.37`
- `% Funcs`: `42.21`
- `% Lines`: `50.18`
- raw files under `100%`: `385`
- infrastructure-noise files at `0%`: `11`
- real backlog files under `100%` after filtering those infra files: `374`
- backlog already inside the current open wave clusters `TASK-105-04..07`: `161`
- backlog still outside the original wave clusters: `213`

Infrastructure-noise files currently reported at `0%`:
- `core/admin/ui/audit/types.ts`
- `core/admin/ui/media/types.ts`
- `core/admin/ui/menus/types.ts`
- `core/admin/ui/pages/builder/types.ts`
- `core/admin/ui/plugins/types.ts`
- `core/admin/ui/roles/types.ts`
- `core/admin/ui/security/types.tsx`
- `core/admin/ui/store/types.ts`
- `core/admin/ui/users/types.ts`
- `core/admin/ui/widgets/types.ts`
- `core/admin/ui/widgets/editors/index.ts`

These should be treated as true coverage-noise candidates in `TASK-105-08`: either justify exclusion as infrastructure-only files or add minimal smoke-import coverage if the project wants them to stay inside the metric.

## Lane Split Findings

### Keep in Bun

These suites remain valid Bun ownership and should not be moved just to improve the Vitest percentage:
- runtime/public/admin route contracts under `tests/integration/routes/*`
- runtime rendering and write-path contracts under `tests/integration/runtime/*`
- posts runtime and revision flows under `tests/integration/posts/*`
- performance and security gates under `tests/perf/*` and `tests/security/*`
- DB/runtime domain suites that still depend on Bun-backed fixtures

Representative Bun overlaps that should remain in Bun:
- `tests/integration/routes/forms.test.ts`
- `tests/integration/routes/listings.test.ts`
- `tests/integration/routes/bookingRoutes.test.ts`
- `tests/integration/routes/pages.test.ts`
- `tests/integration/routes/postsRoutes.test.ts`
- `tests/integration/routes/widgets.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts`
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/integration/runtime/post-rendering-parity.test.tsx`
- `tests/integration/runtime/post-writing-canvas-wrap.test.tsx`
- `tests/perf/post-editor-load.test.tsx`

### Keep Closing in Vitest

Because `vitest.config.ts` includes:
- `core/admin/services/**/*.ts`
- `core/admin/utils/**/*.ts`
- `core/admin/ui/**/*.{ts,tsx}`
- `core/services/customScreens/**/*.ts`
- `packages/sdk/src/**/*.ts`

all remaining gaps inside those paths must be closed by new or expanded `Vitest` suites. Existing Bun topical overlap does not count toward `TASK-105` unless the runner ownership changes.

## Sub-Tasks

1. Finish `TASK-105-04` with branch-heavy `Vitest` tests for listings/forms/booking/themes shells.
2. Finish `TASK-105-05` with direct tests for internals currently hidden behind shell mocks.
3. Re-scope `TASK-105-06` by the live coverage report, not only by its original hotspot list.
4. Fold the `213` out-of-wave files into explicit `TASK-105-08` micro-waves before attempting final closure.
5. Reserve `TASK-105-09` for actual final metrics/docs/changelog sync after the coverage backlog is materially closed.

## Subtask Rebaseline

### TASK-105-04

Existing `Vitest` coverage already in place:
- `tests/vitest/ui/booking-page.test.tsx`
- `tests/vitest/ui/booking-tabs-leaf.test.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx`
- `tests/vitest/ui/form-builder.test.tsx`
- `tests/vitest/ui/form-actions-panel.test.tsx`
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-binding-editor.test.tsx`
- `tests/vitest/ui/themes.test.tsx`
- `tests/vitest/ui/theme-editor-page-leaf.test.tsx`
- `tests/vitest/ui-integration/forms.test.tsx`
- `tests/vitest/ui-integration/themes.test.tsx`
- `tests/vitest/admin/bookingClient.test.ts`
- `tests/vitest/admin/formsClient.test.ts`
- `tests/vitest/admin/listingsClient.test.ts`

Existing `Bun` overlap to keep:
- `tests/integration/routes/forms.test.ts`
- `tests/integration/routes/formActionsRoutes.test.ts`
- `tests/integration/routes/listings.test.ts`
- `tests/integration/routes/bookingRoutes.test.ts`
- `tests/integration/routes/themes.test.ts`
- `tests/unit/forms/*`
- `tests/unit/booking/*`
- `tests/unit/content/listing*.test.ts`
- `tests/unit/themes/*`

Concrete `Vitest` backlog still required:
- expand `tests/vitest/ui/listings-cluster-wave.test.tsx` or add `tests/vitest/ui/listing-editor-page-wave.test.tsx` for `ListingEditorPage.tsx`
- expand `tests/vitest/ui/listing-binding-editor.test.tsx` for error, removal, and no-selection branches in `BindingEditor.tsx`
- expand `tests/vitest/ui/booking-page.test.tsx` or add `tests/vitest/ui/booking-page-wave.test.tsx` for tab switching, empty/loading/error, and helper-driven summary branches in `BookingPage.tsx`
- add dedicated coverage for `bookingHelpers.ts`
- expand `tests/vitest/ui/form-builder.test.tsx` into real builder interactions for `FormBuilderPage.tsx`
- expand `tests/vitest/ui/form-actions-panel.test.tsx` for branch-heavy `FormActionsPanel.tsx`
- expand `tests/vitest/ui/form-action-logs-page.test.tsx` for filters, empty/error, and pagination branches
- add direct drawer/page coverage for `ThemeTemplateDrawer.tsx` and `ThemesPage.tsx`

Current highest-value files in this wave:
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/booking/BookingPage.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/forms/FormActionsPanel.tsx`
- `core/admin/ui/forms/FormActionLogsPage.tsx`
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx`
- `core/admin/ui/themes/ThemesPage.tsx`

### TASK-105-05

Existing `Vitest` coverage already in place:
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/entry-page-support-wave.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui/post-editor-support-wave-2.test.tsx`
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- `tests/vitest/ui/page-editor.test.tsx`
- `tests/vitest/ui/page-list.test.tsx`
- `tests/vitest/ui/page-settings-drawer.test.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`
- `tests/vitest/ui/post-editor-page.test.tsx`
- `tests/vitest/ui/posts-list.test.tsx`
- `tests/vitest/pageBuilder/*`
- `tests/vitest/ui-integration/post-*`
- `tests/vitest/posts/*`

Existing `Bun` overlap to keep:
- `tests/integration/routes/pages.test.ts`
- `tests/integration/routes/postsRoutes.test.ts`
- `tests/integration/posts/*`
- `tests/integration/runtime/post-*`
- `tests/perf/post-editor-load.test.tsx`
- `tests/unit/pages/*`
- `tests/unit/posts/*`
- `tests/unit/content/entryService.test.ts`

Concrete `Vitest` backlog still required:
- direct list/table coverage for `EntryList.tsx`, `EntryTable.tsx`, and `EntryBulkActionsBar.tsx`
- direct field rendering and conditional renderer coverage for `FieldRenderer.tsx`
- builder internals coverage for `BlockList.tsx`, `BlockSettings.tsx`, `WidgetPicker.tsx`, `VisualPanel.tsx`, and `WizardPanel.tsx`
- canvas-rich tests for `PostEditorCanvas.tsx`
- direct branch tests for `PostRichTextAdapter.tsx` and `postRichTextCommandEngine.ts`
- direct hook-state coverage for `usePostEditorState.ts`
- inspector-specific tests for `BlockInspector.tsx` and `DocumentInspector.tsx`
- follow-up branch tests for `PostClassicEditorShell.tsx`, `PostListViewPanel.tsx`, and `usePostEditorLayout.ts`

Current highest-value files in this wave:
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`

### TASK-105-06

Existing `Vitest` coverage already in place:
- `tests/vitest/ui/widget-editors-wave-1.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-template-editor.test.tsx`
- `tests/vitest/ui/widget-template-preview-dialog.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widgetInsertUtils.test.ts`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/widgets/*`
- `tests/vitest/admin/widgetsClient.test.ts`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplatePreviewClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/vitest/admin/widgetTemplateRevisionsClient.test.ts`

Existing `Bun` overlap to keep:
- `tests/integration/routes/widgets.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts`
- `tests/integration/routes/widgetTemplatePreview.test.ts`
- `tests/integration/routes/widgetTemplateCategories.test.ts`
- `tests/integration/routes/widgetTemplateRevisions.test.ts`
- `tests/unit/widgets/*`

Concrete `Vitest` backlog still required:
- add direct `Vitest` coverage for `EntryTeaserEditors.tsx`; today this hotspot is effectively Bun-only through `tests/unit/widgets/entryTeaser.test.tsx`
- add a second widget-editor wave for `ListingFiltersEditors.tsx`, `StatsKpiEditors.tsx`, and the `Product*Editors` family
- extend editor-focused coverage for `PostsFeedEditors.tsx` and `ContentListEditors.tsx` beyond the current wave-1 surface
- add UI-shell tests for `WidgetTemplateCategoryDrawer.tsx`, `WidgetTemplateRevisionDrawer.tsx`, `WidgetCatalogFilters.tsx`, `WidgetInsertDialog.tsx`, `WidgetLibraryPage.tsx`, and `useWidgetTemplates.ts`
- expand `WidgetTemplateEditorPage.tsx` and `WidgetCreateDialog.tsx` branch coverage

Current highest-value files in this wave:
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`

### TASK-105-07

This wave is done as a first delivery wave, but it still leaves branch backlog that must move into `TASK-105-08`.

Existing `Vitest` coverage already in place:
- `tests/vitest/sdk/pluginManifest.test.ts`
- `tests/vitest/sdk/client.test.ts`
- `tests/vitest/sdk/server.test.ts`
- `tests/vitest/sdk/exports.test.ts`
- `tests/vitest/sdk/hookContext.test.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`

Existing `Bun` overlap to keep:
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/unit/customScreens/bindingResolver.test.ts`
- `tests/unit/customScreens/customScreenService.test.ts`
- `tests/unit/plugins/pluginManifest.test.ts`
- `tests/unit/sdk/exports.test.ts`
- `tests/unit/sdk/hookContext.test.ts`

Concrete `Vitest` backlog still required:
- add direct `Vitest` coverage for `core/services/customScreens/bindingResolver.ts`
- add direct `Vitest` coverage for `core/admin/services/customScreensClient.ts`
- expand `pluginManifest.test.ts` for remaining branch paths
- expand `customScreenService.test.ts` and schema tests for remaining branch-only gaps

### TASK-105-08

This is not a real final mop-up wave yet. The live snapshot shows `213` real backlog files outside the original `04..07` split.

Current out-of-wave clusters that need explicit ownership before final closure:
- `core/admin/ui/settings` -> `35` files under `100%`
- `core/admin/services` -> `34`
- `core/admin/ui/content-types` -> `12`
- `core/admin/ui/media` -> `10`
- `core/admin/ui/custom-screens` -> `9`
- `core/admin/ui/auth` -> `7`
- `core/admin/utils` -> `7`
- `core/admin/ui/popups` -> `6`
- `core/admin/ui/users` -> `6`
- `core/admin/ui/menus` -> `6`
- `core/admin/ui/commerce` -> `6`
- `core/admin/ui/store` -> `6`
- `core/admin/ui/audit` -> `4`

Recommended re-scope for `TASK-105-08`:
1. `settings + admin services`
2. `content-types + media + auth + shared`
3. `popups + audit + users + menus + reviews`
4. final branch-only cleanup after those waves land

### TASK-105-09

Do not treat this as active closure work yet. It remains blocked by unfinished `04`, `05`, `06`, and the now-expanded `08`.

Concrete backlog once coverage is truly near `100%`:
- refresh `TASK-105` and `tests/RUNNER_OWNERSHIP.md` with final numbers
- sync `_docs/_TASKS/README.md`
- write final `_docs/_CHANGELOG/*` closure entry
- update `tests/README.md` if lane ownership or validation commands change

## Recommended Execution Order

1. Finish `TASK-105-04` shell-heavy admin surfaces.
2. Finish `TASK-105-05` internals that current shell waves still mock away.
3. Re-scope and finish `TASK-105-06` using the live hotspot list.
4. Pull the residual `TASK-105-07` branch gaps into `TASK-105-08`.
5. Split `TASK-105-08` into explicit micro-waves for the `213` out-of-wave files.
6. Run the actual closure pass in `TASK-105-09`.

## Testing Requirements

- `bun run test:coverage`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105_Real_Vitest_100_Coverage_Program.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
