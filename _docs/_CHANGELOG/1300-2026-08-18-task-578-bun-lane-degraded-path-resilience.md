# 1300 - TASK-578 Bun Lane Degraded Path Resilience

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-578

## Key Changes

### Toolchain / Bun Lane
- `scripts/bun-lane-classify.ts` no longer emits `weightMs: 0` when the
  timings file is missing or corrupt (`safeRead()` returning `{}`): the
  classifier OMITS the field entirely (returns `{ file, bucket, conflictKeys,
  cWriteGlobal }` with no `weightMs`) so the partitioner can never treat an
  unknown weight as a valid pinned `0`.
- `scripts/bun-lane-partition.ts` is UNCHANGED: `weightMs(row, timings)`
  keeps `timings[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT[row.bucket]` so
  pinned `0` semantics are preserved for rows that genuinely declare `0`.
- Degraded-path regression tests cover missing and corrupt timings files,
  unknown weights, and the pinned-`0` distinction.

## Validation
- `bun --cwd core lint` + `lint:types` green; bun-lane classify/partition
  degraded-path tests green; existing lane partition contract tests stay
  green.
