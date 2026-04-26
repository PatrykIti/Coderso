# TASK-215-03-01: All Items Row Actions and Preview Placeholder
# FileName: TASK-215-03-01_All_Items_Row_Actions_and_Preview_Placeholder.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Actions
**Estimated Effort:** Medium
**Dependencies:** TASK-215-03
**Status:** To Do

---

## Overview

Add row/card action menus for `All Items` with source-aware options. Core rows
get Preview placeholder, Edit/Configure, Insert, and favorite actions. Template
rows delegate to the template action contract from TASK-215-04.
The menu uses the Pages `MoreHorizontal` / three-dot dropdown pattern for both
table rows and grid cards.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryRowActions.tsx` if extracted.
- `core/admin/ui/widgets/WidgetCard.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: Preview placeholder and Edit/Configure require already-authorized
  catalog rows; Insert writes are handled by TASK-215-03-02.
- CSRF: no writes for the preview placeholder or action menu opening.
- Rate-limit bucket: no new endpoint.
- Reject-unknown validation: action values are closed UI enum values.
- Anti-abuse: preview placeholder performs no network mutation and exposes no
  preview token or raw block config.

## Pseudocode

```ts
const coreActions = ["preview-placeholder", "configure", "insert", "favorite"];
const templateActions = ["preview-placeholder", "edit-template", "duplicate", "delete"];
```

## Testing Requirements

- Core `All Items` row menu includes Preview, Edit, and Insert.
- Row/card actions are hidden behind one three-dot menu per item.
- Preview action renders bounded placeholder feedback and does not call widget
  template preview or page/template update clients.
- Template `All Items` rows do not show core Insert unless the row source is a
  core widget.
- Action menu works in table and grid.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `All Items` actions are source-aware.
2. Preview is explicitly non-mutating and placeholder-only.
3. Action menus share behavior between table rows and grid cards.
