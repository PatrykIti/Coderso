# TASK-213: Widget Library Playwright QA Follow-ups
# FileName: TASK-213_Widget_Library_Playwright_QA_Followups.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Widget Editors + Templates
**Estimated Effort:** Very Large
**Dependencies:** TASK-049, TASK-054-25, TASK-054-26, TASK-127, TASK-208, TASK-211
**Status:** To Do

---

## Overview

Close the Widget Library findings from `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`.

The Playwright report covers two surfaces that must stay aligned:

- `/admin/coderso/widgets` as the discovery, favorites, templates, filters, and
  insert-routing surface.
- Page/template widget configuration through the shared
  `Wizard -> Visual -> Advanced` inspector model.

The business goal is a beginner-friendly widget workflow where editors can add,
configure, favorite, and reuse widgets without silent outcomes, crashes,
ambiguous controls, or developer-only copy. The technical goal is to repair the
current gaps through existing widget contracts, shared admin UI primitives,
cached clients, schema-owned normalizers, and the Vitest/Bun lane split already
documented in `_docs/TESTING_STRATEGY.md`.

This family must not introduce a second widget renderer, a second widget
registry, a second toast host, or ad hoc route-side widget logic. All widget
payload changes stay schema-first in `core/widgets/core/*`; all admin UI changes
stay in the existing Widget Library/editor seams.

## Current Repo Findings

- `core/admin/ui/widgets/WidgetLibraryPage.tsx` owns the library rail, filters,
  view toggle, favorites state, insert orchestration, category drawer, and
  template navigation.
