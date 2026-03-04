# TASK-054-22-03: Screen Builder UI and Widget Composition
# FileName: TASK-054-22-03_Screen_Builder_UI_and_Widget_Composition.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-22-01, TASK-054-14, TASK-054-16  
**Status:** To Do

---

## Overview
Zbudowac UI builder do skladania custom screens z widgetow, bazujac na page builder block system.

## Scope
1. New admin screen list + editor dla custom screens.
2. Widget canvas (reuse `ui/pages/builder/*`) z katalogiem widgetow.
3. Side panel do ustawien ekranu (name, content type, status).

## Files to Create / Change
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenShell.tsx` (new)
- `core/admin/ui/navigation/codersoModules.ts` (route + label)
- `core/admin/ui/pages/builder/*` (reuse)

## Pseudocode
```tsx
<CustomScreenEditor>
  <BuilderCanvas blocks={screen.blocks} onChange={updateBlocks} />
  <BuilderSidebar>
    <ScreenSettings />
  </BuilderSidebar>
</CustomScreenEditor>
```

## Acceptance Criteria
1. Admin moze tworzyc i edytowac ekran przez drag/drop widgetow.
2. UI uzywa tych samych tokens/theme styles co pozostale ekrany.
3. Editor zapisuje layout do definicji ekranu.

## Testing Requirements
- UI unit: render list/editor states.
- Integration UI: create screen, add widget, save.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
