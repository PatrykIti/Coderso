/**
 * Regression tests for the perf-lane serial policy and gate budgets
 * (TASK-557-06-L02, `scripts/bun-lane-perf-policy.ts`).
 *
 * Pins the contract:
 *
 * - `PERF_SERIAL` is true: perf files never run in parallel.
 * - `PERF_BUDGETS` has exactly the 4 documented p95 wall-time values
 *   (admin-request-baseline 25, analyticsIngestion 25, codersoPerformanceGate
 *   300, post-editor-load 220) and no entry is undefined or zero.
 * - `PERF_QUIET_ENV` is an ADDITIVE overlay on `resolveWorkerEnv`: merging it
 *   over the worker env preserves `DATABASE_URL`, `DATABASE_DIRECT_URL`, and
 *   `NODE_ENV=test` (the perf lane still needs `DATABASE_URL` for DB-backed
 *   gates like analyticsIngestion) and never drops a base key.
 * - `assertQuietPerfWorker("perf")` passes and any other worker name throws
 *   `perf_lane_worker_misassigned:<name>`.
 * - `validatePerfBudgets` was REMOVED as dead code (it could never observe
 *   per-file durations from a worker-level report); it must not exist.
 *
 * `resolveWorkerEnv` (TASK-557-02-L01) is called with an explicit base env so
 * this test is hermetic and does not depend on `.env` being sourced; the
 * merged result is identical to the contract's `resolveWorkerEnv(0, {poolMax,
 * fenceOffset})` shape because the third parameter defaults to `process.env`.
 *
 * Pure, Bun-free contract module: no DB, no runtime services.
 */
import { expect, test } from "bun:test";

import {
  PERF_BUDGETS,
  PERF_QUIET_ENV,
  PERF_SERIAL,
  assertQuietPerfWorker,
} from "../../../scripts/bun-lane-perf-policy";
import * as perfPolicy from "../../../scripts/bun-lane-perf-policy";
import { resolveWorkerEnv } from "../../../scripts/bun-lane-worker-url";

const DIRECT_URL = "postgresql://u:p@host:5432/db";

test("PERF_SERIAL is true: perf files never run in parallel", () => {
  expect(PERF_SERIAL).toBe(true);
});

test("PERF_BUDGETS has exactly the 4 documented p95 wall-time values", () => {
  expect(PERF_BUDGETS).toEqual({
    "tests/perf/admin-request-baseline.test.ts": 25,
    "tests/perf/analyticsIngestion.test.ts": 25,
    "tests/perf/codersoPerformanceGate.test.ts": 300,
    "tests/perf/post-editor-load.test.tsx": 220,
  });
});

test("PERF_BUDGETS has no undefined or zero entries", () => {
  const keys = Object.keys(PERF_BUDGETS);
  expect(keys.length).toBe(4);
  for (const key of keys) {
    const value = PERF_BUDGETS[key];
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  }
});

test("assertQuietPerfWorker accepts perf and rejects every other worker name", () => {
  expect(() => assertQuietPerfWorker("perf")).not.toThrow();
  expect(() => assertQuietPerfWorker("b0")).toThrow("perf_lane_worker_misassigned:b0");
  expect(() => assertQuietPerfWorker("c0")).toThrow("perf_lane_worker_misassigned:c0");
});

test("validatePerfBudgets was removed as dead code", () => {
  expect((perfPolicy as Record<string, unknown>).validatePerfBudgets).toBeUndefined();
});

test("PERF_QUIET_ENV is an additive overlay that preserves the worker env", () => {
  const workerEnv = resolveWorkerEnv(0, { poolMax: 1, fenceOffset: 1 }, {
    DATABASE_DIRECT_URL: DIRECT_URL,
  });
  const merged = { ...workerEnv, ...PERF_QUIET_ENV };

  // Base worker env must be preserved, never replaced.
  expect(merged.DATABASE_URL).toBe(workerEnv.DATABASE_URL);
  expect(merged.DATABASE_DIRECT_URL).toBe(workerEnv.DATABASE_DIRECT_URL);
  expect(merged.NODE_ENV).toBe("test");
  expect(merged.BUN_TEST_WORKER_INDEX).toBe("0");
  expect(merged.BUN_TEST_FENCE_NAMESPACE_OFFSET).toBe("1");

  // Quiet overlay is applied on top.
  expect(merged.UV_THREADPOOL_SIZE).toBe("4");
  expect(merged.BUN_TEST_PERF_QUIET).toBe("1");

  // Strict subset: no base key is dropped or overwritten by the overlay.
  for (const key of Object.keys(workerEnv)) {
    expect(merged[key]).toBe(workerEnv[key]);
  }
  for (const key of Object.keys(PERF_QUIET_ENV)) {
    expect(merged[key]).toBe(PERF_QUIET_ENV[key]);
  }
});
