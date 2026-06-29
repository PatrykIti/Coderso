# TASK-479-14-L02: Entry-View Builder → Floating-Panel Canvas
# FileName: TASK-479-14-L02-Entry-View-Builder-Floating-Canvas.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06, TASK-479-14-L01
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-14
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Restyle the Custom Screen **editor** — specifically the **entry-view builder**:
the surface where an author composes the PER-SCREEN entry layout (sections/blocks
bound to fields) that is shown when someone opens a single entry. Port it to the
prototype's floating-panel `CanvasEditor`: a centered canvas of selectable
sections with a dockable inspector panel (block library + bound-field / layout /
spacing / background / visibility controls). This is a real authoring surface — it
persists the screen-specific definition (V4) and tracks dirty state — so only the
chrome, canvas framing, and panel presentation change.

The editor hosts two tabs: **List view** (the `ListViewDesigner` table designer)
and **Entry view** (the `ScreenAuthoringCanvas` entry-layout builder). This leaf
owns the **Entry view** builder restyle and the shared editor chrome (header,
List/Entry tab toggle, Save/Publish). The List View *runtime* table is L03; the
List View *designer* tab keeps its existing behavior and inherits the new tokens.

- **Goal:** `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (Entry-view
  tab) + `ScreenAuthoringCanvas.tsx` + `ScreenBlockInspector.tsx` +
  `ScreenBlockLibrary.tsx` read like
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx` — a
  `max-w-2xl` canvas of tagged, selectable sections (Header / Fields / Rich text /
  Related list) with `{{ field }}` binding tokens, an "Add section" dashed
  affordance, and a floating inspector panel (Add-block chip grid + Layout / Bound
  field / Spacing / Background swatches / Visible toggle) — while preserving the
  real definition normalization (`normalizeCustomScreenDefinitionForRead`),
  block/binding model, dirty-state, and cache wiring.
- **Owning module/service:**
  `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`,
  `ScreenAuthoringCanvas.tsx`, `ScreenBlockInspector.tsx`,
  `ScreenBlockLibrary.tsx`; the List-view tab `ListViewDesigner.tsx` +
  `ListViewCanvas.tsx` + `ListViewElementLibrary.tsx` inherit tokens only here.
  Data via `customScreensClient.ts` and the V4 normalizers in
  `core/services/customScreens/*`.
- **Source-of-truth docs:** prototype builder
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx` +
  `_docs/_PROTOTYPE/src/lib/screensMock.ts` (`EntrySection`/`EntryLayout` shape);
  the floating-panel pattern
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx` (and its `BlockChip`);
  Page Editor V2 vision (floating panel = sole control surface) in
  [[page-editor-v2-vision]]; tokens `_docs/_PROTOTYPE/src/styles/theme.css`;
  `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No change to the definition schema or V4 normalization
  behavior — including the still-open TASK-468 V4-only write-enforcement gap
  (normalization migrates V1/V3 on write); do NOT "fix"/alter it here (see
  [[task-468-completion-state]]). No change to which blocks/bindings exist, the
  publish operation, or the List-view runtime table (L03). The prototype is
  "Preview only" with mock data; the real builder stays fully functional — drop
  the "Preview only" badge and keep real handlers.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

`CustomScreenEditorPage` loads the screen definition through
`normalizeCustomScreenDefinitionForRead`, holds `hasUnsavedChanges` state, gates
on `resolveCustomScreenCapabilities`, and subscribes to `cacheKeys`. Keep all of
that; restyle the header, the List/Entry tab toggle, and the Entry-view builder
body.

```tsx
// 1) Editor header — port the prototype PageHeader:
//    breadcrumbs Screens -> {screen.name} via AdminBreadcrumbs/AdminLink (canonical),
//    description "Design the entry view — the layout shown when someone opens a
//    {singular}.", a List/Entry segmented toggle, and Save + primary "Publish"
//    (Rocket) buttons. Save/Publish keep their REAL handlers + the dirty/disabled
//    state derived from hasUnsavedChanges. The List/Entry toggle keeps the existing
//    tab state; only restyle to the rounded segmented control.

