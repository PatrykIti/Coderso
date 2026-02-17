# TASK-054-14: Coderso Composite-First Widget Strategy
# FileName: TASK-054-14_Coderso_Composite_First_Widget_Strategy.md

**Priority:** High  
**Category:** Product UX + Widgets Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06, TASK-050  
**Status:** To Do

---

## Goal
Adopt a `Composite-first` delivery model for non-technical users while keeping atomic controls available in advanced mode.

## Why
- Pure atomic widget systems are flexible but overwhelming for non-technical users.
- Composite blocks shorten time-to-value and reduce configuration errors.
- Advanced mode preserves power-user flexibility.

## Delivery Model
1. `Kits` (full-site starter flows)
2. `Composite widgets` (business sections: service list + CTA + trust)
3. `Atomic widgets` (fine-grained controls in advanced editor)

## Files to Change
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md` (new)
- `core/widgets/registry.ts`
- `core/widgets/types.ts`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/editors/*`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx` (new)

## Required Data Contract
```ts
export type WidgetComplexity = "composite" | "atomic";
export type WidgetAudience = "beginner" | "intermediate" | "advanced";

export type WidgetDefinition = {
  type: string;
  title: string;
  complexity: WidgetComplexity;
  audience: WidgetAudience;
  module: string;
  presets?: Array<{ id: string; label: string; description?: string }>;
  requires?: string[]; // dependent modules
};
```

## Admin UX Contract
- Default library tab: `Recommended` (composite only).
- Secondary tab: `All widgets` (includes atomic).
- Toggle: `Advanced mode` reveals atomic-specific controls.

## Pseudocode
```tsx
const recommended = widgets.filter((w) => w.complexity === "composite");
const visible = advancedMode ? widgets : recommended;

<WidgetLibrary
  sections={groupByModule(visible)}
  defaultTab="recommended"
/>
```

## Acceptance Criteria
1. New users can build pages from composite widgets only.
2. Atomic widgets are available but do not dominate default UX.
3. Widget metadata supports filtering by module and complexity.

## Testing Requirements
- Unit: widget registry validation for `complexity/audience/module`.
- Unit: library filters and advanced toggle behavior.
- E2E: beginner flow creates a page without atomic widgets.

## Documentation Updates Required
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md` (new)
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
