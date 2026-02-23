# TASK-063-01-01: Gutenberg Component Inventory
# FileName: TASK-063-01-01_Gutenberg_Component_Inventory.md

**Priority:** High  
**Category:** Analysis/Architecture  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-01  
**Status:** To Do

---

## Overview
Zrobic inwentaryzacje referencyjnych komponentow Gutenberg, ktore sa kluczowe dla posts editora Nextless.

---

## Scope
1. Przejrzec referencje w `_docs/UI/gutenberg-trunk/packages/editor/src/components/*`.
2. Wylistowac komponenty: shell, header, tools, inserter, list-view, outline, details, save/publish.
3. Dopisac role komponentu, wejscia/wyjscia i UX contract.

---

## Files to Create / Change
- `_docs/UI/POST_EDITOR_GUTENBERG_COMPONENT_INVENTORY.md` (new)
- `_docs/_TASKS/TASK-063-01_Gutenberg_Reference_Audit_and_Gap_Matrix.md`

---

## Pseudocode
```ts
for component in gutenberg_reference_components:
  capture(name, file_path, ux_role, state_dependencies, keyboard_behavior)
export inventory as markdown table
```

---

## Acceptance Criteria
1. Istnieje tabela referencyjnych komponentow z odpowiedzialnoscia.
2. Kazdy komponent ma mapowanie do obszaru w Nextless.

---

## Testing Requirements
- N/A (analysis).

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_GUTENBERG_COMPONENT_INVENTORY.md`
