# TASK-105-11: Legacy Bun-Free Test Migration Cleanup
# FileName: TASK-105-11_Legacy_Bun_Free_Test_Migration_Cleanup.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-104, TASK-105  
**Status:** Done (2026-03-12)

---

## Overview

Close the remaining runner-ownership cleanup after the hybrid Bun/Vitest model shipped.

This is not a "move everything to Vitest" task.
This is a cleanup task that makes the repo match the intended architecture:
- Bun remains the runtime kernel and keeps runtime/plugin/perf/security/DB-coupled suites.
- Vitest owns Bun-free admin/UI, SDK, and pure domain suites.
- refactor-first clusters stay explicitly documented instead of remaining in mixed ownership by accident.

## Scope

1. Remove or replace legacy `bun:test` suites that already have stronger Vitest-owned equivalents.
2. Migrate remaining Bun-free legacy suites that still live under `tests/unit/*`.
3. Reconfirm and document which suites still stay in Bun.
4. Re-audit refactor-first clusters before any future migration waves touch them.

## Candidate Areas

- `tests/unit/ui/*`
- `tests/unit/admin/*`
- `tests/unit/sdk/*`
- `tests/unit/customScreens/*`
- follow-up audit for `tests/unit/posts/*`, `tests/unit/forms/*`, `tests/unit/search/*`, `tests/unit/server/*`, `tests/unit/assistant/*`, `tests/unit/validation/*`

## Progress Notes

Completed slices:
- removed duplicated Bun-free legacy suites in `tests/unit/ui/*`
- removed duplicated Bun-free legacy suites in the Bun-free part of `tests/unit/admin/*`
- removed duplicated Bun-free helper suites in `tests/unit/sdk/*`
- moved `bindingResolver` into `tests/vitest/customScreens/*` and removed legacy Bun `customScreens` duplicates
- moved all validation schema suites into `tests/vitest/validation/*`
- moved the Bun-free assistant helper/provider/planner suites into `tests/vitest/assistant/*`
- moved the Bun-free posts editor/model suites into `tests/vitest/posts/*`
- moved the Bun-free forms contract/helper suites into `tests/vitest/forms/*`
- moved the Bun-free server helper suites into `tests/vitest/server/*`
- moved the Bun-free search pure-logic suites into `tests/vitest/search/*`
- moved the Bun-free server settings-bound helper suites into `tests/vitest/server/*`

Remaining slices:
- none inside the legacy Bun-free migration cleanup scope

## Completion Notes

- The Bun-free legacy suite migration track is complete for the mechanically movable areas.
- Remaining Bun-owned test cases are now explicit and intentional rather than legacy leftovers.
- Remaining mixed modules now require code refactors, not more runner-cleanup bookkeeping.

## Sub-Tasks

1. `TASK-105-11-01_UI_Admin_and_SDK_Duplicate_Legacy_Suites_Move_to_Vitest.md`
2. `TASK-105-11-02_Custom_Screens_and_Pure_Domain_Legacy_Suites_Move_to_Vitest.md`
3. `TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
4. `TASK-105-11-04_QA_Docs_Changelog_and_Closure.md`

## Acceptance Criteria

1. Legacy Bun-free duplicate suites no longer stay in Bun because of old file placement.
2. Bun-only ownership remains explicit for runtime/plugin/perf/security/DB-coupled suites.
3. Remaining ambiguous clusters are documented as refactor-first instead of half-migrated.
4. Board/docs/changelog reflect the real runner split after each delivered slice.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted `vitest` for each migrated slice
- targeted `bun test` smoke where the remaining Bun lane under the touched directories still matters

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `tests/README.md`
- `_docs/_CHANGELOG/*.md`
