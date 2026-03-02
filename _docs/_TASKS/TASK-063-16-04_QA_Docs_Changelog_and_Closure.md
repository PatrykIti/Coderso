# TASK-063-16-04: QA Docs Changelog and Closure
# FileName: TASK-063-16-04_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-16-01, TASK-063-16-02, TASK-063-16-03  
**Status:** To Do

---

## Overview
Domknac walidacje, dokumentacje i changelog dla `TASK-063-16`.

---

## Scope
1. Uruchomic quality gates i docelowy plan testow.
2. Zaktualizowac task board, parity docs i architecture notes.
3. Dodac wpis changelog i zamknac task + subtaski.

---

## Closure Checklist (Hard Gate)
1. `TASK-063-16` i `TASK-063-16-01..04` maja status `Done`.
2. Wszystkie suite’y z `Testing Requirements (Target)` sa zielone.
3. `_docs/_TASKS/README.md` przenosi taski do `Done` i aktualizuje statystyki.
4. `_docs/_CHANGELOG/README.md` ma nowy indeks + osobny plik wpisu.

---

## Testing Requirements (Target)
- Mandatory quality gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Required suites:
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/posts/post-paste-normalizer.test.ts`
  - `bun test tests/unit/posts/post-block-normalizer-writing-canvas.test.ts`
  - `bun test tests/unit/posts/post-block-runtime-renderer.test.tsx`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/ARCHITECTURE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
