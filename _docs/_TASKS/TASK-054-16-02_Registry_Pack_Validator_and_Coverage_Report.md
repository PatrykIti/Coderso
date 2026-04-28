# TASK-054-16-02: Registry Pack Validator and Coverage Report
# FileName: TASK-054-16-02_Registry_Pack_Validator_and_Coverage_Report.md

**Priority:** High  
**Category:** Core/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-16-01  
**Status:** Done (2026-02-20)

---

## Overview
Dodać walidator pack matrix względem registry widgetów i funkcję raportu pokrycia.

## Scope
1. Dodać walidator w layer widgets core:
   - checks `compositeWidgets` exist in registry and are `composite`,
   - checks preset counts vs minimum.
2. Dodać `listModulePackStatus()` dla admin UI.
3. Strict modules fail validation; advisory modules report gaps bez hard throw.

## Files
- `core/widgets/registry.ts`
- `core/widgets/modulePackMatrix.ts`
- `tests/unit/widgets/modulePackMatrix.test.ts` (new)
- `tests/unit/widgets/registry.test.ts` (extend)

## Pseudocode
```ts
validateModulePackMatrix({ strictOnly }) {
  for (const pack of matrix) {
    const status = computePackStatus(pack, listWidgets());
    if (pack.enforcement === "strict" && !status.valid) throw Error(...);
  }
}
```

## Testing Requirements
- Unit: strict module fails when composite ref missing.
- Unit: advisory module reports gaps without throw.
- Unit: status report exposes counts and missing references.

## Documentation Updates Required
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-02-20)
- Added registry-level pack status report (`listModulePackStatus`) and validator (`validateModulePackMatrix`).
- Strict modules now fail fast on missing composite coverage; advisory modules expose gaps without runtime failure.
- Added dedicated unit tests for matrix/validator behavior.
