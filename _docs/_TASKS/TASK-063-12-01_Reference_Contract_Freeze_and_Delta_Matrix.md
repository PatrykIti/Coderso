# TASK-063-12-01: Reference Contract Freeze and Delta Matrix
# FileName: TASK-063-12-01_Reference_Contract_Freeze_and_Delta_Matrix.md

**Priority:** High  
**Category:** Docs/UX Contract  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-11  
**Status:** To Do

---

## Overview
Zamrozic jednoznaczny kontrakt visual/UI dla post editora na podstawie:
- `_docs/UI/admin_panel/46-post-editor/code.html`

oraz spisac delta matrix `reference vs current` przed implementacja zmian.

---

## Scope
1. Rozbic referencje na sekcje (header, left rail, canvas, right rail, modal settings, responsive).
2. Zmapowac kazda sekcje do aktualnych komponentow Nextless.
3. Oznaczyc status: `match`, `partial`, `missing`.
4. Dla kazdego odchylenia wpisac decyzje: `must-fix`, `allowed deviation`, `defer`.

---

## Sub-Tasks
1. Spisac checklist parity dla kazdej sekcji referencji.
2. Opracowac mapping komponentow + plikow do zmian.
3. Uzgodnic i zapisac dozwolone odchylenia (np. dodatkowa zakladka `List view`).
4. Uzyc matrix jako gate dla kolejnych subtaskow.

---

## Physical Files (Planned)
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (new)
- `_docs/_TASKS/TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md`
- `_docs/_TASKS/TASK-063-12-01_Reference_Contract_Freeze_and_Delta_Matrix.md`

---

## Pseudocode
```ts
for (const section of referenceSections) {
  const target = mapReferenceToCurrent(section);
  const parity = evaluateParity(section, target);
  matrix.push({ section, target, parity, action: resolveAction(parity) });
}
```

---

## Acceptance Criteria
1. Powstal matrix z pelnym mapowaniem sekcji referencji i komponentow.
2. Kazde odchylenie ma przypisana decyzje i ownera.
3. Matrix moze byc uzyty jako checklista odbiorowa subtaskow 12-02..12-07.

---

## Testing Requirements
- Documentation consistency check:
  - matrix zawiera wszystkie regiony referencji,
  - matrix ma decyzje i target files dla kazdej roznicy.
- Brak zmian runtime w tym kroku.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md` (po dodaniu taska)
