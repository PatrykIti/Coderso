# TASK-557-06: DB-Free Lane and Perf-Lane Isolation
# FileName: TASK-557-06-DB-Free-Lane-And-Perf-Lane-Isolation.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-557-01 (manifest), TASK-557-05 (runner integration)
**Status:** ⏳ To Do
---
## Overview
The A bucket (222 DB-free files) needs no database at all and parallelizes
freely with `bun test --parallel=16` — the single cheapest win. The perf bucket
(5 files, 4 of which are wall-time p95 gates with 25/300/900/220ms budgets) is
CPU-contention-invalidated, so it must run serially on a quiet worker with no
other load. This subtask adds the pure-lane runner and the perf-lane policy,
both invoked from TASK-557-05-L02's `--lane all`.

## Sub-Tasks
- TASK-557-06-L01: Pure A-lane runner (--parallel=16, no DB)
- TASK-557-06-L02: Perf-lane serial policy and gates

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure-lane tests: A manifest is exactly the files run; no DB env leak into the
  child (assert `DATABASE_URL` absent/ignored); exit aggregation.
- Perf-lane tests: perf files run serially in a quiet worker; wall-time gates
  measured in isolation (no B/C workers on the same host).
- One full A-lane run recorded (file count, wall time).

## Documentation Updates Required
- `tests/README.md` — pure lane and perf-lane policy.
- `_docs/TESTING_STRATEGY.md` — perf gates are serial and CPU-isolated.
