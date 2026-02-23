# TASK-063-01: Gutenberg Reference Audit and Gap Matrix
# FileName: TASK-063-01_Gutenberg_Reference_Audit_and_Gap_Matrix.md

**Priority:** High  
**Category:** Analysis/Architecture  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063  
**Status:** To Do

---

## Overview
Przygotowac szczegolowa mape roznic miedzy obecnym Nextless posts editor a referencja Gutenberg, aby dalsze wdrozenie bylo deterministyczne i bez przepisywania "w ciemno".

---

## Scope
1. Zidentyfikowac referencyjne komponenty Gutenberg i ich role.
2. Zmapowac obecne komponenty Nextless i ownership.
3. Oznaczyc luki: `Must`, `Should`, `Out`.
4. Zdefiniowac migration slices pod kolejne subtaski.

---

## Files to Create / Change
- `_docs/UI/POST_EDITOR_GUTENBERG_GAP_MATRIX.md` (new)
- `_docs/_TASKS/TASK-063_Gutenberg_Parity_Post_Editor_Rearchitecture.md`

---

## Pseudocode
```md
for each Gutenberg area in [InterfaceSkeleton, Header, DocumentTools, InserterSidebar, ListViewSidebar, TOC/Outline]:
  map:
    - source reference file
    - UX responsibility
    - equivalent Nextless file
    - gap severity (must/should/out)
    - implementation owner subtask

publish matrix with:
  - baseline screenshot expectations
  - behavior notes
  - regression risk notes
```

---

## Acceptance Criteria
1. Istnieje jedna tabela "Gutenberg -> Nextless gap matrix".
2. Kazdy gap ma przypisany subtask `063-02..063-08`.
3. Nie ma niejawnych zakresow "do dorobienia pozniej".

---

## Testing Requirements
- N/A (analysis task), ale matrix musi byc uzyty jako source-of-truth w kolejnych subtaskach.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_GUTENBERG_GAP_MATRIX.md`
- `_docs/_TASKS/TASK-063_Gutenberg_Parity_Post_Editor_Rearchitecture.md`

