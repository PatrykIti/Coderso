# TASK-105-11-03-02: Assistant Pure Service Suites Move to Vitest
# FileName: TASK-105-11-03-02_Assistant_Pure_Service_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03-01  
**Status:** Done (2026-03-12)

---

## Overview

Migrate the Bun-free assistant service/unit suites into Vitest now that the hybrid lane is established.

## Scope

1. `tests/unit/assistant/*` that do not depend on DB/runtime/plugin lifecycle

## Acceptance Criteria

1. Assistant pure service tests no longer depend on `bun:test`.
2. Provider/indexing/planner/executor helpers run green in Vitest.
3. Any assistant suite found to be runtime-coupled gets explicitly left in Bun with justification.

## Completion Notes

- Moved `assistantMetrics`, `assistantQuota`, `assistantRedaction`, `openRouterProvider`, and `siteBuilderPlanner` into `tests/vitest/assistant/*`.
- Left the higher-level assistant docs/indexing/provider orchestration suites in the refactor-first bucket because they still import mixed settings/DB/service modules at load time.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
