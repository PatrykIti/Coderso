# TASK-054-16-01: Matrix Contract and Module Pack Definitions
# FileName: TASK-054-16-01_Matrix_Contract_and_Module_Pack_Definitions.md

**Priority:** High  
**Category:** Product/Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-16  
**Status:** Done (2026-02-20)

---

## Overview
Zdefiniować jawny kontrakt matrix (page preset + section presets + composite minimum) dla modułów Coderso.

## Scope
1. Dodać static matrix contract (`WIDGET_PACK_MATRIX`) dla modułów.
2. Określić per-module minimum i seed pack IDs (presets/sections/composite widgets).
3. Rozróżnić enforcement profile:
   - `strict` (v1 ready),
   - `advisory` (preview/planned).

## Files
- `core/widgets/modulePackMatrix.ts` (new)
- `_docs/WIDGET_PACK_MATRIX.md` (new)

## Pseudocode
```ts
type ModulePack = {
  module: string;
  enforcement: "strict" | "advisory";
  min: { pagePresets: 1; sectionPresets: 2; compositeWidgets: 3 };
  pagePresets: string[];
  sectionPresets: string[];
  compositeWidgets: string[];
};
```

## Testing Requirements
- Unit: matrix contract is deterministic (unique modules, valid minimums).

## Documentation Updates Required
- `_docs/WIDGET_PACK_MATRIX.md`

## Completion Notes (2026-02-20)
- Added `core/widgets/modulePackMatrix.ts` with explicit module pack contract and strict/advisory enforcement profile.
- Added docs contract in `_docs/WIDGET_PACK_MATRIX.md`.
