# TASK-054-16-03: Widget Library Pack-Aware Module UX
# FileName: TASK-054-16-03_Widget_Library_Pack_Aware_Module_UX.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-16-02  
**Status:** Done (2026-02-20)

---

## Overview
Podpiąć matrix status do UX biblioteki widgetów (module filters/order/labels), aby promować gotowe packi.

## Scope
1. Sort module filter options:
   - strict-ready first,
   - advisory/gap modules after.
2. Dodać czytelne labelki (`Ready`, `Needs coverage`) bez technicznego żargonu.
3. Utrzymać composite-first flow (`Recommended`) i obecne filtrowanie.

## Files
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `tests/unit/ui/widgetLibraryUtils.test.ts`
- `tests/unit/ui/widget-library.test.tsx`

## Pseudocode
```ts
const moduleOptions = buildModuleOptionsFromPacks(statusMap, widgets);
// ready strict modules first
moduleOptions.sort(byReadinessThenLabel);
```

## Testing Requirements
- Unit: module ordering follows readiness rules.
- Unit: module labels include coverage state tokens.

## Documentation Updates Required
- `_docs/WIDGET_PACK_MATRIX.md`

## Completion Notes (2026-02-20)
- Widget library module filter now uses pack-aware labels and ordering (`Ready`, `Needs coverage`).
- Strict-ready modules are prioritized in module selector ordering.
- Added UI utility tests for module option ordering/labeling.