// 2) Entry-view builder body — wrap ScreenAuthoringCanvas in the CanvasEditor
//    floating-panel pattern. The shared `CanvasEditor` primitive (with its
//    `panelPosition` + show/hide toggle) is created/ported by TASK-479-06-L06 —
//    reuse it as-is here; do NOT fork a second copy. (06-L02 owns the static
//    pattern library — StatusBadge/PageHeader/etc. — NOT CanvasEditor.)
//      <CanvasEditor
//        title="Entry-view builder"
//        toolbar={<Badge variant="outline">Entry view</Badge>}
//        panelPosition="right"
//        canvas={<div className="mx-auto max-w-2xl">{sections.map(renderSection)}<AddSectionButton/></div>}
//        panel={<EntryViewInspector .../>}
//      />
//    renderSection(section) styles each definition section as a tagged, selectable
//    card (Header / Fields / Rich text / Related list) — the SELECTED block drives
//    the inspector. Bindings render as muted "{{ label }}" Token chips resolved
//    from the REAL definition columns/fields (NOT the prototype mock). Selection,
//    add/remove/reorder section, and field-binding edits dispatch the EXISTING
//    ScreenAuthoringCanvas actions; the restyle does not fork the model.

// 3) Inspector panel (ScreenBlockInspector + ScreenBlockLibrary) — port the
//    prototype panel layout:
//      - "Add block" BlockChip grid (Heading/Text/Field/Stat/Divider/Image/
//        Related list/Tabs/Button) -> wired to the REAL ScreenBlockLibrary insert.
//      - InspectorRow controls: Layout (1/2/3 col), Bound field (Select over the
//        REAL screen columns), Spacing, Background swatches, Visible Switch.
//      Every control stays bound to the selected block's real props/onChange;
//      only classNames change. Background swatches reuse the existing color
//      handling — do NOT introduce a new color model.

// 4) Floating-panel state: if CanvasEditor needs an open/pinned/position state,
//    reuse the editor's existing panel/selection state (or a reducer) as the single
//    source of truth — do NOT add a second open-state. Derive panel visibility at
//    render. Respect ESLint react-hooks (no sync setState in effects).

// 5) Persistence: Save/Publish serialize through the EXISTING write path
//    (customScreensClient definition update); the saved shape stays V4 via the
//    existing normalize-on-write. Do NOT change the serialized shape.
```

**Data flow:** `CustomScreenEditorPage` → `normalizeCustomScreenDefinitionForRead`
→ definition state → List-view tab (`ListViewDesigner`) | Entry-view tab
(`ScreenAuthoringCanvas` inside `CanvasEditor`) → block selection drives
`ScreenBlockInspector` → edits mutate the in-memory definition + set
`hasUnsavedChanges` → Save/Publish writes through `customScreensClient`. The
restyle touches only JSX/classNames in these render trees.

**Dirty-state (preserve):** Do not change when `hasUnsavedChanges` flips, the
unsaved-changes guard (`custom_screen_has_unsaved_changes` capability gate), or
the `subscribeCacheEvents` handler that refuses to clobber the canvas when
`hasUnsavedChanges` is true. The restyle must not remount the canvas (no key
churn) — keep component identities so React preserves selection + dirty state.

**Cache (preserve):** Keep the `event.key` guards for
`cacheKeys.customScreensList` and `cacheKeys.customScreenDetail(screenId)` and the
existing `refreshScreen` flow. No mount-force refetch.

**Navigation constraint (preserve):** Breadcrumbs, the "See a published screen"
link, and the List/Entry tab targets route through `AdminLink`/`adminPaths`/the
custom-screen route helpers. Do not hand-build hrefs while restyling.

**React-hooks rules:** No new sync `setState` in effects; derive section/inspector
view models at render; reuse existing selection/panel state.

**Error handling:** Keep the existing capability-denied / load-error / empty
branches and their copy; they inherit the new card/token styling. No new error
surfaces.

**Regression-test shape:** see L05 — render `CustomScreenEditorPage` on the
Entry-view tab with a seeded V4 definition; assert the `max-w-2xl` canvas renders
one selectable card per definition section with `{{ field }}` tokens from the real
columns, the floating inspector exposes the block library + Bound-field Select
(bound to real columns), Save/Publish are present, and that an edit flips
`hasUnsavedChanges` (behavioral guard that the restyle did not sever the model).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx`
  (new suite in L05)
- Existing editor/authoring suites MUST stay green (paths verified on disk —
  `editor-binding-flow` lives under `ui-integration`, `authoring-boundary` is a
  `.ts` file):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui/custom-screen-authoring-boundary.test.ts tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L02`.
- Record the floating-panel `CanvasEditor` adoption + the reused
  selection/panel-state contract in the editor/design notes so the Page editor
  (shared V2 floating-panel direction, [[page-editor-v2-vision]]) and
  [[task-474-custom-screen-canvas-parity]] stay consistent.
