# TASK-105-11-03-04: Forms Pure Contracts and Helper Suites Move to Vitest
# FileName: TASK-105-11-03-04_Forms_Pure_Contracts_and_Helper_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03-01  
**Status:** Done (2026-03-12)

---

## Overview

Move the clearly Bun-free forms contract/helper suites into Vitest while leaving DB-backed service/submission tests in Bun.

## Acceptance Criteria

1. Pure forms contract/helper suites no longer depend on `bun:test`.
2. DB-backed forms service/submission tests stay in Bun.
3. The forms cluster gets split by real dependency shape rather than folder name.

## Completion Notes

- Moved the Bun-free forms contract/helper suites into `tests/vitest/forms/*`.
- Left DB-backed forms service/submission suites in Bun.
- Left `formAutomationRunner`, `formRuntimeResolver`, and `submissionNonce` out of the migration because they still need refactor or boundary cleanup before a clean Vitest move.

## Testing Requirements

- targeted `vitest`
- relevant `bun test` for the forms suites intentionally left in Bun
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
