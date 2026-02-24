# TASK-063-10-05: QA, Docs, Changelog, and Closure
# FileName: TASK-063-10-05_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA + Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-10-02, TASK-063-10-03, TASK-063-10-04  
**Status:** To Do

---

## Overview
Domknac migracje template i focus mode przez pelny pakiet walidacji:
- lint/types/tests,
- aktualizacje dokumentacji,
- changelog,
- zamkniecie taskow na kanbanie.

---

## Scope
1. Uruchomic pelny gate testowy dla scope projektu.
2. Potwierdzic brak regresji w save/preview/publish/autosave/revisions.
3. Zaktualizowac dokumentacje architektury i modułow.
4. Dodac changelog wpis i zsynchronizowac statusy taskow.

---

## Physical Files (Planned)
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/CMS_API.md` (jesli kontrakt sie zmieni)
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
- `tests/integration/ui/post-editor-smoke-regression.test.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Pseudocode
```bash
bun --cwd core lint
bun --cwd core lint:types
bun test tests/unit tests/integration tests/perf tests/security
```

```ts
assertRegressionMatrix([
  "layout",
  "focus-mode",
  "floating-plus",
  "autosave",
  "preview",
  "publish",
]);
```

---

## Acceptance Criteria
1. Wszystkie checki przechodza.
2. Dokumentacja opisuje finalne zachowanie template + focus mode.
3. Changelog i kanban sa zsynchronizowane.

---

## Testing Requirements
- Mandatory gate:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
