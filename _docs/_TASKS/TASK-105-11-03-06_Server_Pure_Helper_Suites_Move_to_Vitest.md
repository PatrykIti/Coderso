# TASK-105-11-03-06: Server Pure Helper Suites Move to Vitest
# FileName: TASK-105-11-03-06_Server_Pure_Helper_Suites_Move_to_Vitest.md

**Priority:** Medium  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03  
**Status:** Done (2026-03-12)

---

## Overview

Move the clearly Bun-free server helper suites into Vitest while keeping the broader server contract cluster in Bun.

## Scope

1. `tests/unit/server/errorHandler.test.ts`
2. `tests/unit/server/requestBody.test.ts`
3. `tests/unit/server/routeMatcher.test.ts`
4. `tests/unit/server/solutionKitSchemas.test.ts`
5. `tests/unit/server/styleUrl.test.ts`

## Acceptance Criteria

1. These helper-level suites no longer depend on `bun:test`.
2. The remaining `tests/unit/server/*` ownership stays explicitly Bun-owned unless separately reclassified.
3. No runtime/server contract suite is moved accidentally.

## Completion Notes

- Moved `errorHandler`, `requestBody`, `routeMatcher`, `solutionKitSchemas`, and `styleUrl` into `tests/vitest/server/*`.
- Left the rest of `tests/unit/server/*` in Bun because they still represent server-boundary contracts or remain coupled to settings/runtime concerns.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_CHANGELOG/*.md`
