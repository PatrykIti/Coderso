# TASK-063-16-01: Section Paragraph Quote Node Command Contract and Target Behavior
# FileName: TASK-063-16-01_Section_Paragraph_Quote_Node_Command_Contract_and_Target_Behavior.md

**Priority:** High  
**Category:** Admin/UI + UX Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Zamrozic kontrakt zachowania `paragraph` i `quote` w `Section` (`writing-canvas`) tak, aby implementacja i testy mialy jednoznaczny target.

---

## Scope
1. Zdefiniowac expected state transitions dla `paragraph <-> quote`.
2. Zdefiniowac zachowanie dla:
   - collapsed selection,
   - range selection,
   - multiline selection.
3. Potwierdzic wymaganie modelowe: komenda musi konczyc sie persisted node type.

---

## Detailed File-Level Plan
1. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
   - dopisac sekcje kontraktu `Section paragraph/quote node boundaries`.
2. `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
   - doprecyzowac case matrix dla `paragraph/quote`.
3. `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
   - case’y selection-driven transitions.

---

## Acceptance Criteria
1. Dla kazdego scenariusza mamy jawny expected wynik.
2. Kontrakt rozroznia poprawnie behavior wizualny i modelowy.
3. Brak niejednoznacznosci w toggle `paragraph <-> quote`.

---

## Testing Requirements (Target)
- `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
- `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`

---

## Closure Note (2026-03-02)
Kontrakt `Section paragraph/quote` zostal zamrozony jako node-boundary transform (`paragraph <-> quote`) z wymaganiem persistence po roundtripie modelu i runtime parity.
