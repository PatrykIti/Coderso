# TASK-557-05: Weighted Parallel Runner
# FileName: TASK-557-05-Weighted-Parallel-Runner.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Tooling / Developer Experience
**Estimated Effort:** Large
**Dependencies:** TASK-557-01 (manifest+timings), TASK-557-02 (worker env), TASK-557-03 (provisioning), TASK-557-04 (fence), TASK-557-07 (hygiene)
**Status:** ⏳ To Do
---
## Overview
`scripts/run-bun-parallel.ts` is the new entry point that replaces
`bun test --parallel=1 ...` for the full lane while keeping `bun run test:bun`
working (it delegates to the new runner). It partitions the manifest file set
into worker buckets by conflict class and measured weight, provisions worker
schemas, spawns `K` worker processes each with its own `DATABASE_URL` +
fence offset, aggregates exit codes, retries flakes once, and writes a machine
readable report. Safety invariants:
- C files never share a worker with each other (each C file gets its own
  worker OR all C files run serially on one dedicated worker in manifest
  order); the default is one dedicated serial C worker.
- B files are weighted (longest-first) across `K-2` workers.
- A files are handled by TASK-557-06's pure lane, not here.
- Perf files run on their own dedicated worker (TASK-557-06-L02).
- `--dry-run` prints the partition + projected sums without spawning.

## Sub-Tasks
- TASK-557-05-L01: Weighted partitioner
- TASK-557-05-L02: Worker orchestration and aggregation
- TASK-557-05-L03: Runner tests and dry-run

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Partitioner unit tests: deterministic assignment, C isolation, weighted
  balance within a tolerance, no file lost/duplicated.
- Orchestration tests (dry-run + fake worker): exit-code aggregation, retry
  once on flake, non-zero exit on any worker failure.
- One real full-lane run against direct 5432 recorded in the changelog with
  total wall time and per-worker durations.

## Documentation Updates Required
- `tests/README.md` — new runner surface and flags.
- `_docs/TESTING_STRATEGY.md` — parallel lane architecture.
- `_docs/_CHANGELOG/1271-*` — final measured times.
