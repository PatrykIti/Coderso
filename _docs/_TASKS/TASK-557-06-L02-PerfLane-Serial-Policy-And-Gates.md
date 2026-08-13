# TASK-557-06-L02: Perf-Lane Serial Policy and Gates
# FileName: TASK-557-06-L02-PerfLane-Serial-Policy-And-Gates.md
**Parent Subtask:** TASK-557-06
**Priority:** Medium
**Category:** Testing / Performance
**Estimated Effort:** Small
**Dependencies:** TASK-557-01-L01 (perf bucket), TASK-557-05-L02 (dedicated perf worker)
**Status:** ⏳ To Do
---
## Overview
The perf bucket holds `tests/perf/*` — 4 of 5 files are wall-time p95 gates
(admin-request-baseline 300ms, analyticsIngestion 900ms, codersoPerformanceGate
25ms, post-editor-load 220ms; admin-prefetch-budget is request-count based).
These are invalidated by CPU contention, so they must run serially on a quiet
worker with NO other workers on the same host and no `--parallel` fan-out.
This leaf pins that policy in the runner and documents the gate contract.

## Implementation Pseudocode
```ts
// scripts/bun-lane-perf-policy.ts
export const PERF_SERIAL = true;          // never run perf files in parallel
export const PERF_BUDGETS: Record<string, number> = {
  "tests/perf/admin-request-baseline.test.ts": 300,   // p95 wall ms
  "tests/perf/analyticsIngestion.test.ts": 900,
  "tests/perf/codersoPerformanceGate.test.ts": 25,
  "tests/perf/post-editor-load.test.tsx": 220,
};

export function assertQuietPerfWorker(workerName: string): void {
  if (workerName !== "perf") throw new Error(`perf_lane_worker_misassigned:${workerName}`);
}

export function validatePerfBudgets(report: Array<{ name: string; files: string[]; durationMs: number }>): Array<{ file: string; budgetMs: number; actualMs: number }> {
  const violations: Array<{ file: string; budgetMs: number; actualMs: number }> = [];
  for (const w of report) {
    for (const file of w.files) {
      const budget = PERF_BUDGETS[file];
      if (budget === undefined) continue;
      // Per-file duration is not available from a worker-level report; the
      // perf files emit their own timings. This helper validates the policy
      // shape only; the gates themselves assert their budgets inside the tests.
    }
  }
  return violations;
}
```

Runner change (TASK-557-05-L02): the perf worker is spawned with
`{ env: quietEnv }` where `quietEnv` sets `UV_THREADPOOL_SIZE=4` and nothing
else changes; `--lane perf` runs ONLY the perf worker; `--lane all` schedules
perf after B/C workers finish (never concurrently). The wall-time gates remain
authoritative inside their test files (no budget change in this task).

Error handling: assigning perf files to a non-perf worker throws
`perf_lane_worker_misassigned`; `--lane perf --workers >1` is rejected
(`perf_lane_parallel_invalid`).

Regression-test shape:
- `assertQuietPerfWorker("perf")` passes; `("b0")` throws.
- `--lane perf --workers 8` is rejected.
- Dry-run `--lane all` shows perf after B/C (ordering assertion).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure policy tests green; a real `--lane perf` run on a quiet host recorded
  with the five file timings (assert the 4 p95 gates pass in isolation).
- Do NOT weaken any perf gate budget; only isolate.

## Documentation Updates Required
- `tests/README.md` — perf lane serial + quiet-worker contract.
- `_docs/TESTING_STRATEGY.md` — perf gates are host-isolated.
