# TASK-194: Pages Admin UX Reliability and Polish
# FileName: TASK-194_Pages_Admin_UX_Reliability_and_Polish.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Accessibility + UX
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-052, TASK-053, TASK-061, TASK-191
**Status:** Done (2026-04-22)

---

## Overview

Address the Pages admin defects and UX gaps found in the dedicated UX/QA report
for the `Pages` surface. This family is not a redesign of Pages as a product
surface. It is a polish and correctness wave that makes already-shipped flows
reliable, understandable, and accessible.

The report found the following issues that must be tracked explicitly in this
umbrella:

### Bugs

- Critical: `Select all pages` marks only the header checkbox; row checkboxes do
  not become selected and no bulk-action toolbar appears.
- Medium: newly created pages can show `N Unknown` in the Author column instead
  of the logged-in user.
- Medium: `Loading template options...` can stay visible indefinitely in Page
  Settings even though the template select is already usable.
- Medium: widget-card action buttons in the page builder toolbar have no
  `aria-label`, `title`, or tooltip.
- Low: Radix `DialogContent` / `SheetContent` warnings fire because Pages
  dialogs and drawers do not provide descriptions consistently.

### UX gaps

- No visible success feedback after `Save draft` or `Publish`.
- The canvas does not scroll to a newly inserted widget when it lands below the
  current fold.
- `Create Page` stays disabled without explaining what input is required.
- The widget picker is a flat list without category grouping.
- Runtime preview failure is not actionable when the frontend host is not
  reachable.
- Wizard completion is unclear: `Complete setup` jumps into another
  configuration mode without explaining the transition.
- Empty slots such as `Hero Content` do not explain what can be inserted or how.
- Page Settings footer copy uses `autosave snapshot` jargon instead of
  user-facing wording.
- The disabled `Max width` control does not explain why it is unavailable when
  `Page width = full`.

This task family must preserve the behaviors that the same report called out as
already good: instant slug generation, live canvas preview, unsaved-change
guard, page history, filters/search, row action menu behavior, and runtime
preview in a working environment.

## Sub-Tasks

- `TASK-194-01_Page_List_Bulk_Actions_and_Author_Consistency.md`
- `TASK-194-02_Page_Settings_and_Create_Flow_Clarity.md`
- `TASK-194-03_Page_Editor_Feedback_and_Runtime_Preview_Recovery.md`
- `TASK-194-04_Builder_Accessibility_and_Widget_Discoverability.md`
- `TASK-194-05_QA_Docs_and_Closure.md`

## Scope

This umbrella covers four owner areas:

1. Page list correctness:
   - controlled selection state,
   - visible-scope bulk actions,
   - create/open-after-create cache correctness for authors,
   - truthful missing-author fallback only when the server payload really has no
     owner.
2. Page settings/create clarity:
   - template-options loading lifecycle,
   - create-form validation affordances,
   - autosave wording cleanup,
   - create/settings/history accessibility descriptions on the existing Pages
     sheet surfaces,
   - dependent-field helper copy for disabled controls.
3. Page editor feedback and preview recovery:
   - success confirmations,
    - actionable runtime preview failure states,
   - runtime preview dialog accessibility description on the existing preview
     dialog surface,
    - visible failure feedback,
    - scroll/focus/highlight after insertion.
4. Builder accessibility and discoverability:
   - labeled action buttons,
   - clearer wizard-to-visual handoff,
   - slot helper CTA wired to the existing insert surface,
   - category groups in the widget picker.

Out of scope:

- new public Pages endpoints,
- a new bulk backend endpoint if the current per-item actions can satisfy the
  UX with acceptable partial-failure handling,
- changes to page domain data model, revisions model, or preview token
  semantics beyond UX clarity,
- a new widget taxonomy or pack DSL beyond the existing `WidgetCategory`
  metadata.

## Architecture

Current owner seams in code:

