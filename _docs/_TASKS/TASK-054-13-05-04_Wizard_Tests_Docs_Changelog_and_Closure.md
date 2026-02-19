# TASK-054-13-05-04: Wizard Tests, Docs, Changelog, and Closure
# FileName: TASK-054-13-05-04_Wizard_Tests_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-05-01, TASK-054-13-05-02, TASK-054-13-05-03  
**Status:** To Do

---

## Overview
Domknąć jakość i dokumentację: testy kontraktowe + docs + changelog + synchronizacja task board.

## Scope
1. Dodać testy unit/integration dla planner/apply/UI wizard.
2. Uruchomić lint + types + relevant tests.
3. Uzupełnić docs API/architecture/modules.
4. Dodać wpis changelog i zsynchronizować `_docs/_TASKS/README.md`.

## Files
- `tests/unit/assistant/siteBuilderPlanner.test.ts`
- `tests/unit/server/solutionKitSchemas.test.ts`
- `tests/integration/routes/solutionKitsRoutes.test.ts`
- `tests/unit/admin/solutionKitsClient.test.ts`
- `tests/unit/ui/ai-site-wizard.test.tsx` (new)
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/*`
- `_docs/_TASKS/README.md`

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test` dla touched suites (unit + integration)
- Jeśli dotykamy DB install flow: uruchomić testy z DB (gdy `DATABASE_URL` ustawione)

## Documentation Updates Required
- Changelog entry z task IDs: `TASK-054-13-05`, `TASK-054-13-05-01..04`.
