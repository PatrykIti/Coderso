# TASK-101-09-06-03: Unit, Integration, UI Test Matrix, and Docs Closure
# FileName: TASK-101-09-06-03_Unit_Integration_UI_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-06-02  
**Status:** To Do

---

## Overview

Domknac testy wszystkich warstw i zsynchronizowac docs/board/changelog po wdrozeniu.

## Files to Change

- `tests/vitest/assistant/*` (new/update, ~500-800 LOC)
- `tests/vitest/ui/*assistant*` (new/update, ~260-420 LOC)
- `tests/integration/routes/assistant-actions.test.ts` (new/update, ~220-340 LOC)
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Sub-Tasks

1. Add unit suites for mode split, context, planner, registry, diff, execute, blueprints.
2. Add route integration suites for plan/dry-run/execute.
3. Add UI suites for review/confirm/follow-up/partial success.
4. Sync board, changelog, and contracts after final implementation.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest`
- targeted Bun route suites for assistant action endpoints
- ownership rule:
  - `tests/vitest/*` only for Bun-free planner/context/schema/UI helpers,
  - executor/adapter suites stay in Bun until extraction removes import-time DB/runtime coupling,
  - do not choose lane by folder name alone.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
