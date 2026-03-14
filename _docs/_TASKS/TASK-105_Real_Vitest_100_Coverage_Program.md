# TASK-105: Real Vitest 100% Coverage Program
# FileName: TASK-105_Real_Vitest_100_Coverage_Program.md

**Priority:** High  
**Category:** QA + Platform + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-104  
**Status:** In Progress (2026-03-06)

---

## Overview

Drive the shipped Vitest lane to real `100%` coverage without manipulating the metric.

This task starts after `TASK-104`:
- runner ownership is now cleaner,
- Bun-free suites have been moved to Vitest,
- Bun baseline is no longer carrying most Bun-free UI load.

The remaining work is explicit:
- add missing real tests,
- cover still-unexecuted Vitest-owned code,
- avoid cheating via artificial `exclude` expansion.

## Business Context

After `TASK-104`, the repo can finally treat Vitest coverage as a serious product-quality signal for Bun-free code.
Right now the Vitest lane is broad but still far from full coverage.

Initial Vitest coverage snapshot (from `bun run test:coverage` on 2026-03-06):
- `% Stmts`: `38.01`
- `% Branch`: `33.57`
- `% Funcs`: `31.52`
- `% Lines`: `40.18`

Current Vitest coverage snapshot after the latest implemented waves (from `coverage/vitest/coverage-summary.json` on 2026-03-06):
- `% Stmts`: `43.21`
- `% Branch`: `38.55`
- `% Funcs`: `37.69`
- `% Lines`: `45.61`

Re-baseline before the next closure slices (from `bun run test:coverage` on 2026-03-08):
- `% Stmts`: `47.56`
- `% Branch`: `42.37`
- `% Funcs`: `42.21`
- `% Lines`: `50.18`
- raw files under `100%`: `385`
- infrastructure-noise files at `0%` (`types.ts`, `index.ts`): `11`
- real backlog files under `100%` after filtering those infra files: `374`
- backlog already covered by open wave clusters `TASK-105-04..07`: `161`
- backlog still outside the original wave clusters and therefore not yet represented by the task split: `213`

