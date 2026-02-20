# TASK-054-15-04: Plugin Contract QA, Docs, and Closure
# FileName: TASK-054-15-04_Plugin_Contract_QA_Docs_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-15-01, TASK-054-15-02, TASK-054-15-03  
**Status:** To Do

---

## Overview
Domknięcie tasku 054-15: testy, dokumentacja kontraktu i wpis changelog.

## Scope
1. Uruchomić lint/types + pełny zestaw testów dotkniętych obszarów.
2. Dodać/uzupełnić dokumentację kontraktu pluginów.
3. Zaktualizować changelog, task statusy i kanban.

## Files
- `_docs/CODERSO_PLUGIN_CONTRACT.md` (new)
- `_docs/ARCHITECTURE.md`
- `_docs/STORE_SPEC.md` / `_docs/STORE_API.md` (contract sync)
- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/*.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-054-15_Coderso_Plugin_Contract_and_Package_Manifest.md`

## Pseudocode
```md
run lint/types/tests
sync docs contracts
add changelog entry
mark subtasks and parent task Done
move cards in _docs/_TASKS/README.md
```

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/plugins tests/integration/plugins tests/integration/store`
- `bun test tests/integration/routes/pluginsRoutes.test.ts`

## Documentation Updates Required
- full sync: architecture + API + store/plugin contract + changelog

