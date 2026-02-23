# TASK-062-04: TOC QA, Docs, Changelog, and Closure
# FileName: TASK-062-04_TOC_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-062-01, TASK-062-02, TASK-062-03  
**Status:** To Do

---

## Overview
Domknac wdrozenie dynamicznego TOC przez pelna walidacje techniczna, aktualizacje dokumentacji i finalizacje kanban/changelog.

---

## Sub-Tasks
1. Uruchomic quality gates:
   - `bun --cwd core lint`
   - `bun --cwd core lint:types`
   - `bun test`
2. Dodac/regresyjnie rozszerzyc testy dla:
   - TOC generation,
   - anchor stability,
   - Word TOC replacement.
3. Zaktualizowac dokumentacje kontraktow (API/architecture/tasks).
4. Dodac changelog entry i wpis do `_docs/_CHANGELOG/README.md`.
5. Przeniesc `TASK-062*` na `Done` w `_docs/_TASKS/README.md` + aktualizacja statystyk.

---

## Validation Checklist
- Brak fail/warn w lint/types.
- Wszystkie nowe testy zielone.
- Runtime preview/public parity potwierdzone.
- Brak regresji smart paste, autosave i runtime renderer posts.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

