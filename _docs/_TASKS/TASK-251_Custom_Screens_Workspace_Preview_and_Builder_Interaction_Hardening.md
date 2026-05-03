# TASK-251: Custom Screens Workspace Preview and Builder Interaction Hardening
# FileName: TASK-251_Custom_Screens_Workspace_Preview_and_Builder_Interaction_Hardening.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-248, TASK-250
**Status:** To Do

---

## Overview

The current Custom Screens builder is already live in code through the V2/V3
workspace work plus the delivered screen-widget parity implementation from
commit `0211cc97`. A residual builder-UX pass is still needed before the
surface feels as deliberate as Pages.

This family covers only four confirmed follow-ups from the current branch:

1. `List View` and `Editor View` preview dialogs feel materially smaller than
   the Pages preview surface.
2. `List View` still reorders columns through separate cards below the table
   instead of small inline header controls.
3. `Editor View` builder preview still renders schema-generated sample values
   instead of the first real record for the selected content type.
4. The Data tab still exposes generic `Binding N` cards and incomplete widget
   prop-path coverage for some screen widgets.

This is a residual hardening family, not a reopen of the broader `TASK-250`
screen-widget program. The implementation must preserve the current Custom
Screens route, widget system, entry-editor contract, and existing admin cache
primitives.

## Current Repo Findings

- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx` clamps
  the dialog to `max-w-[1200px]` and then applies an inner width clamp for
  editor devices, so the effective preview surface is still noticeably smaller
  than Pages.
- `core/admin/ui/custom-screens/ListViewCanvas.tsx` still renders a second grid
  of column cards with arrow buttons below the table and uses the table header
  only for column selection.
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` builds preview data
  through `buildEditorPreviewData(selectedContentType)`, which synthesizes
  values from schema field types instead of reusing current records.
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` already proves the
  repo-native records source plus the shared cache contract: render from cache
  first, fetch in foreground on cache miss, and use `force: true` only on
  explicit refresh or cache-bus driven revalidation.
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx` mixes a local
  hard-coded `preferredBindingPropPaths` map with `collectBindingPropPaths` and
  labels bound rows as `Binding 1`, `Binding 2`, etc. The bindable-prop
  contract is not owned by the widgets themselves.
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` still preserves
  legacy blocks through fallback widget resolution, so task work must not strand
  existing bindings on already-saved non-screen widgets that remain editable on
  the current canvas.

## Required Product Behavior

1. `List View` and `Editor View` preview dialogs should use a spacious desktop
   shell comparable to Pages, with enough room for the actual preview content
   before device-specific clamps are applied.
2. `List View` column selection and left/right reordering should happen
   directly in the table header row for visible columns. The old lower
   reorder-card strip should be replaced by a compact all-columns /
   hidden-columns affordance so `visible=false` columns remain reachable for
   reselection and re-enable flows.
3. `Editor View` builder canvas and preview dialog should hydrate from the
   first available record of the selected content type, using cached entries
   first and background refresh second. When no record exists, the fallback
   must be explicit, and changing or clearing `contentTypeId` must immediately
   drop the previous preview owner.
4. The Data tab should become prop-centric:
   - expose the full bindable prop list for widgets whose contract is
     explicitly `selected-entry`,
   - label cards by prop path / prop label rather than by ordinal position,
   - preserve existing custom prop paths that are already persisted,
   - preserve manual binding editability for already-saved legacy blocks that
     still survive through the current fallback registry path, even when they do
     not declare widget-owned binding targets,
   - keep widget settings and binding-panel suggestions driven from one shared
     widget-owned contract,
   - keep `screen-field-group` and `screen-two-column` on their current
     `selected-content-type` read-only layout contract unless that contract is
     explicitly changed in the same slice.
5. The work must stay inside the current internal admin API contract. No new
   public endpoint or weaker validation path is allowed.

## Sub-Tasks

- [ ] TASK-251-01: Workspace Preview Parity and Record-Backed Editor Preview
- [ ] TASK-251-01-02: First-Record Preview Data for Editor View Canvas
- [ ] TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
- [ ] TASK-251-02: List View Canvas Column Interaction Alignment
- [ ] TASK-251-02-01: Inline Table-Header Column Reordering
- [ ] TASK-251-03: Binding Panel Prop Coverage and Prop-Centric Cards
- [ ] TASK-251-03-01: Widget-Owned Bindable Prop Targets and Data-Tab Cards
- [ ] TASK-251-04: QA, Docs, and Closure

## Non-Goals

- No reopen of the broader `TASK-250` screen-widget mode-parity scope.
- No new Custom Screens public endpoint or route family.
- No redesign of Custom Screen filters, bulk actions, or entry save flows
  outside the confirmed seams above.
- No downgrade to synthetic-only preview data when real content exists.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API.
- RBAC:
  - preview/list/editor reads continue to require `content:read`,
  - screen-definition writes continue to require `content:write`.
- CSRF:
  - no new write route is introduced,
  - all existing writes remain CSRF-backed through current admin clients.
- Rate-limit bucket:
  - existing admin read buckets for preview/read hydration,
  - existing `admin_write` for screen-definition saves.
- Reject-unknown validation:
  - if widget binding-target metadata is added, it must remain part of the
    shared widget contract and must not weaken widget schema validation,
  - no new preview payload may bypass current entry/client normalization.
- Anti-abuse:
  - no public write flow,
  - no nonce/signature/HMAC/reCAPTCHA changes.

## Implementation Order

1. Align widget-owned bindable prop metadata before changing Data-tab rendering
   so the prop list has one source of truth.
2. Move `List View` column reordering into the table header while preserving a
   compact hidden-columns affordance for non-visible columns. This track is
   independent from the binding-metadata work and does not need to wait on the
   preview-data slice.
3. Add cached-first first-record preview hydration for `Editor View` builder
   canvas and preview dialog, with keyed owner reset when the content type
   changes or clears, while staying aligned with the shared entries cache
   contract instead of inventing a preview-only mount refresh loop.
4. Resize the workspace preview dialog around the real preview surfaces after
   the new preview data model is in place.
5. Close targeted tests, docs, board, and changelog updates.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Post-implementation targeted Vitest for this family, including the new suites
  introduced by `TASK-251-01-02`, `TASK-251-02-01`, and `TASK-251-03-01`:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-preview-data.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenLayoutEditors.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
  - treat `custom-screen-preview-owner`, `custom-screen-preview-data`,
    `custom-screen-list-view-canvas`, and `widgetRegistryBindingTargets` as
    implementation-deliverable suites until the owning leaves create them in
    the branch
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  and `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-route-params.test.ts`
  only if builder-route prefetch ownership changes from the current
  `/advanced/custom-screens/:screenId/entries...` matcher contract
- `bun test tests/unit/widgets/registry.test.ts` and
  `bun test tests/unit/widgets/runtimeRegistry.test.ts` as comparison smoke if
  `TASK-251-03-01` changes widget-registry normalization or introduces a new
  Vitest owner for binding-target metadata
- `tests/vitest/ui/custom-screens-page.test.tsx` may remain as a render-only
  smoke test, but it is not the mounted owner for async preview or header
  interaction contracts.
- Ownership split for existing integration suites:
  - `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` owns the
    screen-only picker surface plus legacy-widget preservation expectations,
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
    currently owns `Data` tab jump/focus flow from widget settings into
    `FieldBindingPanel`; if this family extends proof to the page-level
    selected-widget handoff in `CustomScreenEditorPage`, extend this suite or
    add adjacent mounted coverage in the same slice.
- Reuse existing cached-entry contracts wherever possible. If the
  implementation adds new entry-preview helpers or cached read-model helpers,
  add focused Vitest coverage in `tests/vitest/admin/entriesClient.test.ts` or
  a new pure helper suite.
- If `CustomScreenPreview.tsx` becomes the owner of fallback/source messaging,
  rerun `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx`
  so the bound screen-widget render bridge stays covered.
- If `screen-two-column` render/normalization keys move while binding-target
  metadata is being threaded through the same family, rerun
  `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx`
  in addition to the binding-focused suites.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
- `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
- `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Workspace preview dialogs no longer feel materially smaller than the Pages
   preview surface for the same viewport.
2. `List View` header cells own column selection and left/right movement
   without losing access to hidden columns.
3. `Editor View` preview shows a real first record when one exists and clearly
   falls back when none exists, while dropping stale preview ownership after a
   content-type change.
4. The Data tab exposes full bindable prop coverage for the selected widget and
   labels binding cards by prop instead of by ordinal position, without
   promoting layout-only widgets into the selected-entry binding contract by
   accident.