- `core/admin/ui/widgets/WidgetCard.tsx` renders the favorite button without a
  dynamic `aria-label`/tooltip and exposes both card select and an `Insert`
  action, which contributes to the duplicated entry-point confusion.
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx` owns the
  `Recommended/All widgets`, `Advanced mode`, module, and complexity controls;
  tab counts are currently global core counts instead of category-aware counts.
- `core/admin/ui/widgets/widgetLibraryUtils.ts` still renders
  `Needs coverage`, which is pack-contract language leaking into editor UX.
- `core/admin/ui/widgets/WidgetInsertDialog.tsx` performs successful page or
  template mutation, then closes without success feedback or a deep link to the
  target editor.
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` creates/updates
  templates and navigates after create, but does not emit the shared action
  toast feedback required by the Admin UI pattern.
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx` uses inline edit and
  inline delete states that visually replace the category row, matching the QA
  confusion report.
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` renders
  `<SelectItem value="">`, which Radix rejects and which the report proves can
  crash the editor.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` and
  `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` own listing-query loading
  states and need a completed-empty state instead of an indefinite loading
  impression.
- Code review confirms `ListingFiltersEditors.tsx` and `SearchBoxEditors.tsx`
  already use the shared Radix Select primitives in the current checkout. The
  `GLOBAL-2` native-select finding should therefore be closed as
  current-state-verified for those two widgets during `TASK-213-07`, while
  `BUG-10` remains owned by `TASK-213-01-02`.
- Repeatable widget editors already own deterministic count helpers locally, but
  several wizard surfaces expose only a partial subset of the rows controlled by
  the count selector.
- Product widget editors still use native `<select>` controls in shared
  commerce source fields and gallery layout fields while most widget wizards use
  the shared Radix Select contract.
- Posts Feed currently has a Bun-owned widget contract suite at
  `tests/unit/widgets/postsFeedWidget.test.tsx`; keep that current command
  surface green unless the pure widget contract is deliberately migrated to a
  Vitest-owned suite.

## Required Product Behavior

1. Widget configuration never crashes the whole editor:
   - Form Embed must be safe with zero forms and with internal/public forms.
   - Listing-query-backed widgets must move from loading to a truthful empty,
     ready, or error state.
2. Insert and template save outcomes are visible:
   - successful insert shows a shared Admin UI toast with the target page or
     template name and an editor link;
   - failed insert shows bounded error copy and does not claim success;
   - template create/update shows shared success/error feedback.
3. Widget Library controls are accessible and unambiguous:
   - favorite buttons and view toggles have labels, pressed state, and feedback;
   - advanced filters explain what they unlock;
   - module readiness copy is user-facing while preserving pack status data.
   - the rail/filter hierarchy has one clear owner for Favorites, categories,
     recommended/all state, module, and complexity filters.
4. Widget wizard fields are deterministic:
   - visible repeatable rows match the count selectors or the selector is scoped
     to the exposed quick-setup rows;
   - paired inputs each have a visible label or accessible name;
   - beginner copy explains technical fields such as `flowKey` and links-source
     modes.
5. Template cleanup is possible from the list:
   - `New Template` is a clear primary CTA in the Templates tab;
   - templates can be edited, duplicated, selected in bulk, and deleted from the
     list surface without opening every editor;
   - destructive actions use shared confirmation primitives and shared toasts;
   - duplicate/template-name collisions are rejected or resolved explicitly.
6. Source-report closure is precise:
   - `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md` records fixed, open, and deferred
     findings with concrete validation evidence;
   - task board, docs, changelog, and test evidence agree.

## Sub-Tasks

- `TASK-213-01_Widget_Editor_Stability_and_Data_Loading.md`
- `TASK-213-02_Widget_Insert_Flow_and_User_Feedback.md`
- `TASK-213-03_Widget_Library_A11y_and_Filter_IA.md`
- `TASK-213-04_Widget_Template_Lifecycle_and_Category_Management.md`
- `TASK-213-05_Widget_Wizard_Consistency_and_Repeatable_Fields.md`
- `TASK-213-06_Widget_Editor_Control_Unification_and_Picker_Upgrades.md`
- `TASK-213-07_QA_Docs_and_Widget_Source_Report_Closure.md`

## Leaf Breakdown

- `TASK-213-01-01_Form_Embed_Select_Sentinel_and_Crash_Regression.md`
- `TASK-213-01-02_Listing_Query_Empty_State_for_Filter_Widgets.md`
- `TASK-213-02-01_Insert_Widget_Toasts_and_Editor_Deep_Links.md`
- `TASK-213-02-02_Widget_Card_Drawer_Entry_Point_Consolidation.md`
- `TASK-213-03-01_Favorites_and_View_Toggle_A11y_Feedback.md`
- `TASK-213-03-02_Advanced_Mode_Module_Readiness_and_Tab_Counts.md`
- `TASK-213-03-03_Widget_Filter_Hierarchy_and_Favorites_Rail_Simplification.md`
- `TASK-213-04-01_Template_Save_Toasts_Row_Actions_and_Name_Guards.md`
- `TASK-213-04-02_Template_Category_Inline_Mode_Visual_Contract.md`
- `TASK-213-05-01_Repeatable_Count_Field_Sync_Matrix.md`
- `TASK-213-05-02_Paired_Input_Labels_and_Beginner_Helper_Text.md`
- `TASK-213-06-01_Commerce_Product_Radix_Select_and_Collection_Picker.md`
- `TASK-213-06-02_Content_Media_and_Rich_Text_Quick_Setup_Upgrades.md`
- `TASK-213-07-01_Widget_Playwright_and_Vitest_Regression_Matrix.md`
- `TASK-213-07-02_Widgets_Docs_Changelog_and_Board_Closure.md`

## Files to Change (High-Level)

- Widget Library shell:
  - `core/admin/ui/widgets/WidgetLibraryPage.tsx`
  - `core/admin/ui/widgets/WidgetCard.tsx`
  - `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
  - `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
  - `core/admin/ui/widgets/WidgetInsertDialog.tsx`
  - `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
  - `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- Widget editor owners:
  - `core/admin/ui/widgets/editors/*Editors.tsx` for the widgets named in the
    leaf tasks
  - `core/widgets/core/*` only when schema/default/normalizer contracts change
- Clients/services/routes:
  - `core/admin/services/widgetTemplatesClient.ts`
  - `core/admin/services/widgetTemplateCategoriesClient.ts`
  - `core/services/widgets/*`
  - `core/server/routes/widgetTemplateRoutes.ts`
  - `core/server/routes/widgetTemplateCategoryRoutes.ts`
- Validation and docs:
  - targeted `tests/vitest/widgets/*`
  - targeted `tests/vitest/ui/*`
  - targeted `tests/vitest/admin/*`
  - Bun route suites when route contracts change
  - `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`, widget docs, cache/API docs,
    changelog, and this task board

## High-Level Implementation Sketch

```ts
for (const finding of summaryWidgetsFindings) {
  const owner = resolveTaskOwner(finding);
  const currentCodeState = inspectOwnerFiles(owner.files);

  if (currentCodeState.provesFindingIsStale) {
    recordSourceClosure(finding, "current-state verified", currentCodeState.refs);
    continue;
  }

  implementThroughExistingSeam(owner);
  addTargetedTests(owner.correctLane);
  recordManualReplay(owner.playwrightPath);
}

syncDocsChangelogAndBoard("TASK-213");
```

## Non-Goals

- Do not rebuild the Widget Library shell or create a parallel library surface.
- Do not create production-code fallbacks only to satisfy tests.
- Do not move Bun-owned runtime or DB-backed route behavior into Vitest.
- Do not expose secrets, API keys, submission nonces, or privileged settings in
  browser cache, debug payloads, raw widget JSON, or toast copy.
- Do not fake support by adding labels without schema/defaults/normalizers,
  runtime rendering, and test coverage.
- Do not remove the `Wizard -> Visual -> Advanced` split; the report confirms
  that split is the correct direction.

## Security Contract

- Visibility:
  - Widget Library and template editor stay internal admin surfaces.
  - Public runtime rendering changes are allowed only through schema-normalized
    widget payloads.
- Auth model:
  - Existing admin session/API-key path remains unchanged for pages, widget
    templates, categories, forms, listings, and settings reads/writes.
- RBAC:
  - `widgets:read` for catalog/template reads;
  - `widgets:write` for template/category mutations;
  - existing content/page write permission for page insert mutations;
  - existing listing/form read permissions for editor selectors.
- CSRF:
  - Admin writes must keep the existing client `withCsrf` behavior.
  - No public write endpoint is introduced by this family.
- Rate-limit bucket:
  - Existing admin read/write buckets remain in place.
  - Runtime widget public reads keep existing public read buckets.
- Reject-unknown validation:
  - Widget payload changes must update owner schemas and `normalize*` helpers in
    `core/widgets/core/*`.
  - Routes remain orchestration-only and must not duplicate widget contract
    defaults or enum parsing.
- Anti-abuse:
  - Toasts, errors, raw payload panels, and source-report notes must not expose
    stack traces, SQL, auth headers, nonce values, form submission tokens,
    provider secrets, or private media URLs.
  - Form Embed public submission behavior must keep the existing nonce/captcha
    and access-mode contract.
  - Delete/duplicate actions must re-check current resource identity before
    mutation and use shared confirmation UI for destructive flows.

## Implementation Order

1. Repair crash/data-loading blockers (`TASK-213-01`).
2. Repair insert/save feedback and entry-point ambiguity (`TASK-213-02`).
3. Fix accessible control semantics and filter hierarchy (`TASK-213-03`).
4. Add template list lifecycle cleanup and category visual clarity
   (`TASK-213-04`).
5. Normalize repeatable wizard rows and beginner helper copy (`TASK-213-05`).
6. Unify control components and richer pickers for commerce/media/rich-text
   quick setup (`TASK-213-06`).
7. Close with targeted lanes, Playwright replay, docs, changelog, and board
   sync (`TASK-213-07`).

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest widget/editor lanes:
  - `tests/vitest/widgets/formEmbed.test.tsx`
  - `tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - `tests/vitest/widgets/listingFilters.test.tsx`
  - `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - `tests/vitest/widgets/searchBox.test.tsx`
  - `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - `tests/vitest/widgets/statsKpi.test.tsx`
  - `tests/vitest/widgets/logoCloud.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/widgets/navigation.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
  - `tests/vitest/widgets/productGallery.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
  - `tests/vitest/widgets/richTextSection.test.tsx`
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
- Vitest UI/admin lanes:
  - `tests/vitest/ui/widget-library.test.tsx`
  - `tests/vitest/ui/widgetLibraryUtils.test.ts`
  - `tests/vitest/ui/widget-card.test.tsx`
  - `tests/vitest/ui/widget-template-editor.test.tsx`
  - `tests/vitest/ui/dialogs.test.tsx`
  - `tests/vitest/admin/widgetsClient.test.ts`
  - `tests/vitest/admin/widgetTemplatesClient.test.ts`
  - `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
  - shared action toast/admin toaster tests when toast helpers are touched.
- Bun route/service lanes are required if template/category/page insert route
  contracts change. Load env before DB-backed tests:
  `set -a && source .env && set +a`.
- For any changed widget-template/category route family, include route
  registration assertions and `mapWidgetTemplateError` /
  category-error mapping coverage in addition to service/domain tests.
- Manual Playwright replay:
  - Form Embed can be opened repeatedly without a blank page;
  - Listing Filters/Search Box finish loading into empty/ready/error copy;
  - insert/template save toasts are visible and accessible;
  - favorites/view toggle/advanced controls expose labels and states;
  - rail/filter hierarchy does not show duplicate Favorites signals;
  - template row delete/duplicate and category inline states are understandable;
  - count-driven widgets show deterministic quick-setup rows.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md` if module readiness wording or pack matrix
  semantics change
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys,
  invalidation, or cached client behavior changes
- `_docs/CMS_API.md` if widget/template/category API payloads change
- `docs/coderso/widget-library.md`
- `docs/coderso/widget-template-editor.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. All critical and medium findings from `SUMMARY-WIDGETS.md` are either fixed
   or explicitly deferred with owner, reason, and follow-up task id.
2. Widget Library insert/template mutations produce visible shared Admin UI
   success and error feedback.
3. Form Embed, Listing Filters, and Search Box pass crash/loading regression
   coverage and manual replay.
4. Favorite, view toggle, advanced filter, module readiness, tab counts, and
   rail/filter hierarchy are accessible and no longer misleading.
5. Repeatable-count widgets expose deterministic quick-setup rows or clearly
   scope the count selector to the visible quick fields.
6. Docs, changelog, board statistics, and Playwright source report closure agree
   with the validated implementation.
