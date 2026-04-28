# TASK-105-12-03: Forms Automation Runner Dependency Split
# FileName: TASK-105-12-03_Forms_Automation_Runner_Dependency_Split.md

**Priority:** High  
**Category:** Platform + Forms  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-12-02  
**Status:** Done (2026-03-12)

---

## Overview

Extract a pure automation-runner core from the current mixed `formAutomationRunner` module so orchestration logic can be tested in Vitest while runtime defaults stay in Bun-owned wrappers.

## Acceptance Criteria

1. Pure automation orchestration becomes import-safe for Vitest.
2. Runtime wiring remains in a thin wrapper with explicit default deps.
3. Existing behavior and action run persistence semantics remain unchanged.

## Completion Notes

- Extracted the Bun-free orchestration and action execution flow into `core/services/forms/formAutomationRunnerCore.ts`.
- Converted `core/services/forms/formAutomationRunner.ts` into a thin runtime wrapper with lazy default deps for form actions, form settings lookup, email transport/settings, and entry persistence.
- Moved the orchestration suite from `tests/unit/forms/formAutomationRunner.test.ts` into `tests/vitest/forms/formAutomationRunnerCore.test.ts`.
- Revalidated the existing Bun-owned route surface separately so runtime form submission and retry paths still import cleanly through the server boundary.

## Testing Requirements

- targeted `vitest`
- relevant `bun test` for DB/runtime leftovers
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
