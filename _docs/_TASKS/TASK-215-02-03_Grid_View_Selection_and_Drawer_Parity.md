# TASK-215-02-03: Grid View Selection and Drawer Parity
# FileName: TASK-215-02-03_Grid_View_Selection_and_Drawer_Parity.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-215-02
**Status:** Done (2026-04-26)

---

## Overview

Upgrade grid mode so it is a view transformation over the same result rows,
not a separate discovery flow. Grid cards keep the filter bar visible, expose
selection checkboxes for bulk actions, and preserve current drawer behavior.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetLibraryGrid.tsx` if extracted.
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx` only if drawer props need a
  controlled label/action extension.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: grid rows are backed by `widgets:read`.
- CSRF: no writes in grid rendering.
- Rate-limit bucket: unchanged `admin_read`.
- Reject-unknown validation: no route schema changes.
- Anti-abuse: card selection must not select rows hidden by the active section,
  filter, or page.

## Pseudocode

```tsx
type WidgetLibraryGridProps = {
  rows: WidgetLibraryRow[];
  selectedIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onPrimaryClick: (row: WidgetLibraryRow) => void;
  onAction: (row: WidgetLibraryRow, action: WidgetLibraryAction) => void;
};

function WidgetLibraryGrid(props: WidgetLibraryGridProps) {
  return props.rows.map((row) => (
    <WidgetLibraryGridCard
      key={row.id}
      row={row}
      selected={props.selectedIds.has(row.id)}
      onCheckboxClick={(event) => {
        event.stopPropagation();
        props.onToggleRow(row.id, !props.selectedIds.has(row.id));
      }}
      onClick={() => props.onPrimaryClick(row)}
      onAction={(action) => props.onAction(row, action)}
    />
  ));
}

const handleGridPrimaryClick = (row: WidgetLibraryRow) => {
  if (row.source === "core") {
    openWidgetDetails(row.widget);
    return;
  }
  openTemplateEditor(row.id);
};
```

## Testing Requirements

- Switching to grid keeps the section dropdown and filters visible.
- Grid renders the same visible row ids as the table for the active section.
- Card checkbox toggles selection without firing the card click handler.
- Core widget card click opens `WidgetDetailsDrawer`.
- Template card click uses template-safe behavior from TASK-215-04, not the
  core widget config drawer.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Grid is a presentation mode over the same filtered/paginated model.
2. Grid supports visible-row selection for bulk actions.
3. Existing core widget drawer behavior is preserved.
