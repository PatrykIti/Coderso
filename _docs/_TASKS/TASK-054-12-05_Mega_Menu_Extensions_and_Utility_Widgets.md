# TASK-054-12-05: Mega Menu Extensions and Utility Widgets
# FileName: TASK-054-12-05_Mega_Menu_Extensions_and_Utility_Widgets.md

**Priority:** Medium  
**Category:** Menus/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12-04  
**Status:** To Do

---

## Goal
Add mega-menu authoring metadata and reusable utility widgets for engagement UX flows.

## Scope
1. Menu editor enhancements:
   - badge label/tone,
   - visibility conditions,
   - optional description/icon fields.
2. Runtime menu resolver updates to expose metadata safely.
3. Add utility widgets as reusable presets:
   - tabs,
   - accordion,
   - toggle block.

## Files
- `core/admin/ui/menus/*`
- `core/services/menus/menuService.ts`
- `core/widgets/core/*` (new utility widgets)
- `core/widgets/core/index.ts`
- `core/admin/ui/widgets/editors/*` (new editors)
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/runtime.tsx`

## Pseudocode
```ts
item.settings.badge = { label: "New", tone: "accent" };
item.settings.visibility = "logged_out";
```

## Acceptance Criteria
1. Mega-menu metadata is editable and persisted.
2. Runtime consumers receive deterministic metadata shape.
3. Utility widgets are available in widget library with editor controls.
