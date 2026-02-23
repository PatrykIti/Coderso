# 313 - TASK-063-01 Gutenberg Reference Audit and Gap Matrix

- **Date:** 2026-02-23
- **Version:** 1.0.0
- **Tasks:** TASK-063, TASK-063-01, TASK-063-01-01, TASK-063-01-02, TASK-063-01-03

## Key Changes

### Analysis Baseline
- Dodano referencyjna inwentaryzacje komponentow Gutenberg dla posts editora:
  - shell/interface regions,
  - header i document tools,
  - inserter/list-view sidebars,
  - stats/outline contracts,
  - rich text i block editor contracts.

### Nextless Current-State Inventory
- Udokumentowano aktualna architekture posts editora Nextless:
  - ownership komponentow,
  - przeplyw danych i state model,
  - autosave/preview/publish paths,
  - runtime mapper/renderer parity.

### Migration Plan (Gap Matrix)
- Dodano pełna macierz gapow Gutenberg -> Nextless z priorytetami:
  - `Must`, `Should`, `Out`.
- Kazdy gap ma przypisanego ownera w subtaskach `TASK-063-02..063-09`.
- Ustalono execution slices i podstawowe regression guards pod rollout.

### Task Planning Granularity
- TASK-063 rozbito na szczegolowe fizyczne podtaski (`TASK-063-xx-yy`) z:
  - zakresem,
  - listami plikow,
  - pseudokodem,
  - test requirements,
  - docs update planem.

## Files
- `_docs/UI/POST_EDITOR_GUTENBERG_COMPONENT_INVENTORY.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/UI/POST_EDITOR_GUTENBERG_GAP_MATRIX.md`
- `_docs/_TASKS/TASK-063_Gutenberg_Parity_Post_Editor_Rearchitecture.md`
- `_docs/_TASKS/TASK-063-01_Gutenberg_Reference_Audit_and_Gap_Matrix.md`
- `_docs/_TASKS/TASK-063-01-01_Gutenberg_Component_Inventory.md`
- `_docs/_TASKS/TASK-063-01-02_Nextless_Current-State_Inventory.md`
- `_docs/_TASKS/TASK-063-01-03_Gap_Prioritization_and_Migration_Plan.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Validation
- Docs/task planning scope only (no runtime code changes).
- Test gates not executed for this step.
