# TASK-105-11-03: Refactor-First Cluster Ownership Audit
# FileName: TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-01, TASK-105-11-02  
**Status:** Done (2026-03-12)

---

## Overview

Re-audit the remaining `tests/unit/*` clusters that were previously marked `refactor first` and classify what:
- still must stay in Bun,
- can now move to Vitest after incremental refactors,
- needs a new dedicated migration task instead of ad-hoc cleanup.

## Scope

1. `tests/unit/posts/*`
2. `tests/unit/forms/*`
3. `tests/unit/search/*`
4. `tests/unit/server/*`
5. `tests/unit/assistant/*`
6. `tests/unit/validation/*`

## Audit Snapshot

Final `2026-03-12` findings from the re-audit:
- `validation` looks fully Bun-free and is a direct Vitest migration candidate.
- `search` splits into:
  - Bun-free pure logic: `filterEngine`, `listingRuntimeService`, `searchIndexService`, `searchService`
  - Bun keep: `searchHistoryService` because it is DB-backed.
- `assistant` pure helpers are now partially migrated into `tests/vitest/assistant/*`, but the higher-level docs/indexing/provider orchestration suites still need refactor-first treatment.
- `posts` splits into:
  - pure editor/domain leaves have now been moved into `tests/vitest/posts/*`
  - Bun keep or verify carefully: DB/schema/runtime renderer and any file still coupled to runtime/public rendering contracts.
- `forms` splits into:
  - pure contracts/settings/helpers have now been moved into `tests/vitest/forms/*`
  - DB-coupled Bun keep for service and submission persistence flows.
- `server` now splits into:
  - Vitest-owned pure helpers: `errorHandler`, `requestBody`, `routeMatcher`, `solutionKitSchemas`, `styleUrl`
  - Bun keep: the remaining server-boundary contract suites, especially anything tied to settings/runtime or public API behavior

## Sub-Tasks

1. `TASK-105-11-03-01_Validation_and_Search_Pure_Suites_Move_to_Vitest.md`
2. `TASK-105-11-03-02_Assistant_Pure_Service_Suites_Move_to_Vitest.md`
3. `TASK-105-11-03-03_Posts_Pure_Editor_Model_Suites_Move_to_Vitest.md`
4. `TASK-105-11-03-04_Forms_Pure_Contracts_and_Helper_Suites_Move_to_Vitest.md`
5. `TASK-105-11-03-05_Server_Cluster_Bun_Ownership_Freeze.md`
6. `TASK-105-11-03-06_Server_Pure_Helper_Suites_Move_to_Vitest.md`

## Acceptance Criteria

1. Remaining Bun unit suites are explicitly justified.
2. Newly-eligible Bun-free suites are called out with concrete migration targets.
3. No ambiguous cluster remains undocumented.

## Completion Notes

- The audit is now translated into physical subtask files and delivered migration slices for `validation`, `assistant`, pure `posts`, pure `forms`, pure `server` helpers, and pure `search` logic.
- The remaining ambiguous areas are no longer broad buckets:
  - DB-backed `searchHistoryService`
  - DB/runtime post cases
  - DB/runtime forms cases
  - Bun-owned server boundary cases
  - higher-level mixed assistant/service modules

## Testing Requirements

- documentation and ownership review against current source/runtime coupling
- targeted smoke validation if any suite ownership actually changes

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md`
- `tests/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
