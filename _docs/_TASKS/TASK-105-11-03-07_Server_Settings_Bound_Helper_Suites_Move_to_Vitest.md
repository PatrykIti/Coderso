# TASK-105-11-03-07: Server Settings-Bound Helper Suites Move to Vitest
# FileName: TASK-105-11-03-07_Server_Settings_Bound_Helper_Suites_Move_to_Vitest.md

**Priority:** Medium  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03-06  
**Status:** Done (2026-03-12)

---

## Overview

Move the remaining Bun-free server helper suites that are currently blocked only by import-time settings coupling.

## Scope

1. `tests/unit/server/hostPolicy.test.ts`
2. `tests/unit/server/publicBaseUrl.test.ts`
3. `tests/unit/server/previewUrls.test.ts`

## Acceptance Criteria

1. The helper modules no longer import DB/settings code at module load time.
2. The corresponding tests run in Vitest.
3. Truly server-bound suites stay in Bun.

## Completion Notes

- Moved `hostPolicy`, `publicBaseUrl`, and `previewUrls` into `tests/vitest/server/*`.
- Refactored `baseUrl.ts` and `hostPolicy.ts` to lazy-load settings access, removing import-time DB coupling.
- Reduced the remaining Bun-owned server unit cluster to the true boundary cases only.

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
