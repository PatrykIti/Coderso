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
  repo-native records source: `listEntriesCached(contentType.slug, { force })`
  plus cached-first/background-refresh semantics.
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx` mixes a local
  hard-coded `preferredBindingPropPaths` map with `collectBindingPropPaths` and
  labels bound rows as `Binding 1`, `Binding 2`, etc. The bindable-prop
  contract is not owned by the widgets themselves.

## Required Product Behavior

1. `List View` and `Editor View` preview dialogs should use a spacious desktop
   shell comparable to Pages, with enough room for the actual preview content
   before device-specific clamps are applied.
2. `List View` column selection and left/right reordering should happen
   directly in the table header row. The separate column-card reorder grid
   under the table should be removed.
3. `Editor View` builder canvas and preview dialog should hydrate from the
   first available record of the selected content type, using cached entries
   first and background refresh second. When no record exists, the fallback
   must be explicit.
4. The Data tab should become prop-centric:
   - expose the full bindable prop list for the selected widget,
   - label cards by prop path / prop label rather than by ordinal position,
   - preserve existing custom prop paths that are already persisted,
   - keep widget settings and binding-panel suggestions driven from one shared
     widget-owned contract.
5. The work must stay inside the current internal admin API contract. No new
   public endpoint or weaker validation path is allowed.

## Sub-Tasks

- [ ] TASK-251-01: Workspace Preview Parity and Record-Backed Editor Preview
- [ ] TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
- [ ] TASK-251-01-02: First-Record Preview Data for Editor View Canvas
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
2. Move `List View` column reordering into the table header and remove the
   redundant lower card grid.
3. Add cached-first first-record preview hydration for `Editor View` builder
   canvas and preview dialog.
4. Resize the workspace preview dialog around the real preview surfaces after
   the new preview data model is in place.
5. Close targeted tests, docs, board, and changelog updates.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
    if widget-owned binding metadata changes picker/editor composition
  - new or expanded mounted list-canvas suite for inline header reordering, for
    example `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- Reuse existing cached-entry contracts wherever possible. If the
  implementation adds new entry-preview helpers or cached read-model helpers,
  add focused Vitest coverage in `tests/vitest/admin/entriesClient.test.ts` or
  a new pure helper suite.
- `bun run gates:coderso` before closure if the final diff changes release-gated
  admin UX behavior beyond the targeted suites above.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md` if the builder preview/data-tab contract becomes
  source-of-truth there.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if preview-entry cache
  semantics or invalidation ownership changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Workspace preview dialogs no longer feel materially smaller than the Pages
   preview surface for the same viewport.
2. `List View` header cells own column selection and left/right movement
   without redundant reorder cards below the table.
3. `Editor View` preview shows a real first record when one exists and clearly
   falls back when none exists.
4. The Data tab exposes full bindable prop coverage for the selected widget and
   labels binding cards by prop instead of by ordinal position.
