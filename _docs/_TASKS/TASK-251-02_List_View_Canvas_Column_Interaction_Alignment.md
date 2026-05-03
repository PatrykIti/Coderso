# TASK-251-02: List View Canvas Column Interaction Alignment
# FileName: TASK-251-02_List_View_Canvas_Column_Interaction_Alignment.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + List View
**Estimated Effort:** Medium
**Dependencies:** TASK-248-02, TASK-249-02-02, TASK-251
**Status:** To Do

---

## Overview

Bring `List View` canvas interaction closer to how users already read the
table. The current builder still treats column movement as a secondary card list
below the table, which is slower and visually disconnected from the real table
surface.

Selection and ordering should happen directly in the header cell where the
column lives. The existing right-panel inspector remains the owner of deeper
column edits such as label, formatter, and visibility. Hidden or non-visible
columns must remain reachable from a secondary compact tray or outline; only
the per-item reorder arrows move into the header.

## Sub-Tasks

- [ ] TASK-251-02-01: Inline Table-Header Column Reordering

## Files to Change

- `core/admin/ui/custom-screens/ListViewCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/ListViewColumnInspector.tsx` if the selected
  column affordance copy changes
- existing `tests/vitest/ui/custom-screens-page.test.tsx` only as optional
  render smoke

## New Files to Create

- `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`

## Product Contract

1. Clicking a header still selects the column and keeps the inspector pointed at
   that column.
2. Small left/right controls in the header move the column without forcing the
   user to interact with a second card list below the table.
3. The old lower reorder strip is replaced, not deleted blindly:
   - visible columns own reorder controls in the header,
   - hidden/non-visible columns stay reachable in a secondary compact list
     without reorder arrows so users can reselect or re-enable them.
4. Column label/formatter/visibility edits remain in the existing inspector, not
   inline inside the header.

## Implementation Pseudocode

```tsx
<TableHead key={column.id} className="px-4 py-3">
  <div
    data-selected-column={selectedColumnId === column.id ? "true" : "false"}
    className={cn(
      "flex items-center gap-2 rounded-md px-2 py-1",
      selectedColumnId === column.id
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted"
    )}
  >
    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectColumn(column.id)}>
      <span>{column.label}</span>
      <span className="ml-2 text-[10px] normal-case">{column.formatter}</span>
    </button>
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => onMoveColumn(column.id, "left")}
        disabled={index === 0}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => onMoveColumn(column.id, "right")}
        disabled={index === resolvedColumns.length - 1}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
</TableHead>
```

```tsx
const visibleColumnIds = resolvedColumns.map((column) => column.id);
const hiddenColumns = listView.columns.filter(
  (column) => !visibleColumnIds.includes(column.id)
);

{hiddenColumns.length > 0 ? (
  <HiddenColumnsTray
    title="Hidden columns"
    columns={hiddenColumns}
    onSelectColumn={(columnId) => onSelectColumn(columnId)}
  />
) : null}
```

Replace the old lower `listView.columns.map(...)` reorder strip with a compact
all-columns / hidden-columns affordance. Do not leave hidden columns
unreachable after `visible=false`. Reordering must operate against the visible
header order, then translate that move back into `definition.listView.columns`
without letting hidden columns corrupt the left/right semantics for users.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged `content:write` for screen-definition saves only.
- CSRF: no new write path; existing save remains CSRF-backed.
- Rate-limit bucket: unchanged `admin_write` for save.
- Reject-unknown validation: no payload schema change; ordering still persists
  through the existing `definition.listView.columns` contract.
- Anti-abuse: no public route is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- The mounted list-canvas owner for this area is introduced by
  `TASK-251-02-01`, then rerun here during the final area validation pass.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- mounted list-canvas coverage asserting:
  - header click selects the column,
  - left/right controls reorder columns,
  - hidden columns positioned between visible columns do not break visible
    left/right movement,
  - hidden columns still appear in the secondary compact tray after
    `visible=false`,
  - the old lower reorder arrows are gone,
  - selected-column inspector still tracks the active column after reordering.
- `tests/vitest/ui/custom-screens-page.test.tsx` may remain as a secondary
  render-only smoke test, but it is not the mounted owner for header click or
  reorder interactions.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Users can reorder columns from the table header itself.
2. Hidden columns remain reachable after they are made non-visible.
3. Inspector-driven column editing still works after reordering.