- Page list shell and cache:
  - `core/admin/ui/pages/PageListPage.tsx`
  - `core/admin/ui/pages/PageTable.tsx`
  - `core/admin/services/pagesClient.ts`
- Page settings/create flows:
  - `core/admin/ui/pages/PageCreateDrawer.tsx`
  - `core/admin/ui/pages/PageSettingsDrawer.tsx`
  - `core/admin/ui/pages/PageEditor.tsx`
  - `core/admin/ui/pages/PageRevisionDrawer.tsx`
  - `core/admin/components/ui/sheet.tsx`
- Runtime preview:
  - `core/admin/ui/preview/RuntimePreviewDialog.tsx`
  - `core/admin/components/ui/dialog.tsx`
  - `core/admin/components/ui/sonner.tsx`
  - `core/server/utils/previewUrls.ts` only if preview URL messaging needs host
    metadata beyond what the client already has
- Page builder guidance/a11y:
  - `core/admin/ui/pages/builder/BlockToolbar.tsx`
  - `core/admin/ui/pages/builder/BlockList.tsx`
  - `core/admin/ui/pages/builder/BlockSettings.tsx`
  - `core/admin/ui/pages/builder/LibraryPanel.tsx`
  - `core/admin/ui/pages/builder/WizardPanel.tsx`
  - `core/admin/ui/pages/builder/WidgetPicker.tsx`
  - `core/widgets/types.ts`

Reuse-first rule:

- mirror bulk-selection UX from Entries instead of inventing a Pages-only
  pattern,
- reuse existing `WidgetCategory` metadata instead of adding a second grouping
  source,
- reuse existing widget-library category labels and slot constraints instead of
  creating Pages-only copies,
- reuse the existing Pages builder insert surface
  (`LibraryPanel.tsx` + `WidgetPicker.tsx`, including the current mobile sheet
  path in `PageEditor.tsx`) before considering any dialog-based flow,
- if slot-aware filtering needs shared logic, extract or reuse a small pure
  helper from existing widget-library utilities instead of cloning compatibility
  checks into Pages,
- reuse existing `sonner` component if toast feedback is chosen,
- keep accessibility fixes on the truthful surface owner first
  (`PageCreateDrawer`, `PageSettingsDrawer`, `PageRevisionDrawer`,
  `RuntimePreviewDialog`) instead of generating generic fallback copy in shared
  wrappers unless a real shared contract is proven,
- keep route/service contracts stable unless a client-only fix cannot preserve
  correctness.

Owner-responsibility rule:

- `PageCreateDrawer`, `PageSettingsDrawer`, and `PageRevisionDrawer` own their
  truthful `SheetDescription` copy; do not hide missing-description fixes in a
  shared wrapper unless repeated repo evidence proves the wrapper contract is
  incomplete,
- `PageEditor.tsx` owns save/publish outcome handling and emits feedback through
  an existing surface,
- `PageEditor.tsx` + `LibraryPanel.tsx` + `WidgetPicker.tsx` are the owner path
  for Pages slot-insert CTA behavior; do not re-route that fix through an
  unrelated widget-library dialog without first proving the current builder
  surface cannot satisfy the contract,
- `AdminApp.tsx` may own a single shared `Toaster` mount only if the repo
  really lacks one; do not introduce duplicate Pages-only notification mounts,
- `RuntimePreviewDialog.tsx` owns runtime-preview failure copy and
  `DialogDescription`,
- `TASK-194-05` must close the loop back to `_docs/PLAYWRIGHT/SUMMARY-PAGES.md`
  so the source QA report reflects the final verification state.

## Security Contract

- Visibility: internal admin Pages UI plus existing public read-only preview
  runtime.
- Internal admin endpoints remain `/admin/api/pages*`.
- Auth model: authenticated admin session / admin API key where supported by the
  shared admin stack.
- RBAC: unchanged.
  - `content:read` for list/detail/template-options/preview/revisions.
  - `content:write` for create/update/autosave/duplicate/delete.
  - `content:publish` for publish/unpublish.