Current snapshot after the latest forms, listings, themes, booking, and widget-editor follow-up slices (from `bun run test:coverage` on 2026-03-08):
- `% Stmts`: `52.40`
- `% Branch`: `46.13`
- `% Funcs`: `48.07`
- `% Lines`: `55.01`
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `81.25%` lines, `65.95%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `87.24%` lines, `63.12%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `96.42%` lines, `77.27%` branches
- aggregate `core/admin/ui/forms/*` -> `86.06%` lines, `66.93%` branches
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines, `72.99%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `91.04%` lines, `74.13%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines, `72.22%` branches
- aggregate `core/admin/ui/listings/*` -> `87.53%` lines, `65.00%` branches
- `core/admin/ui/booking/BookingPage.tsx` -> `90.11%` lines, `63.25%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `84.48%` lines, `67.39%` branches
- aggregate `core/admin/ui/booking/*` -> `65.04%` lines, `77.41%` branches
- `core/admin/ui/themes/ThemesPage.tsx` -> `90.67%` lines, `75.71%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines, `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `72.99%` lines, `74.35%` branches
- aggregate `core/admin/ui/themes/*` -> `90.78%` lines, `73.47%` branches
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` -> `90.84%` lines, `66.04%` branches
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` -> `74.33%` lines, `36.06%` branches
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` -> `96.70%` lines, `64.00%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `50.76%` lines, `35.33%` branches
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` -> `87.50%` lines, `66.07%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `50.61%` lines, `49.66%` branches

Canonical full-lane rebaseline after the coverage report-path fix (from `coverage/vitest/coverage-summary.json` on 2026-03-10):
- `% Stmts`: `60.75`
- `% Branch`: `51.40`
- `% Funcs`: `65.24`
- `% Lines`: `63.65`
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` -> `96.73%` lines, `88.27%` branches
- `core/admin/ui/widgets/editors/FooterEditors.tsx` -> `96.85%` lines, `89.47%` branches
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` -> `97.18%` lines, `58.82%` branches
- `core/admin/ui/widgets/editors/TeamEditors.tsx` -> `97.67%` lines, `60.71%` branches
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` -> `97.72%` lines, `91.07%` branches
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` -> `97.93%` lines, `75.22%` branches
- `core/admin/ui/widgets/editors/DividerEditors.tsx` -> `98.33%` lines, `71.73%` branches
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` -> `98.80%` lines, `64.00%` branches
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` -> `100.00%` lines, `69.33%` branches
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` -> `100.00%` lines, `80.00%` branches
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` -> `100.00%` lines, `66.66%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `99.17%` lines, `77.13%` branches across `40` tracked files
- previous “flat” comparisons against `/tmp/nextless-vitest-cov/coverage-summary.json` are superseded; that file was a stale artifact, not the current full-lane snapshot

Current snapshot after the first `TASK-105-05` entries/pages/posts foundation slice (from `bun run test:coverage` on 2026-03-11):
- `% Stmts`: `61.76`
- `% Branch`: `52.25`
- `% Funcs`: `66.57`
- `% Lines`: `64.70`
- `core/admin/ui/entries/EntryList.tsx` -> `94.21%` lines, `75.17%` branches
- `core/admin/ui/pages/PagePreview.tsx` -> `88.88%` lines, `91.66%` branches
- `core/admin/ui/pages/builder/BlockList.tsx` -> `71.26%` lines, `63.51%` branches
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts` -> `98.27%` lines, `67.92%` branches

Current snapshot after the `TASK-105-05` entries/pages follow-up slice (from `bun run test:coverage` on 2026-03-11):
- `% Stmts`: `62.00`
- `% Branch`: `52.60`
- `% Funcs`: `66.84`
- `% Lines`: `64.95`
- `core/admin/ui/entries/FieldRenderer.tsx` -> `94.73%` lines, `83.33%` branches
- `core/admin/ui/pages/PageListPage.tsx` -> `78.78%` lines, `51.78%` branches

Current snapshot after the `TASK-105-05` posts shell jump (from `bun run test:coverage` on 2026-03-11):
- `% Stmts`: `62.53`
- `% Branch`: `52.99`
- `% Funcs`: `67.18`
- `% Lines`: `65.54`
- `core/admin/ui/posts/PostsListPage.tsx` -> `79.54%` lines, `47.61%` branches
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` -> `91.00%` lines, `74.43%` branches

Fresh canonical full-lane rebaseline after the latest `2026-03-14` run of `bun run test:coverage`:
- `% Stmts`: `67.58`
- `% Branch`: `58.19`
- `% Funcs`: `71.25`
- `% Lines`: `70.78`
- infrastructure-noise files still sitting at `0%`: `11` (`types.ts` / `index.ts` ownership noise first documented in `TASK-105-10`)
- `core/admin/ui/widgets/editors/*` -> `100.00%` lines / `83.01%` branches across `40` tracked files
- `core/admin/ui/forms/*` -> `88.68%` lines / `68.84%` branches
- `core/admin/ui/listings/*` -> `88.67%` lines / `70.25%` branches
- `core/admin/ui/booking/*` -> `93.86%` lines / `72.16%` branches
- `core/admin/ui/themes/*` -> `88.96%` lines / `78.22%` branches
- `core/admin/ui/entries/*` -> `84.48%` lines / `70.31%` branches
- `core/admin/ui/pages/*` -> `81.48%` lines / `68.56%` branches
- `core/admin/ui/posts/*` -> `90.73%` lines / `77.51%` branches
- current `TASK-105-05` hotspots are now `VisualPanel.tsx` (`62.50%` lines), `inspectorSchemas.ts` (`60.71%`), `PostEditorLayout.tsx` (`61.53%`), `PostDocumentOutline.tsx` (`68.75%`), `EntryTable.tsx` (`70.58%`), `PostBlockEditorShell.tsx` (`75.96%`), `PageEditor.tsx` (`74.54%`), `PostEditorCanvas.tsx` (`85.29%`), `PostRichTextAdapter.tsx` (`86.47%`), and `usePostEditorState.ts` (`90.10%`)
- current `TASK-105-04` hotspots are now booking leaf tabs (`AvailabilityTab.tsx`, `ReservationsTab.tsx`, `ServicesTab.tsx`, `SlotPreviewTab.tsx`), `ThemeExportDialog.tsx`, `ThemeTemplateDrawer.tsx`, `FormCanvas.tsx`, `FormListPage.tsx`, and `ListingListPage.tsx`
- despite the gains in `TASK-105-04..06`, the lane still has major backlog outside those waves; `TASK-105-08` remains premature until broader low-line admin surfaces are folded into explicit follow-up slices

Current snapshot after the latest `TASK-105-04` and `TASK-105-05` follow-up slice on `2026-03-14`:
- `% Stmts`: `67.86`
- `% Branch`: `58.51`
- `% Funcs`: `71.59`
- `% Lines`: `71.05`
- `core/admin/ui/pages/builder/VisualPanel.tsx` -> `100.00%` lines / `92.30%` branches
- `core/admin/ui/entries/EntryBulkActionsBar.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/entries/EntryTable.tsx` -> `94.11%` lines / `92.00%` branches
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx` -> `100.00%` lines / `94.23%` branches
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx` -> `100.00%` lines / `91.30%` branches
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` -> `90.55%` lines / `79.41%` branches
- `core/admin/ui/forms/FormListPage.tsx` -> `90.32%` lines / `83.33%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- next `TASK-105-05` hotspots are now `PostEditorCanvas.tsx` (`85.29%` lines), `PostRichTextAdapter.tsx` (`86.47%`), `usePostEditorState.ts` (`90.10%`), `PageEditor.tsx` (`74.54%`), `PageSettingsDrawer.tsx` (`73.33%`), `PostBlockEditorShell.tsx` (`75.96%`), and `PostEditorPage.tsx` (`72.72%`)
- next `TASK-105-04` hotspots remain booking leaf tab internals plus `FormCanvas.tsx`, `ListingListPage.tsx`, and `ThemeTemplateDrawer.tsx`

Current snapshot after the deeper editor shell/canvas/state follow-up on `2026-03-14`:
- `% Stmts`: `68.17`
- `% Branch`: `58.83`
- `% Funcs`: `71.76`
- `% Lines`: `71.35`
- `core/admin/ui/posts/PostEditorPage.tsx` -> `100.00%` lines / `85.00%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `82.94%` lines / `63.80%` branches
- `core/admin/ui/pages/PageEditor.tsx` -> `78.78%` lines / `63.67%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `82.22%` lines / `79.76%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `89.33%` lines / `72.50%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `87.26%` lines / `68.47%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `91.66%` lines / `76.54%` branches
- next `TASK-105-05` hotspots are now concentrated in `PageEditor.tsx`, `PageSettingsDrawer.tsx`, `PostBlockEditorShell.tsx`, `PostEditorCanvas.tsx`, `PostRichTextAdapter.tsx`, and the remaining `usePostEditorState.ts` async branches

Current snapshot after the page leaf / sidebar / toolbar / inserter follow-up on `2026-03-14`:
- `% Stmts`: `68.37`
- `% Branch`: `59.11`
- `% Funcs`: `71.93`
- `% Lines`: `71.55`
- `core/admin/ui/pages/DeviceSwitcher.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/pages/PageRowActions.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx` -> `100.00%` lines / `85.71%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `85.50%` lines / `76.27%` branches
- `core/admin/ui/pages/PageEditor.tsx` -> `82.12%` lines / `64.12%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `82.22%` lines / `82.14%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `86.82%` lines / `69.52%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `90.07%` lines / `76.13%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `88.20%` lines / `70.10%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `79.20%` branches
- next `TASK-105-05` hotspots are now concentrated in `PageEditor.tsx`, `PageSettingsDrawer.tsx`, `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, `PostBlockEditorShell.tsx`, and `PostRichTextAdapter.tsx`

Current snapshot after the latest page-settings and adapter follow-up on `2026-03-14`:
- `% Stmts`: `68.56`
- `% Branch`: `59.26`
- `% Funcs`: `72.24`
- `% Lines`: `71.72`
- `core/admin/ui/pages/PageEditor.tsx` -> `83.03%` lines / `65.47%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `83.80%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `89.46%` lines / `70.83%` branches
- next `TASK-105-05` hotspots are now led by `PageEditor.tsx`, `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

Additional widget-editor product/template snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `53.20`
- `% Branch`: `46.79`
- `% Funcs`: `49.74`
- `% Lines`: `55.83`
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` -> `93.93%` lines, `73.33%` branches
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` -> `100.00%` lines, `74.59%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `85.38%` lines, `64.66%` branches
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` -> `100.00%` lines, `62.50%` branches
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` -> `95.00%` lines, `63.15%` branches
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx` -> `100.00%` lines, `62.50%` branches
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` -> `100.00%` lines, `71.79%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `50.54%` lines, `48.35%` branches
- remaining widget-editor low-line hotspots after this slice -> `PricingPlansEditors.tsx` (`23.94%`), `TeamEditors.tsx` (`28.68%`), `NavigationEditors.tsx` (`30.57%`), `HeroEditors.tsx` (`32.37%`), `FaqAccordionEditors.tsx` (`32.95%`)

Additional widget-editor layout/social-proof snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `55.82`
- `% Branch`: `48.51`
- `% Funcs`: `53.95`
- `% Lines`: `58.65`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` -> `97.18%` lines, `58.82%` branches
- `core/admin/ui/widgets/editors/TeamEditors.tsx` -> `97.67%` lines, `60.71%` branches
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` -> `89.01%` lines, `63.33%` branches
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` -> `89.77%` lines, `60.00%` branches
- `core/admin/ui/widgets/editors/HeroEditors.tsx` -> `82.37%` lines, `82.26%` branches
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` -> `91.73%` lines, `72.12%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `68.06%` lines, `59.06%` branches
- remaining widget-editor low-line hotspots after this slice -> `ContactEditors.tsx` (`35.71%`), `LogoCloudEditors.tsx` (`35.71%`), `RichTextSectionEditors.tsx` (`37.11%`), `BookingCalendarEditors.tsx` (`37.14%`), `CompareTimelineEditors.tsx` (`38.09%`)

Additional widget-editor contact/content snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `57.61`
- `% Branch`: `49.22`
- `% Funcs`: `57.58`
- `% Lines`: `60.53`
- `core/admin/ui/widgets/editors/ContactEditors.tsx` -> `92.85%` lines, `63.80%` branches
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` -> `100.00%` lines, `70.58%` branches
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` -> `96.42%` lines, `66.37%` branches
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` -> `88.23%` lines, `58.97%` branches
- `core/admin/ui/widgets/editors/FooterEditors.tsx` -> `96.85%` lines, `89.47%` branches
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` -> `98.80%` lines, `64.00%` branches
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` -> `89.69%` lines, `63.79%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `79.78%` lines, `63.55%` branches
- remaining widget-editor low-line hotspots after this slice -> `GalleryMosaicEditors.tsx` (`38.29%`), `CtaBannerEditors.tsx` (`38.33%`), `TimelineEditors.tsx` (`40.17%`), `NewsletterEditors.tsx` (`42.85%`), `SearchBoxEditors.tsx` (`46.15%`)

Additional widget-editor promo/content snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `58.71`
- `% Branch`: `49.58`
- `% Funcs`: `60.26`
- `% Lines`: `61.64`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` -> `95.74%` lines, `66.66%` branches
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` -> `86.66%` lines, `62.50%` branches
- `core/admin/ui/widgets/editors/TimelineEditors.tsx` -> `99.10%` lines, `84.21%` branches
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx` -> `93.65%` lines, `61.42%` branches
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` -> `98.07%` lines, `64.28%` branches
- `core/admin/ui/widgets/editors/SectionEditors.tsx` -> `88.52%` lines, `57.14%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `86.63%` lines, `65.76%` branches
- remaining widget-editor low-line hotspots after this slice -> `GridColumnsEditors.tsx` (`48.07%`), `AccordionEditors.tsx` (`50.00%`), `ToggleBlockEditors.tsx` (`51.72%`), `FormEmbedEditors.tsx` (`51.80%`), `TabsEditors.tsx` (`52.27%`)

Additional widget-editor utility-layout snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `58.91`
- `% Branch`: `49.63`
- `% Funcs`: `60.77`
- `% Lines`: `61.83`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` -> `100.00%` lines, `55.95%` branches
- `core/admin/ui/widgets/editors/AccordionEditors.tsx` -> `100.00%` lines, `67.64%` branches
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` -> `100.00%` lines, `53.33%` branches
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` -> `100.00%` lines, `79.31%` branches
- `core/admin/ui/widgets/editors/TabsEditors.tsx` -> `100.00%` lines, `64.86%` branches
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` -> `98.00%` lines, `57.57%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `87.86%` lines, `66.05%` branches
- remaining widget-editor low-line hotspots after this slice -> `StackEditors.tsx` (`58.92%`), `SpacerEditors.tsx` (`60.00%`), `DividerEditors.tsx` (`61.66%`), with residual branch gaps still left in `GridColumnsEditors`, `ToggleBlockEditors`, and `SplitLayoutEditors`

Additional widget-editor stack/spacer snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `59.77`
- `% Branch`: `49.99`
- `% Funcs`: `62.81`
- `% Lines`: `62.63`
- `core/admin/ui/widgets/editors/StackEditors.tsx` -> `100.00%` lines, `58.33%` branches
- `core/admin/ui/widgets/editors/SpacerEditors.tsx` -> `97.50%` lines, `71.42%` branches
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` -> `100.00%` lines, `96.96%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `90.08%` lines, `68.30%` branches
- remaining widget-editor low-line hotspots after this slice -> `DividerEditors.tsx` (`61.66%`), with residual branch gaps still left in `GridColumnsEditors`, `ToggleBlockEditors`, `StackEditors`, and `SpacerEditors`

Additional widget-editor divider snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `59.77`
- `% Branch`: `49.99`
- `% Funcs`: `62.81`
- `% Lines`: `62.63`
- `core/admin/ui/widgets/editors/DividerEditors.tsx` -> `90.00%` lines, `67.39%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `92.80%` lines, `68.30%` branches
- remaining widget-editor low-line hotspots after this slice -> `HeroEditors.tsx` (`82.37%`), `AppointmentFormEditors.tsx` (`83.33%`), `ContentListEditors.tsx` (`85.38%`), `CtaBannerEditors.tsx` (`86.66%`), `SectionEditors.tsx` (`88.52%`)

Additional widget-editor appointment/banner snapshot (from `bun run test:coverage` on 2026-03-09):
- `% Stmts`: `59.91`
- `% Branch`: `50.04`
- `% Funcs`: `63.16`
- `% Lines`: `63.14`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` -> `97.22%` lines, `70.00%` branches
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` -> `100.00%` lines, `62.50%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `93.71%` lines, `68.63%` branches
- remaining widget-editor low-line hotspots after this slice -> `HeroEditors.tsx` (`82.37%`), `ContentListEditors.tsx` (`85.38%`), `SectionEditors.tsx` (`88.52%`), `DividerEditors.tsx` (`90.00%`), with branch-gap work still open in `GridColumnsEditors`, `ToggleBlockEditors`, `StackEditors`, and `SpacerEditors`

Additional widget-editor hero/content snapshot (from `bun run test:coverage` on 2026-03-10):
- `% Stmts`: `60.24`
- `% Branch`: `50.21`
- `% Funcs`: `63.98`
- `% Lines`: `63.14`
- `core/admin/ui/widgets/editors/HeroEditors.tsx` -> `99.35%` lines, `91.32%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `98.46%` lines, `68.42%` branches
- `core/admin/ui/widgets/editors/SectionEditors.tsx` -> `100.00%` lines, `57.14%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `95.97%` lines, `69.72%` branches
- remaining widget-editor low-line hotspots after this slice -> `DividerEditors.tsx` (`90.00%`), `AppointmentFormEditors.tsx` (`97.22%`), with branch-gap work still open in `SectionEditors`, `GridColumnsEditors`, `ToggleBlockEditors`, `StackEditors`, `SpacerEditors`, and `CtaBannerEditors`

Additional widget-editor residual-closure snapshot (from `bun run test:coverage` on 2026-03-10):
- `% Stmts`: `60.27`
- `% Branch`: `50.65`
- `% Funcs`: `64.04`
- `% Lines`: `63.16`
- `core/admin/ui/widgets/editors/DividerEditors.tsx` -> `98.33%` lines, `71.73%` branches
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` -> `100.00%` lines, `97.61%` branches
- `core/admin/ui/widgets/editors/SectionEditors.tsx` -> `100.00%` lines, `61.22%` branches
- `core/admin/ui/widgets/editors/SpacerEditors.tsx` -> `100.00%` lines, `96.42%` branches
- `core/admin/ui/widgets/editors/StackEditors.tsx` -> `100.00%` lines, `97.22%` branches
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` -> `100.00%` lines, `96.66%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `96.12%` lines, `72.42%` branches
- defensive follow-up on `AppointmentFormEditors`, `ContentListEditors`, `CtaBannerEditors`, and `SectionEditors` kept the authoritative full-lane snapshot flat while adding sparse-normalization and stale-async-path coverage
- parallel low-line follow-up on `StatsKpiEditors`, `FeatureGridEditors`, `TestimonialsEditors`, `RichTextSectionEditors`, `FaqAccordionEditors`, `EntryTeaserEditors`, and `NavigationEditors` produced stronger isolated targeted runs, but the authoritative full-lane snapshot still remained flat
- contact/newsletter follow-up produced stronger isolated targeted runs for `ContactEditors` and `NewsletterEditors`, but the authoritative full-lane snapshot still remained flat
- compare/posts/shared follow-up produced stronger isolated targeted runs for `CompareTimelineEditors`, `PostsFeedEditors`, and `CommerceWidgetEditorShared`, plus a selector-scope fix for `ProductGalleryEditors`, but the authoritative full-lane snapshot still remained flat
- commerce shared number-guard follow-up locked an extra overflow-style numeric input path without changing the authoritative full-lane snapshot
- gallery mosaic follow-up produced a stronger isolated targeted run for `GalleryMosaicEditors`, but the authoritative full-lane snapshot still remained flat
- pricing plans follow-up produced a stronger isolated targeted run for `PricingPlansEditors` (`99.29%` lines / `59.80%` branches) without a separate full-lane rebaseline
- canonical report-path fix and fresh full-lane rebaseline moved the true widget-editor aggregate to `99.17%` lines / `77.13%` branches
- footer/team/navigation/logo/divider/entry follow-up moved the widget-editor aggregate further to `99.76%` lines / `77.43%` branches in the canonical full-lane snapshot
- stats/navigation/pricing/hero follow-up moved the widget-editor aggregate further to `99.97%` lines / `77.47%` branches in the canonical full-lane snapshot
- timeline line-gap closure moved the widget-editor aggregate to `100.00%` lines / `77.47%` branches in the canonical full-lane snapshot
- logo cloud safety follow-up added defensive default/no-handler coverage without changing the canonical full-lane snapshot
- product compare/table branch cleanup moved both files to `75.00%` branches in isolated targeted runs without a separate full-lane rebaseline
- newsletter/pricing safety follow-up added defensive default/no-handler coverage without changing the canonical full-lane snapshot
- newsletter/team/logo refactor follow-up moved the widget-editor aggregate further to `100.00%` lines / `78.41%` branches in the canonical full-lane snapshot
- remaining widget-editor focus after this slice -> residual branch closure in `FeatureGridEditors`, `PricingPlansEditors`, and `LogoCloudEditors`

This means the next stage is not runner cleanup anymore.
It is real test authoring across still-uncovered Vitest-owned surfaces.

## Hard Rule

`100%` here means:
- add or improve real tests,
- cover actual branches, render states, and behaviors,
- do not expand `coverage.exclude` except for true infrastructure noise,
- do not shrink ownership just to make the number look better.

## High-Level Hotspots

### Remaining low-coverage hotspots

- `core/admin/ui/audit/AuditTable.tsx` -> `8.33%`
- `core/admin/ui/popups/components/PopupEditorForm.tsx` -> `13.04%`
- `core/admin/ui/users/UserDetailsDrawer.tsx` -> `18.18%`
- `core/admin/ui/settings/SessionsPage.tsx` -> `21.62%`
- `core/admin/ui/settings/ApiKeysPage.tsx` -> `24.35%`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `50.76%`

### Zero-gap waves already cleared

- `packages/sdk/src/pluginManifest.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/admin/utils/sessionCache.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/taxonomyClient.ts`
- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/redirects/RedirectsPage.tsx`

### Current large low-coverage area clusters

| Area | Current line coverage | Notes |
|------|-----------------------|-------|
| `core/admin/ui/booking` | `26.37%` | shell-heavy page and helper branches still mostly open |
| `core/admin/ui/widgets/editors` | `47.79%` | still the largest editor-only backlog in the Vitest lane |
| `core/admin/ui/settings` | `40.22%` | large admin surface not represented by the original wave split |
| `core/admin/ui/forms` | `50.34%` | builder shell, action panel, and logs page remain open |
| `core/admin/ui/listings` | `50.67%` | editor flow and binding editor still branch-light |
| `core/admin/ui/pages` | `74.50%` | page builder internals remain under-tested despite shell waves |
| `core/admin/ui/entries` | `65.33%` | list, renderer, and table branches still open |
| `core/admin/ui/posts/editor` | `49.68%` | canvas, richtext adapter, inspectors, and hook branches remain wide |

## Goals

1. Raise Vitest lane coverage to real `100%`.
2. Cover real user-facing and domain-facing behavior, not synthetic snapshots only.
3. Keep Bun/Vitest ownership stable while adding missing tests.
4. Turn remaining low-coverage files into explicit wave-based work, not random cleanup.

## Non-Goals

1. Artificially shrinking the Vitest lane to force `100%`.
2. Moving runtime-coupled files out of scope just to improve percentages.
3. Replacing meaningful coverage with snapshot-only noise.

## Workstreams

1. Coverage matrix and invariants freeze.
2. Zero-coverage admin service/client wave.
3. Small UI/support component wave.
4. Themes/booking/listings/forms wave.
5. Entries/pages/posts editor shell wave.
6. Widget/editor deep coverage wave.
7. SDK/custom screens domain wave.
8. Final branch/statement gap closure.
9. QA/docs/changelog/board closure.
10. Legacy Bun-free test migration cleanup.
11. Mixed-module product refactors for runner eligibility.

## Progress

Completed waves:
- admin service zero-coverage clients and `sessionCache`
- SDK `pluginManifest`, `client`, and `server`
- custom screens service coverage
- small UI leafs (`BlockLibrary`, `FormCanvas`, `MediaDetailsPanel`, `PluginFilters`, theme route/token editors)
- themes leaf cards and `ThemeEditorPage`
- redirects page leaf coverage
- booking tab leaf coverage
- plugin/media/site leaf coverage
- analytics/settings/entries/seo leaf coverage
- menu leaf coverage
- post-editor/settings/storage/api-key utility leaf coverage
- `recaptcha` and `blockDnD` utility coverage
- first substantial `listings` wave (`filters`, `search`, `list`, `template manager`, hooks)
- forms support wave (`useForms`, list/create flow, settings/runtime panels)
- direct builder, automation, and action-log coverage for `FormBuilderPage`, `FormActionsPanel`, and `FormActionLogsPage`
- direct editor coverage for `ListingEditorPage`
- direct interaction coverage for `BindingEditor`
- deeper branch coverage for `ListingTemplateManager`
- direct create/edit/save/invert coverage for `ThemeTemplateDrawer`
- shell-level action coverage for `BookingPage`
- interactive page-level coverage for `ThemesPage`
- direct create/edit/no-template coverage for `ThemeProfileDrawer`
- first `TASK-105-05` foundation slice for `EntryList`, `PagePreview`, page-builder `BlockList`, and post `blockTransforms`
- second `TASK-105-05` follow-up slice for `FieldRenderer` and `PageListPage`
- third `TASK-105-05` follow-up slice for `PostsListPage` and `PostClassicEditorShell`
- direct Vitest coverage for `EntryTeaserEditors`
- direct Vitest coverage for `ListingFiltersEditors`
- direct Vitest coverage for `PostsFeedEditors`
- initial direct Vitest coverage for `ContentListEditors`
- direct Vitest coverage for `CommerceWidgetEditorShared`
- direct Vitest coverage for `ProductCompareEditors`
- direct Vitest coverage for `ProductGalleryEditors`
- direct Vitest coverage for `ProductTableEditors`
- direct Vitest coverage for `TemplateSectionEditors`
- deeper branch coverage for `ListingFiltersEditors`
- direct Vitest coverage for `PricingPlansEditors`
- direct Vitest coverage for `TeamEditors`
- direct Vitest coverage for `TestimonialsEditors`
- direct Vitest coverage for `FaqAccordionEditors`
- direct Vitest coverage for `HeroEditors`
- direct Vitest coverage for `NavigationEditors`
- direct Vitest coverage for `ContactEditors`
- direct Vitest coverage for `BookingCalendarEditors`
- direct Vitest coverage for `CompareTimelineEditors`
- direct Vitest coverage for `FeatureGridEditors`
- direct Vitest coverage for `FooterEditors`
- direct Vitest coverage for `LogoCloudEditors`
- direct Vitest coverage for `RichTextSectionEditors`
- direct Vitest coverage for `GalleryMosaicEditors`
- direct Vitest coverage for `CtaBannerEditors`
- direct Vitest coverage for `TimelineEditors`
- direct Vitest coverage for `NewsletterEditors`
- direct Vitest coverage for `SearchBoxEditors`
- direct Vitest coverage for `SectionEditors`
- direct Vitest coverage for `TabsEditors`
- direct Vitest coverage for `SplitLayoutEditors`
- direct Vitest coverage for `GridColumnsEditors`
- direct Vitest coverage for `AccordionEditors`
- direct Vitest coverage for `ToggleBlockEditors`
- direct Vitest coverage for `FormEmbedEditors`
- direct Vitest coverage for `StackEditors`
- direct Vitest coverage for `SpacerEditors`
- deeper branch coverage for `SplitLayoutEditors`
- direct Vitest coverage for `DividerEditors`
- direct Vitest coverage for `AppointmentFormEditors`
- deeper value-path coverage for `CtaBannerEditors`
- deeper branch and line coverage for `HeroEditors`
- deeper branch and line coverage for `ContentListEditors`
- deeper branch and token coverage for `SectionEditors`
- deeper branch coverage for `GridColumnsEditors`
- deeper branch coverage for `ToggleBlockEditors`
- deeper branch coverage for `StackEditors`
- deeper branch coverage for `SpacerEditors`
- deeper line and branch coverage for `DividerEditors`

Remaining large clusters:
- forms builder pages and panels
- entries/pages/posts editor shells
- widgets editor suites
- deeper `listings` editor/page flows
- settings, popups, audit, users, content-types, media, auth, and other non-wave admin surfaces now quantified by `TASK-105-10`

The mixed-module runner-eligibility track in `TASK-105-12` is now closed; the remaining backlog is direct product coverage work rather than import-boundary cleanup.

## Sub-Tasks

1. `TASK-105-01_Vitest_Coverage_Matrix_and_Invariants.md`
2. `TASK-105-02_Admin_Services_Zero_Coverage_Wave.md`
3. `TASK-105-03_Small_UI_and_Support_Component_Wave.md`
4. `TASK-105-04_Themes_Booking_Listings_Forms_Wave.md`
5. `TASK-105-05_Entries_Pages_Posts_Editor_Wave.md`
6. `TASK-105-06_Widget_Editor_New_Tests_Wave.md`
7. `TASK-105-07_SDK_PluginManifest_and_Custom_Screens_Service_Wave.md`
8. `TASK-105-08_Final_Per_File_100_Gap_Closure.md`
9. `TASK-105-09_QA_Docs_Changelog_and_Closure.md`
10. `TASK-105-11_Legacy_Bun_Free_Test_Migration_Cleanup.md`
11. `TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md`
10. `TASK-105-10_Coverage_Gap_Rebaseline_and_Lane_Backlog.md`

## Implementation Order

1. Freeze the coverage matrix and target files.
2. Clear zero-coverage small files first.
3. Attack medium admin areas by product surface.
4. Attack large editor/widget clusters in waves.
5. Finish with strict per-file gap closure and QA sync.

## Pseudocode

```ts
const vitestReport = parseCoverage("coverage/vitest/lcov.info");
const backlog = prioritize(vitestReport, {
  strategy: ["zero-first", "small-files", "product-clusters", "branch-gaps"],
});

for (const wave of backlog) {
  addRealTests(wave.files);
  validateVitestCoverage();
}
```

## Acceptance Criteria

1. The Vitest-owned surface reaches real `100%` without dishonest exclusions.
2. Every coverage wave names concrete files/modules and real behavior to test.
3. Final closure documents what changed and what `100%` actually covers.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd store lint`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_CHANGELOG/*.md`

## Latest Snapshot

Current snapshot after the latest page-editor and adapter micro-follow-up on `2026-03-14`:
- `% Stmts`: `68.64`
- `% Branch`: `59.37`
- `% Funcs`: `72.27`
- `% Lines`: `71.79`
- `core/admin/ui/pages/PageEditor.tsx` -> `84.84%` lines / `67.71%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- next `TASK-105-05` hotspots are now led by `PageEditor.tsx`, `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

Current snapshot after the latest page-editor, toolbar, inserter, and adapter follow-up on `2026-03-14`:
- `% Stmts`: `68.66`
- `% Branch`: `59.38`
- `% Funcs`: `72.31`
- `% Lines`: `71.81`
- `core/admin/ui/pages/PageEditor.tsx` -> `84.84%` lines / `67.71%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `89.85%` lines / `76.27%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches
- next `TASK-105-05` hotspots are now led by `PageEditor.tsx`, `PostRichTextToolbar.tsx`, `BlockInserter.tsx`, and the remaining `PostRichTextAdapter.tsx` branches

Current snapshot after the latest page-editor reorder and shell-error follow-up on `2026-03-14`:
- `% Stmts`: `68.66`
- `% Branch`: `59.38`
- `% Funcs`: `72.31`
- `% Lines`: `71.81`
- `core/admin/ui/pages/PageEditor.tsx` -> `85.45%` lines / `68.60%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `84.21%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `89.85%` lines / `76.27%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `90.09%` lines / `72.28%` branches

Current snapshot after the latest page-editor state and editor chrome input follow-up on `2026-03-14`:
- `% Stmts`: `68.89`
- `% Branch`: `59.63`
- `% Funcs`: `72.41`
- `% Lines`: `72.06`
- `458` Vitest files / `1684` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/pages/PageSettingsDrawer.tsx` -> `96.66%` lines / `86.90%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `90.07%` lines / `76.13%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `92.45%` lines / `75.18%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `86.48%` lines / `85.96%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `98.55%` lines / `81.35%` branches
- widget/editor line closure remains intact, but the best `TASK-105-05` ROI is now concentrated in `PostRichTextToolbar.tsx`, `PostRichTextAdapter.tsx`, `PostEditorCanvas.tsx`, and smaller residual page/shell edges
- broader low-line admin backlog outside the active wave still materially dominates the program tail (`AuditTable.tsx`, `PopupEditorForm.tsx`, `WidgetTemplateCategoryDrawer.tsx`, `UserDetailsDrawer.tsx`, `BackupsPage.tsx`)

Current snapshot after the latest editor canvas, adapter, and toolbar follow-up on `2026-03-14`:
- `% Stmts`: `69.01`
- `% Branch`: `59.75`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1691` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `79.45%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` -> `98.55%` lines / `81.35%` branches
- `scripts/run-vitest-coverage.ts` no longer double-cleans the reports directory, which removes the intermittent `coverage/vitest/.tmp` / HTML report `ENOENT` failures during `bun run test:coverage`
- the `TASK-105-05` hotspot list is now dominated by smaller shell/media/async residues, while the overall program tail is increasingly driven by low-line admin surfaces outside the current editor-focused wave

Current snapshot after the latest shell/state/canvas branch-hardening follow-up on `2026-03-14`:
- `% Stmts`: `69.01`
- `% Branch`: `59.91`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1691` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.15%` lines / `77.57%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `88.57%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.08%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches
- editor-shell branch hardening is now materially better, so the active-wave ROI is mostly residual async/media edges while the long-tail program backlog remains dominated by low-line admin surfaces outside `TASK-105-05`

Current snapshot after the latest hook/helper follow-up on `2026-03-14`:
- `% Stmts`: `69.03`
- `% Branch`: `59.95`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1698` tests
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` -> `95.34%` lines / `88.57%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `76.63%` branches
- helper-export hardening continues to move the lane, but the best remaining ROI is now mostly in residual async/media/preview branches and in low-line admin backlog outside the active editor wave

Current snapshot after the latest adapter paste and typography follow-up on `2026-03-14`:
- `% Stmts`: `69.03`
- `% Branch`: `60.00`
- `% Funcs`: `72.51`
- `% Lines`: `72.19`
- `458` Vitest files / `1698` tests
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `78.44%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` -> `90.54%` lines / `87.71%` branches
- the active editor wave has now pushed the shipped Vitest lane to a clean `60.00%` branch baseline, and the remaining ROI is increasingly about residual edge-case flattening versus broader low-line admin backlog selection

Current snapshot after the latest page-editor and listings list follow-up on `2026-03-14`:
- `% Stmts`: `69.05`
- `% Branch`: `60.09`
- `% Funcs`: `72.52`
- `% Lines`: `72.21`
- `459` Vitest files / `1705` tests
- `core/admin/ui/pages/PageEditor.tsx` -> `95.45%` lines / `82.51%` branches
- `core/admin/ui/listings/ListingListPage.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` -> `95.22%` lines / `85.49%` branches
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` -> `94.27%` lines / `80.56%` branches
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` -> `94.02%` lines / `78.44%` branches
- the shipped Vitest lane is now above `60%` branches, `ListingListPage.tsx` is effectively closed, and the remaining ROI is increasingly split between residual editor-edge flattening and the broader low-line admin backlog

Current snapshot after the latest forms and themes follow-up on `2026-03-14`:
- `% Stmts`: `69.10`
- `% Branch`: `60.17`
- `% Funcs`: `72.60`
- `% Lines`: `72.26`
- `460` Vitest files / `1708` tests
- `core/admin/ui/forms/FormCanvas.tsx` -> `100.00%` lines / `94.64%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `78.83%` lines / `76.92%` branches
- `core/admin/ui/listings/ListingListPage.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/pages/PageEditor.tsx` -> `95.45%` lines / `82.51%` branches
- the next best ROI now tilts more clearly toward `TASK-105-04` booking/theme residue and broader low-line admin backlog, because several former medium-coverage editor/forms/listings surfaces are now effectively closed
