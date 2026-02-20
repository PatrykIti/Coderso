# TASK-054-14-03: Widget Library Composite-First UX and Filters
# FileName: TASK-054-14-03_Widget_Library_Composite_First_UX_and_Filters.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-14-02  
**Status:** Done (2026-02-20)

---

## Overview
Przebudować UX biblioteki widgetów na composite-first: `Recommended` domyślnie, `All widgets` jako tryb rozszerzony, filtry modułów i complexity.

## Scope
1. Dodać panel filtrów (`WidgetCatalogFilters`) z:
   - tabami `Recommended` / `All widgets`,
   - przełącznikiem `Advanced mode`,
   - selectami `Module` i `Complexity`.
2. Domyślny widok biblioteki: composite widgets.
3. Atomic widgets dostępne, ale poza domyślnym strumieniem.
4. Karty/drawer pokazują metadata badge (module/complexity/audience).

## Files
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx` (new)
- `core/admin/ui/widgets/types.ts`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
- `tests/unit/ui/widget-library.test.tsx`
- `tests/unit/pageBuilder/widgetLibrary.test.tsx`
- `tests/unit/ui/widget-card.test.tsx` (if needed)

## Pseudocode
```tsx
const recommended = widgets.filter((w) => w.source === "core" && w.complexity === "composite");
const allWidgets = widgets.filter((w) => w.source === "core");

const byTab = tab === "recommended" ? recommended : allWidgets;
const byAdvanced = advancedMode ? byTab : byTab;
const visible = applyModuleAndComplexityFilters(byAdvanced, moduleFilter, complexityFilter);
```

## Testing Requirements
- Unit: default render lands on Recommended composite flow.
- Unit: All widgets tab exposes atomic entries.
- Unit: module/complexity filters narrow result set.
- Unit: advanced toggle state persists and rehydrates.

## Documentation Updates Required
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md`
- `_docs/ARCHITECTURE.md` (widget delivery model)

## Completion Notes (2026-02-20)
- Implemented composite-first library flow:
  - `Recommended` tab as default,
  - `All widgets` tab for full catalog,
  - `Advanced mode` toggle with progressive disclosure.
- Added module and complexity filters and metadata badges in cards/drawer.