- CSRF: unchanged for mutating endpoints.
- Rate-limit buckets: unchanged (`admin_read`, `admin_write`, `public_read`).
- Reject-unknown validation: unchanged; this family does not loosen any payload
  schema.
- Anti-abuse:
  - no new public write path,
  - bulk pages behavior must reuse existing per-item permission-protected
    actions unless a dedicated bulk route is explicitly justified later,
  - preview failure messaging must not leak secrets or internal URLs beyond the
    already-issued preview target,
  - accessibility fixes must not mute or suppress real Radix warnings instead of
    satisfying the description contract.

## Implementation Order

1. Fix page-list selection/bulk mechanics and author/cache correctness first
   because the report contains a critical blocker there.
2. Clean up settings/create microcopy and template loading semantics.
3. Add page-editor success/failure feedback and post-insert viewport behavior.
4. Close builder accessibility/discoverability gaps.
5. Run targeted Vitest/Bun validation, update docs, changelog, and board.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list-cache-behavior.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx`
  - keep author/cache regression proof on `tests/vitest/admin/pagesClient.test.ts`
    because `pagesClient.ts` owns mutation-driven list/detail cache writes; UI
    suites only confirm the symptom is gone,
  - keep the Pages settings-description proof on a real `Sheet` owner path such
    as `tests/vitest/ui/page-settings-drawer.test.tsx`; mocked
    `page-settings-drawer-wave.test.tsx` can cover behavior and copy changes,
    but it is not sufficient proof that Radix warning regressions are gone,
  - keep builder guidance proof on real owner paths:
    `tests/vitest/pageBuilder/wizardPanel.test.tsx` for wizard-copy changes and
    `tests/vitest/pageBuilder/blockSettings.test.tsx` for slot guidance;
    mocked `blockSettings-wave.test.tsx` can cover mode orchestration, but it
    is not sufficient as the sole owner proof,
  - if editor feedback chooses a root-mounted `Toaster`, add a real `AdminApp`
    render proof instead of treating a mocked `PageEditor` shell as sufficient,
  - post-insert scroll/highlight and slot-CTA work must be proven on at least
    one unmocked Pages builder path, not only through globally mocked shell
    suites.
- Bun only when a leaf touches server/service contract:
  - `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts tests/unit/pages`
  - keep `tests/integration/routes/pages.test.ts` as the route-contract guard
    for author assignment if the author fix widens any payload
  - add `tests/unit/pages/previewService.test.ts` only if preview host
    derivation or server-side preview messaging changes

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` only if list cache semantics change materially
- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-194 closes

## Acceptance Criteria

1. Pages list bulk selection behaves on visible filtered rows and exposes a
   usable bulk-action toolbar.
2. Pages created via the current admin flows do not sit in the list as
   `Unknown` because of stale partial cache state.
3. Page settings/create/editor flows stop presenting misleading loading,
   disabled, dialog-accessibility, or success/failure states.
4. Builder action buttons, slot guidance, and widget discovery are accessible
   and beginner-readable.
5. Existing good Pages behaviors from the QA report remain intact.
6. The final closure updates `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` with the
   landed verification state for the tracked `BUG-*` and `UX-*` items.

## Completion Notes (2026-04-22)

- Completed all `TASK-194` leaves across Pages list, settings/create, editor
  feedback/runtime preview, and builder discoverability.
- Kept the fixes on existing owner seams:
  `pagesClient`, `PageListPage`, `PageTable`, `PageCreateDrawer`,
  `PageSettingsDrawer`, `PageRevisionDrawer`, `PageEditor`,
  `RuntimePreviewDialog`, `BlockToolbar`, `BlockList`, `BlockSettings`,
  `LibraryPanel`, and `WidgetPicker`.
- No new backend endpoint family was introduced.
- Pages runtime preview feedback stayed on the existing dialog surface and
  Pages builder slot insertion stayed on the existing widget library surface.

## Validation (2026-04-22)

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list-cache-behavior.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder/blockToolbar.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx`
