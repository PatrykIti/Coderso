# TASK-213-02-02: Widget Card Drawer Entry Point Consolidation
# FileName: TASK-213-02-02_Widget_Card_Drawer_Entry_Point_Consolidation.md

**Priority:** Medium
**Category:** Widget Library + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-213-02
**Status:** To Do

---

## Overview

Fix the duplicated insert-entry finding (`BUG-5`/`UX-1`) without bypassing the
configured widget flow.

Current core widget cards support:

- card click -> details drawer;
- `Insert` button -> insert placement dialog;
- details drawer -> `Insert Widget`.

This creates two paths into the same mutation while only one path shows widget
configuration. Consolidate the flow so a core widget has one obvious
configuration-first entry point.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`

## Implementation Direction

Preferred contract:

- card click opens `WidgetDetailsDrawer`;
- card action label is `Configure` or `Details`, not `Insert`;
- drawer primary action remains `Insert Widget` for core widgets;
- templates keep `Edit Template`;
- if an info icon is introduced, use lucide icon button with tooltip/label.

Pseudocode:

```tsx
<WidgetCard
  actionLabel={widget.source === "core" ? "Configure" : "Edit"}
  onAction={() =>
    widget.source === "core"
      ? handleSelectWidget(widget)
      : handleEditTemplate(widget)
  }
  onSelect={() => handleSelectWidget(widget)}
/>
```

Do not add one-click insertion until the product defines a safe default target
and placement policy.

## Security Contract

- Visibility: internal admin Widget Library only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this leaf changes entry-point UI before
  existing insert mutations.
- Reject-unknown validation: no payload shape changes.
- Anti-abuse: no hidden insert mutation should run from card focus/hover/select;
  mutation still requires explicit placement and submit.

## Testing Requirements

- `tests/vitest/ui/widget-card.test.tsx`
  - action label for core widget is configuration-first;
  - action/click does not submit insert mutation directly;
  - template action remains edit.
- `tests/vitest/ui/widget-library.test.tsx`
  - selecting a core card opens the details/config drawer;
  - drawer primary action opens insert placement dialog.
- Manual Playwright:
  - click card body, card action, and drawer primary action and verify a single
    coherent flow.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md`

## Acceptance Criteria

1. Core widget cards no longer expose parallel direct insert and configured
   insert actions.
2. The drawer remains the place for widget configuration before insertion.
3. Template cards remain edit-oriented.
4. No mutation runs until placement is confirmed.
