# TASK-251-02-01: Inline Table-Header Column Reordering
# FileName: TASK-251-02-01_Inline_Table_Header_Column_Reordering.md

**Priority:** High
**Category:** Coderso Custom Screens + List View + Builder UX
**Estimated Effort:** Medium
**Dependencies:** TASK-251-02
**Status:** To Do

---

## Overview

Move the current column-order controls out of the lower card strip and into the
actual `List View` table header.

This leaf is intentionally narrow. It does not reopen filter, formatter, or
visible-column rules. It only changes where selection and order movement live
for visible columns, while preserving a secondary affordance for hidden columns
so they remain reachable.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/ListViewCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` only as optional
  render smoke
- `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`

## Implementation Pseudocode

```ts
const handleMoveListColumn = (columnId: string, direction: "left" | "right") => {
  const visibleColumns = getVisibleListColumns(definition.listView);
  const visibleIds = visibleColumns.map((column) => column.id);
  const currentVisibleIndex = visibleIds.indexOf(columnId);
  if (currentVisibleIndex === -1) return;

  const nextVisibleId =
    direction === "left"
      ? visibleIds[currentVisibleIndex - 1]
      : visibleIds[currentVisibleIndex + 1];
  if (!nextVisibleId) return;

  const currentIndex = definition.listView.columns.findIndex((column) => column.id === columnId);
  const swapIndex = definition.listView.columns.findIndex((column) => column.id === nextVisibleId);
  if (currentIndex === -1 || swapIndex === -1) return;

  const nextColumns = [...definition.listView.columns];
  [nextColumns[currentIndex], nextColumns[swapIndex]] = [
    nextColumns[swapIndex]!,
    nextColumns[currentIndex]!,
  ];
  updateListView({ ...definition.listView, columns: nextColumns });
};
```

```tsx
// ListViewCanvas.tsx
{resolvedColumns.map((column, index) => (
  <TableHead key={column.id}>
    <div className="flex items-center gap-2">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectColumn(column.id)}>
        {column.label}
      </button>
      <Button onClick={() => onMoveColumn(column.id, "left")} disabled={index === 0}>
        <ChevronLeft />
      </Button>
      <Button
        onClick={() => onMoveColumn(column.id, "right")}
        disabled={index === resolvedColumns.length - 1}
      >
        <ChevronRight />
      </Button>
    </div>
  </TableHead>
))}
```

```tsx
const hiddenColumns = listView.columns.filter(
  (column) => !resolvedColumns.some((visibleColumn) => visibleColumn.id === column.id)
);

{hiddenColumns.length > 0 ? (
  <div className="rounded-lg border border-dashed p-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Hidden columns
    </p>
    {hiddenColumns.map((column) => (
      <button key={column.id} type="button" onClick={() => onSelectColumn(column.id)}>
        {column.label}
      </button>
    ))}
  </div>
) : null}
```

Delete only the old lower reorder-arrow strip. Replace it with a compact
secondary hidden-column affordance so `visible=false` columns stay selectable.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged `content:write` for saving `definition.listView.columns`.
- CSRF: no new write route.
- Rate-limit bucket: unchanged `admin_write` when the screen is saved.
- Reject-unknown validation: no contract change; only persisted order changes.
- Anti-abuse: no public route or public state is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- mounted list-canvas coverage asserting:
  - left boundary disables the left button,
  - right boundary disables the right button,
  - header-level movement changes rendered column order,
  - hidden columns interleaved in the persisted array do not break visible
    header movement semantics,
  - hidden columns remain selectable from the secondary compact tray,
  - selected-column styling follows the moved column.
- `tests/vitest/ui/custom-screens-page.test.tsx` may remain a secondary
  render-only smoke, but it is not sufficient for mounted column interaction
  proof.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Column movement lives in the header row, not in a second card list.
2. Buttons are directional (`left` / `right`) and visually tied to the column
   they move.
3. Hidden columns remain reachable for reselection after `visible=false`.
4. Selection and inspector ownership remain stable after reorder operations.
