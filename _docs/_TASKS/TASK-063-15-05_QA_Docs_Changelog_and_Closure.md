# TASK-063-15-05: QA Docs Changelog and Closure
# FileName: TASK-063-15-05_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-15-01, TASK-063-15-02, TASK-063-15-03, TASK-063-15-04  
**Status:** To Do

---

## Overview
Domknac walidacje, dokumentacje i changelog dla `TASK-063-15`.

---

## Scope
1. Uruchomic lint/types i pelen zestaw testow section-focused.
2. Uruchomic full regression gates.
3. Zaktualizowac task board, docs parity i changelog.
4. Potwierdzic closure notes dla wszystkich subtaskow `063-15-01..05`.

---

## Closure Checklist (Hard Gate)
1. Wszystkie taski `TASK-063-15-01..05` maja status `Done` z data i closure note.
2. Wyniki testow z sekcji `Testing Requirements (Target)` sa wpisane do changelog entry.
3. `_docs/_TASKS/README.md` pokazuje `TASK-063-15` w sekcji `Done`.
4. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` zawiera finalny status `Section` parity (caret/Enter/commands/grouped toolbar).
5. `_docs/_CHANGELOG/README.md` ma nowy index entry dla final closure.

---

## Testing Requirements (Target)
- Mandatory quality gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Section-focused suites:
  - `bun test tests/unit/ui/post-richtext-adapter-caret-section.test.tsx`
  - `bun test tests/unit/posts/post-paste-normalizer.test.ts`
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `bun test tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
  - `bun test tests/integration/ui/post-editor-section-caret-enter.test.tsx`
  - `bun test tests/integration/ui/post-editor-section-command-persistence.test.tsx`
  - `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`
  - `bun test tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
  - `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/ARCHITECTURE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
