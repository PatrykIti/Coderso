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
so the builder interaction matches the visible table.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/ListViewCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- new mounted suite such as `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`

## Implementation Pseudocode

```ts
const handleMoveListColumn = (columnId: string, direction: "left" | "right") => {
  const currentIndex = definition.listView.columns.findIndex((column) => column.id === columnId);
  if (currentIndex === -1) return;
  const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= definition.listView.columns.length) return;

  const nextColumns = [...definition.listView.columns];
  const [column] = nextColumns.splice(currentIndex, 1);
  if (!column) return;
  nextColumns.splice(nextIndex, 0, column);
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

Delete the existing lower `grid gap-2 md:grid-cols-2` reorder strip once the
header controls are in place.

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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- mounted list-canvas coverage asserting:
  - left boundary disables the left button,
  - right boundary disables the right button,
  - header-level movement changes rendered column order,
  - selected-column styling follows the moved column.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Column movement lives in the header row, not in a second card list.
2. Buttons are directional (`left` / `right`) and visually tied to the column
   they move.
3. Selection and inspector ownership remain stable after reorder operations.
