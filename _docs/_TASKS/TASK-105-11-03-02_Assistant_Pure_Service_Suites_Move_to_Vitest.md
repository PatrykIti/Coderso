# TASK-105-11-03-02: Assistant Pure Service Suites Move to Vitest
# FileName: TASK-105-11-03-02_Assistant_Pure_Service_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03-01  
**Status:** To Do

---

## Overview

Migrate the Bun-free assistant service/unit suites into Vitest now that the hybrid lane is established.

## Scope

1. `tests/unit/assistant/*` that do not depend on DB/runtime/plugin lifecycle

## Acceptance Criteria

1. Assistant pure service tests no longer depend on `bun:test`.
2. Provider/indexing/planner/executor helpers run green in Vitest.
3. Any assistant suite found to be runtime-coupled gets explicitly left in Bun with justification.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
