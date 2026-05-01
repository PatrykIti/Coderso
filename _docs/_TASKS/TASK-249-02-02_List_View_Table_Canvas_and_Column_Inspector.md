# TASK-249-02-02: List View Table Canvas and Column Inspector
# FileName: TASK-249-02-02_List_View_Table_Canvas_and_Column_Inspector.md

**Priority:** High
**Category:** Coderso Custom Screens + List Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-249-02-01
**Status:** To Do

---

## Overview

Turn `List View` into a real table-builder canvas so the user can grow the
actual records table from the left panel and inspect selected columns on the
right.

## Files to Change

- `core/admin/ui/custom-screens/ListViewDesigner.tsx`
- new `core/admin/ui/custom-screens/ListViewCanvas.tsx`
- new `core/admin/ui/custom-screens/ListViewElementLibrary.tsx`
- new `core/admin/ui/custom-screens/ListViewColumnInspector.tsx`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/registry.ts`
- `core/widgets/types.ts`
- `tests/vitest/ui/custom-screen-list-view.test.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`

## Builder Contract

- the left panel shows list-safe element cards/templates for the selected
  content type,
- the center canvas renders a live table preview,
- the user can add, select, reorder, and remove columns from the canvas,
- selecting a column opens its options in the right inspector,
- screen-level settings stay available in the same inspector, but they do not
  replace the selected-column controls,
- `Classic editor` and `Legacy drawer` are not selectable list behaviors.

## Implementation Pseudocode

```tsx
<ListViewWorkspace
  leftPanel={
    <ListViewElementLibrary
      contentType={contentType}
      onAddColumn={handleAddColumnTemplate}
    />
  }
  canvas={
    <ListViewCanvas
      listView={value}
      previewRows={buildPreviewRows(contentType)}
      selectedColumnId={selectedColumnId}
      onSelectColumn={setSelectedColumnId}
      onMoveColumn={moveColumn}
      onRemoveColumn={removeColumn}
    />
  }
  rightPanel={
    <ListViewColumnInspector
      column={selectedColumn}
      contentType={contentType}
      onChange={patchSelectedColumn}
    />
  }
/>
```

```ts
function handleAddColumnTemplate(template: ListViewElementTemplate) {
  const nextColumn = buildListColumnFromTemplate(template, contentType);
  updateListView({
    ...value,
    columns: insertAfterSelectedColumn(value.columns, selectedColumnId, nextColumn),
  });
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: saving the resulting list config requires `content:write`.
- CSRF: unchanged current screen save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - canvas edits persist only through normalized list-column definitions,
  - selectable templates remain scoped to approved system fields and selected
    content-type fields.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - the canvas renders a table preview for `List View`,
  - columns can be added from the left library,
  - selected-column changes update the right inspector,
  - reordering/removal stays deterministic,
  - no classic-editor or drawer choices appear in the designer.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. `List View` is edited through a canvas preview, not a detached configuration
   form.
2. The left panel grows the actual table model.
3. The right panel owns selected-column options.
