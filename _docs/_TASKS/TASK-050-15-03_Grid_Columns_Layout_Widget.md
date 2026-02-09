# TASK-050-15-03: Grid/Columns Layout Widget
# FileName: TASK-050-15-03_Grid_Columns_Layout_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-15-01, TASK-050-15-02  
**Status:** To Do

---

## Overview

Implement a `grid-columns` layout widget with an elastic number of columns,
per-breakpoint sizing, and per-column content slots.

Main value:
- scalable multi-column layouts
- editor-friendly column management
- deterministic runtime for nested widget trees

---

## Scope

- Widget ID: `grid-columns`
- Category: `layout`
- Variants:
  - `equal`
  - `asymmetric`
  - `masonry-lite`
- Model:
  - `columns[]` repeatable instances: `id`, `label`
  - `layout.desktop|tablet|mobile`: column sizing tokens per column
  - `gap`: row/column gap tokens
  - `align`: cross-axis alignment
  - `style`: optional cardized column wrapper
- Slots:
  - one slot per column instance (`column_<id>`)

---

## Pseudo-Implementation

```ts
// core/widgets/core/gridColumns.tsx
type GridColumn = { id: string; label: string };

type GridColumnsData = {
  columns: GridColumn[];
  layout: {
    desktop: Record<string, string>; // example: "1fr", "2fr", "minmax(0,1fr)"
    tablet: Record<string, string>;
    mobile: Record<string, string>;
  };
  gap: { x: string; y: string };
  style: { columnBg: string; columnBorder: string; columnRadius: string };
};
```

```tsx
// renderer concept
<div data-grid-columns={columns.length}>
  {columns.map((column) => (
    <div key={column.id} data-grid-column={column.id} style={resolveColumnStyle(column.id)}>
      {renderSlot(column.id)}
    </div>
  ))}
</div>
```

```tsx
// visual editor concept
<ColumnsManager
  columns={value.columns}
  onAdd={addColumn}
  onDuplicate={duplicateColumn}
  onRemove={removeColumn}
  onReorder={reorderColumns}
  onResizeDesktop={setDesktopWidth}
  onResizeTablet={setTabletWidth}
  onResizeMobile={setMobileWidth}
/>
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/gridColumns.tsx` | new widget schema/defaults/renderer | repeatable columns + responsive widths |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | new wizard/visual/advanced editors | column manager + sizing controls |
| `core/widgets/core/index.ts` | register widget | layout category |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity |
| `tests/unit/widgets/gridColumns.test.tsx` | new tests | schema/defaults/renderer/editors |
| `tests/unit/widgets/renderer.test.tsx` | add responsive marker assertions | deterministic output |
| `tests/unit/pageBuilder/blockList.test.tsx` | add nested insert/reorder tests for columns | editor flow |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | UI coverage |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/gridColumns.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/pageBuilder/blockList.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-grid-columns-layout-widget.md`
