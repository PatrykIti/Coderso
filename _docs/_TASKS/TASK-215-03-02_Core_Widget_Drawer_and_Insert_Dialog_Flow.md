# TASK-215-03-02: Core Widget Drawer and Insert Dialog Flow
# FileName: TASK-215-03-02_Core_Widget_Drawer_and_Insert_Dialog_Flow.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Insert Flow
**Estimated Effort:** Medium
**Dependencies:** TASK-215-03, TASK-213-02
**Status:** To Do

---

## Overview

Preserve the existing core widget configure-and-insert behavior inside the new
table/grid surface. Edit/Configure opens `WidgetDetailsDrawer`; Insert opens
`WidgetInsertDialog`; mutations happen only after the user picks a target and
confirms the dialog.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/widgetInsertUtils.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widgetInsertUtils.test.ts`
- `tests/vitest/pageBuilder/widgetLibrary.test.tsx`

## Security Contract

- Visibility: internal admin Widgets UI.
- Auth model: existing admin session/admin API key path.
- RBAC: page-target insert keeps the existing content/page write permission;
  template-target insert keeps `widgets:write`.
- CSRF: `updatePage` and `updateWidgetTemplate` keep CSRF handling through
  shared admin clients.
- Rate-limit bucket: existing `admin_write` for insert writes.
- Reject-unknown validation: inserted block data is created through registry
  defaults and validated by existing page/template update contracts.
- Anti-abuse: target ids must come from loaded page/template options; dialog
  errors remain bounded and cannot include stack traces or raw payloads.

## Pseudocode

```tsx
const handleWidgetAction = (row: WidgetLibraryRow, action: WidgetLibraryAction) => {
  if (row.source !== "core") return;

  if (action === "edit" || action === "configure") {
    setSelectedWidget(row.widget);
    setDetailsOpen(true);
    return;
  }

  if (action === "insert") {
    setInsertWidget(row.widget);
    setInsertOpen(true);
  }
};

<WidgetDetailsDrawer
  widget={selectedWidget}
  open={detailsOpen}
  onInsert={() => selectedWidget?.source === "core" && openInsert(selectedWidget)}
/>

<WidgetInsertDialog
  widget={insertWidget}
  pages={pageOptionsFromCache}
  templates={templateOptionsFromCatalog}
  onInsert={async (payload) => {
    // Keep the current updatePage/updateWidgetTemplate placement behavior.
    await insertWidgetIntoExplicitTarget(insertWidget, payload);
  }}
/>
```

## Testing Requirements

- Configure/Edit opens `WidgetDetailsDrawer` from table row and grid card.
- Drawer primary Insert opens `WidgetInsertDialog` for core widgets.
- Insert dialog can insert into page target and template target.
- Failed insert leaves the dialog open and reports bounded error.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widgetInsertUtils.test.ts tests/vitest/pageBuilder/widgetLibrary.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The new list/grid UI does not bypass the existing insert dialog.
2. Insert target selection remains explicit.
3. Drawer behavior matches current core widget configuration behavior.
