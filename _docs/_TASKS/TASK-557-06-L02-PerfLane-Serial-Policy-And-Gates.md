# TASK-557-06-L02: Perf-Lane Serial Policy and Gates
# FileName: TASK-557-06-L02-PerfLane-Serial-Policy-And-Gates.md
**Parent Subtask:** TASK-557-06
**Priority:** Medium
**Category:** Testing / Performance
**Estimated Effort:** Small
**Dependencies:** TASK-557-01-L01 (perf bucket), TASK-557-06-L01 (policy file consumed by the runner 05-L02; no dependency on 05 itself)
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
The perf bucket holds `tests/perf/*` — 5 files, 4 of which are wall-time p95
gates (admin-request-baseline 25ms, analyticsIngestion 25ms, codersoPerformanceGate
300ms cached / 900ms cold / 150ms navigation, post-editor-load 220ms;
admin-prefetch-budget is request-count based). These are invalidated by CPU
contention, so they must run serially on a quiet worker with NO other workers
on the same host and no `--parallel` fan-out. This leaf pins that policy in the
runner and documents the gate contract.

Budget ownership: the authoritative budgets live INSIDE each perf test file
(the gates assert them). `PERF_BUDGETS` below is documentation + policy shape
only; the runner never enforces per-file durations from a worker-level report.

## Implementation Pseudocode
```ts
// scripts/bun-lane-perf-policy.ts
// OWNED by TASK-557-06-L02. The runner (TASK-557-05-L02) imports PERF_SERIAL,
// PERF_BUDGETS, and PERF_QUIET_ENV; it does NOT redefine them.
export const PERF_SERIAL = true;          // never run perf files in parallel
export const PERF_BUDGETS: Record<string, number> = {
  "tests/perf/admin-request-baseline.test.ts": 25,   // p95 wall ms
  "tests/perf/analyticsIngestion.test.ts": 25,
  "tests/perf/codersoPerformanceGate.test.ts": 300,  // cached; 900 cold; 150 navigation
  "tests/perf/post-editor-load.test.tsx": 220,
};

// ADDITIVE overlay on resolveWorkerEnv (base env must be preserved: the perf
// lane still needs DATABASE_URL for DB-backed gates like analyticsIngestion).
export const PERF_QUIET_ENV: Record<string, string> = {
  UV_THREADPOOL_SIZE: "4",
  BUN_TEST_PERF_QUIET: "1",
};

export function assertQuietPerfWorker(workerName: string): void {
  if (workerName !== "perf") throw new Error(`perf_lane_worker_misassigned:${workerName}`);
}
```

Runner change (TASK-557-05-L02): the perf worker is spawned with
`{ ...resolveWorkerEnv(perfIndex, { poolMax, fenceOffset }), ...PERF_QUIET_ENV }`
— an ADDITIVE overlay, never a replacement (the perf lane still needs
`DATABASE_URL`/`DATABASE_DIRECT_URL`/`NODE_ENV` from the base resolver;
`analyticsIngestion` is a DB-backed gate). `--lane perf` runs ONLY the perf
worker; `--lane all` schedules perf AFTER B/C workers finish (never
concurrently). The wall-time gates remain authoritative inside their test
files (no budget change in this task).

Error handling: assigning perf files to a non-perf worker throws
`perf_lane_worker_misassigned`; `--lane perf --workers >1` is rejected
(`perf_lane_parallel_invalid`).

Regression-test shape (`tests/unit/toolchain/bunLanePerfPolicy.test.ts`):
- `assertQuietPerfWorker("perf")` passes; `("b0")` throws.
- `--lane perf --workers 8` is rejected by the runner (`perf_lane_parallel_invalid`).
- `PERF_BUDGETS` has exactly the 4 documented p95 values
  (admin-request-baseline 25, analyticsIngestion 25, codersoPerformanceGate 300,
  post-editor-load 220) and no entry is undefined or zero.
- `PERF_QUIET_ENV` is a strict subset overlay: merging it over
  `resolveWorkerEnv(0)` preserves `DATABASE_URL`, `DATABASE_DIRECT_URL`, and
  `NODE_ENV=test` (additive, never replace).
- `validatePerfBudgets` was REMOVED (dead code: it could never observe
  per-file durations from a worker-level report and never pushed a violation).
- Dry-run `--lane all` shows perf after B/C (ordering assertion, owned by the
  runner integration test in TASK-557-05-L03).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure policy tests green; a real `--lane perf` run on a quiet host recorded
  with the five file timings (assert the 4 p95 gates pass in isolation).
- Do NOT weaken any perf gate budget; only isolate.

## Documentation Updates Required
- `tests/README.md` — perf lane serial + quiet-worker contract.
- `_docs/TESTING_STRATEGY.md` — perf gates are host-isolated.
