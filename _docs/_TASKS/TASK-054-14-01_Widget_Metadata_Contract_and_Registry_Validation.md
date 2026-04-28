# TASK-054-14-01: Widget Metadata Contract and Registry Validation
# FileName: TASK-054-14-01_Widget_Metadata_Contract_and_Registry_Validation.md

**Priority:** High  
**Category:** Widgets Architecture  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-14  
**Status:** Done (2026-02-20)

---

## Overview
Dodać mandatory metadata dla widgetów (`complexity`, `audience`, `module`) i walidację kontraktu w registry.

## Scope
1. Rozszerzyć `WidgetDefinition` i typy metadata.
2. Dodać walidację metadata przy `registerWidget`.
3. Uzupełnić core widget definitions o metadata mapę (bez modyfikacji semantyki renderera).

## Files
- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/index.ts`
- `tests/unit/widgets/registry.test.ts`

## Pseudocode
```ts
type WidgetComplexity = "composite" | "atomic";
type WidgetAudience = "beginner" | "intermediate" | "advanced";

registerWidget(def) {
  assert(def.complexity in ["composite","atomic"]);
  assert(def.audience in ["beginner","intermediate","advanced"]);
  assert(typeof def.module === "string" && def.module.trim().length > 0);
}
```

## Testing Requirements
- Unit: registry rejects invalid complexity/audience/module.
- Unit: core widgets register with complete metadata.

## Documentation Updates Required
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md` (contract section)
