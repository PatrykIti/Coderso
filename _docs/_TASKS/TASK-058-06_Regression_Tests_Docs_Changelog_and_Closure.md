# TASK-058-06: Regression Tests, Docs, Changelog, and Closure
# FileName: TASK-058-06_Regression_Tests_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-058-01, TASK-058-02, TASK-058-03, TASK-058-04, TASK-058-05  
**Status:** To Do

---

## Overview
Domknac TASK-058 przez pelne testy, aktualizacje dokumentacji cache/prefetch i wpisy changelog + kanban sync.

## Scope
1. Uruchomic i ustabilizowac checki:
   - `bun --cwd core lint`,
   - `bun --cwd core lint:types`,
   - `bun test` (pelny zestaw),
   - dodatkowe testy perf/security gate dot. request budget.
2. Dodac/uzupelnic dokumentacje:
   - polityka cache,
   - trigger points invalidacji,
   - prefetch budgets,
   - global read dedupe.
3. Uzupelnic changelog i zamknac taski w kanban.

## Sub-Tasks
1. Uruchomic pelne lint/types/tests i naprawic regresje.
2. Zmierzyc i zapisac finalne budgety requestow.
3. Zaktualizowac dokumentacje cache/prefetch.
4. Zamknac changelog i kanban dla TASK-058 oraz subtaskow.

## Files to Create / Change
- `_docs/ADMIN_CACHE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `tests/perf/*` (dopelnienia budzetowe, jesli wymagane)

## Pseudocode
```sh
bun --cwd core lint
bun --cwd core lint:types
bun test
bun test tests/perf/admin-*.test.ts
```

## Acceptance Criteria
1. Brak petli fetch na ekranach krytycznych potwierdzony testami i baseline.
2. Lint/types/tests przechodza.
3. Dokumentacja i changelog odzwierciedlaja finalny kontrakt cache/prefetch.

## Testing Requirements
- Pelny regression pass.
- Udokumentowany wynik budzetow requestowych per route.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
