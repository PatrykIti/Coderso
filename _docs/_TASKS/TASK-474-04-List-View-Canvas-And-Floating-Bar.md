# TASK-474-04: List View Canvas And Floating Bar
# FileName: TASK-474-04-List-View-Canvas-And-Floating-Bar.md

**Parent Task:** TASK-474
**Priority:** High
**Category:** Admin UI / Custom Screens / List View Editor
**Estimated Effort:** Large
**Dependencies:** TASK-474-01
**Status:** ⏳ To Do

---

## Overview

Convert the List View editor from a 3-pane builder into an interactive canvas
with a single floating bottom toolbar, matching the Editor View and the Pages
editor. The left ("List elements") and right (Screen / Selected Column) rails and
the mobile Sheets disappear; their controls move into floating-toolbar panels
scoped to list-view options. The records still present as a **table**; clicking
column headers selects/reorders on-canvas. (Inline editing of record *values* in
rows is the separate TASK-474-06.)

## Current State (summary)

- `CustomScreenEditorPage.tsx` renders the List View tab inside an
  `EditorShell` with rails: `leftPanel` = `ListViewElementLibrary` (`:645`),
  `rightPanel` = Tabs(Screen settings + `ListViewDesigner` `:756`, Selected
  Column = `ListViewColumnInspector` `:764`), wired as `leftPanel`/`rightPanel`
  (`:784-785`), plus mobile Sheets (`:919-940`).
- Center is `ListViewCanvas.tsx` (`:117-214`): a static `@/components/ui/table`
  with clickable header cells, left/right move buttons, hidden-columns tray.
- The Editor View tab already uses `ScreenAuthoringCanvas` (`:890`) with the
  floating pill toolbar — the asymmetry this subtask removes.
- `ListViewDesigner.tsx` is a pure form (sort/formatter/filters/bulk actions).
- `EditorViewDesigner.tsx` is **dead code** (referenced only by itself) — delete.

## Sub-Tasks

- [ ] For `activeBuilderTab === "list-view"`, wrap `ListViewCanvas` in
  `AuthoringCanvasFrame` (`borderless`) with an `AuthoringFloatingToolbar`.
- [ ] Add `activeListPanel` state; expose panels: **Elements**
  (`ListViewElementLibrary`), **Column** (`ListViewColumnInspector`), **List
  settings** (`ListViewDesigner` sort/filters/bulk only), **Hidden columns**.
- [ ] Remove the `EditorShell` `leftPanel`/`rightPanel` and the mobile
  library/details Sheets for list-view mode.
- [ ] Relocate screen metadata (name, content type, status, sidebar shortcut) out
  of the right rail into a **settings** affordance on the floating bar.
- [ ] Keep the sticky topbar (Preview / List|Editor toggle / Save) outside the
  frame; keep all existing column handlers wired.
- [ ] Delete `EditorViewDesigner.tsx` (dead code) and its import.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | List-view tab → `AuthoringCanvasFrame` + floating toolbar; remove rails/Sheets; relocate metadata; drop `EditorViewDesigner` import. |
| `core/admin/ui/custom-screens/ListViewCanvas.tsx` | Render inside the frame; on-canvas header select/reorder/visibility. |
| `core/admin/ui/custom-screens/ListViewElementLibrary.tsx` | Render as floating-panel content. |
| `core/admin/ui/custom-screens/ListViewColumnInspector.tsx` | Render as floating-panel content. |
| `core/admin/ui/custom-screens/ListViewDesigner.tsx` | Re-scope to list settings only (no screen-name/content-type/sidebar metadata). |
| `core/admin/ui/custom-screens/EditorViewDesigner.tsx` | **Delete** (dead code). |
| `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx` | Assert canvas + single floating bar, no rails/Sheets. |

## Implementation Pseudocode

```tsx
// CustomScreenEditorPage.tsx
const listPanels: AuthoringToolbarPanel[] = [
  { id: "elements", label: "Elements", icon: Plus, active: activeListPanel === "elements", onSelect: () => toggle("elements") },
  { id: "column",   label: "Column",   icon: Columns, active: activeListPanel === "column",   onSelect: () => toggle("column") },
  { id: "settings", label: "List settings", icon: SlidersHorizontal, active: activeListPanel === "settings", onSelect: () => toggle("settings") },
  { id: "hidden",   label: "Hidden columns", icon: EyeOff, active: activeListPanel === "hidden", onSelect: () => toggle("hidden") },
];

activeBuilderTab === "list-view" ? (
  <AuthoringCanvasFrame
    borderless
    toolbar={<AuthoringFloatingToolbar label="List view" panels={listPanels} />}
    floatingPanel={renderActiveListPanel(activeListPanel)}  // attached subpanel (474-01)
    onClearSelection={() => setSelectedListColumnId(null)}
  >
    <ListViewCanvas {...listViewCanvasProps} />
  </AuthoringCanvasFrame>
) : (
  <ScreenAuthoringCanvas {...editorViewProps} />
)
// EditorShell leftPanel/rightPanel + mobile Sheets removed for list-view mode.
```

Data flow:

- Column add/reorder/visibility/formatter/sort/filter/bulk continue through the
  existing handlers (`handleAddListColumn`, `handleMoveListColumn`,
  `handleChangeSelectedListColumn`, `handleRemoveSelectedListColumn`, and the
  `ListViewDesigner` `onChange`).
- `activeListPanel` selects which floating subpanel renders; selection state stays
  in the page component.

Error handling:

- No content-type → keep the existing "Select a content type" guard inside the
  panels (`ListViewDesigner`/`ListViewElementLibrary`).
- Removing rails must not drop the screen-metadata controls — relocate, not
  delete.

Regression-test shape:

```tsx
test("List View tab renders a canvas + one floating bar and no rails", () => {
  render(<CustomScreenEditorPage fixture={screenV4Fixture} />);
  expect(screen.queryByTestId("editor-shell-left-panel")).toBeNull();
  expect(screen.queryByTestId("editor-shell-right-panel")).toBeNull();
  expect(document.querySelectorAll('[data-authoring-floating-toolbar="true"]').length).toBe(1);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen routes — no new
  endpoint.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load; `content:write` to save the screen
  definition (list-view config).
- **CSRF expectations:** required for definition saves (unchanged).
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** list-view definition continues through the V4
  normalizer (`normalizeCustomScreenListViewDefinition`, `rejectUnknownKeys`).
- **Anti-abuse controls:** no public write path.
- **Secret handling:** screen metadata/relocation must not expose protected
  settings beyond the current admin session.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`
- Live `playwright-cli` on screen `House Projects`: List View shows canvas +
  floating bar, no rails.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (List View editor UX).

## Acceptance Criteria

1. The List View tab shows no `EditorShell` left/right rails and no mobile
   Components/Details Sheets.
2. A single floating bottom toolbar exposes only list-view options (Elements,
   Column, List settings, Hidden columns); the records render as a table.
3. Column add/reorder/visibility/formatter/sort/filter/bulk all still function;
   screen metadata is reachable from the floating bar.
4. `EditorViewDesigner.tsx` is deleted; vitest, lint, types, and admin-boundary
   gates are green.
