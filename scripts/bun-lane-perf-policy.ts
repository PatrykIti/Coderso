/**
 * Perf-lane serial policy and gate budgets (TASK-557-06-L02).
 *
 * OWNED by TASK-557-06-L02. The runner (TASK-557-05-L02) imports PERF_SERIAL,
 * PERF_BUDGETS, and PERF_QUIET_ENV; it does NOT redefine them.
 *
 * The perf bucket holds `tests/perf/*` — 5 files, 4 of which are wall-time p95
 * gates (admin-request-baseline 25ms, analyticsIngestion 25ms,
 * codersoPerformanceGate 300ms cached / 900ms cold / 150ms navigation,
 * post-editor-load 220ms; admin-prefetch-budget is request-count based). These
 * are invalidated by CPU contention, so they must run serially on a quiet
 * worker with NO other workers on the same host and no `--parallel` fan-out.
 * This module pins that policy; the runner enforces it.
 *
 * Budget ownership: the authoritative budgets live INSIDE each perf test file
 * (the gates assert them). `PERF_BUDGETS` below is documentation + policy
 * shape only; the runner never enforces per-file durations from a worker-level
 * report. `validatePerfBudgets` was intentionally NOT added: it was dead code
 * (it could never observe per-file durations from a worker-level report and
 * never pushed a violation).
 *
 * This module is pure (no CLI, no I/O, no DB) so it is importable by Vitest
 * for pure contract tests and by the runner.
 */
export const PERF_SERIAL = true; // never run perf files in parallel

export const PERF_BUDGETS: Record<string, number> = {
  "tests/perf/admin-request-baseline.test.ts": 25, // p95 wall ms
  "tests/perf/analyticsIngestion.test.ts": 25,
  "tests/perf/codersoPerformanceGate.test.ts": 300, // cached; 900 cold; 150 navigation
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
