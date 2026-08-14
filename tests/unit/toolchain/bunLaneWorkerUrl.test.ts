/**
 * Regression tests for the worker URL builder and env resolution
 * (TASK-557-02-L01, `scripts/bun-lane-worker-url.ts`).
 *
 * Pins the contract:
 *
 * - `buildWorkerDatabaseUrl` appends the URL-encoded `options=-csearch_path=`
 *   parameter with `?` or `&`, preserving existing query params.
 * - `assertDirectUrl` accepts a 5432 URL and throws `worker_direct_url_pooled`
 *   when the URL resolves to the pooler port (`pooledPort` passed explicitly;
 *   the real `inspectDatabaseUrl` signature requires the positional port).
 * - Ambient `DB_POOL_MAX=20` (the real `.env`) is clamped to
 *   `MAX_WORKER_POOL_MAX`, never inherited, never throws; explicit non-integer
 *   or <1 requested values throw `worker_pool_max_invalid`.
 * - `resolveWorkerEnv` sets `NODE_ENV=test`, `BUN_TEST_WORKER_INDEX`, keeps
 *   `DATABASE_DIRECT_URL` as-is, and sets `BUN_TEST_FENCE_NAMESPACE_OFFSET`
 *   only when `fenceOffset` is provided.
 * - `assertConnectionBudget` enforces workers x pool <= CONNECTION_BUDGET_MAX
 *   (10). Note the L01 contract bullet "(6, 2) passes" contradicts the
 *   pseudocode and the parent budget rule `workers x DB_POOL_MAX <= 10`
 *   (TASK-557-02): 6 x 2 = 12 > 10, so it throws. (8, 1) passes and (5, 2) is
 *   the exact boundary (10 <= 10).
 * - `resolveWorkerCount` defaults to 5 when `BUN_TEST_WORKERS` is absent or
 *   present-but-empty (contract: `raw === undefined || raw.trim() === ""` →
 *   5); non-integer, <1, and >16 values throw fail-closed
 *   `worker_count_invalid`.
 * - `describeWorkerTarget` is credential-free: `schema@host:port`, never a
 *   `u:p@` substring.
 *
 * Pure, Bun-free contract module: no DB, no runtime services.
 */
import { expect, test } from "bun:test";

import {
  MAX_WORKER_POOL_MAX,
  assertConnectionBudget,
  assertDirectUrl,
  buildWorkerDatabaseUrl,
  describeWorkerTarget,
  resolveWorkerCount,
  resolveWorkerEnv,
  resolveWorkerPoolMax,
  workerSchemaName,
} from "../../../scripts/bun-lane-worker-url";

const DIRECT_URL = "postgresql://u:p@host:5432/db";

test("workerSchemaName builds bun_worker_<index> and rejects invalid indexes", () => {
  expect(workerSchemaName(0)).toBe("bun_worker_0");
  expect(workerSchemaName(7)).toBe("bun_worker_7");
  expect(() => workerSchemaName(-1)).toThrow("worker_index_invalid");
  expect(() => workerSchemaName(1.5)).toThrow("worker_index_invalid");
  expect(() => workerSchemaName(Number.NaN)).toThrow("worker_index_invalid");
});

test("buildWorkerDatabaseUrl appends encoded options with ? when no query exists", () => {
  const url = buildWorkerDatabaseUrl(DIRECT_URL, 0);
  expect(url).toBe("postgresql://u:p@host:5432/db?options=-csearch_path%3Dbun_worker_0");
});

test("buildWorkerDatabaseUrl appends with & and preserves existing query params", () => {
  const url = buildWorkerDatabaseUrl("postgresql://u:p@host:5432/db?sslmode=require", 1);
  expect(url).toBe(
    "postgresql://u:p@host:5432/db?sslmode=require&options=-csearch_path%3Dbun_worker_1"
  );
});

test("assertDirectUrl accepts a 5432 direct URL when pooledPort is 6432", () => {
  expect(assertDirectUrl(DIRECT_URL, 6432)).toEqual({
    verified: true,
    port: 5432,
    pooled: false,
  });
});

test("assertDirectUrl throws worker_direct_url_pooled when the URL is on the pooler port", () => {
  expect(() => assertDirectUrl("postgresql://u:p@host:6432/db", 6432)).toThrow(
    "worker_direct_url_pooled"
  );
  expect(() => assertDirectUrl(DIRECT_URL, 5432)).toThrow("worker_direct_url_pooled");
});

test("assertDirectUrl throws worker_direct_url_unverifiable for unparsable URLs", () => {
  expect(() => assertDirectUrl("definitely not a url", 6432)).toThrow(
    "worker_direct_url_unverifiable"
  );
});

test("ambient DB_POOL_MAX=20 is clamped, never inherited, never throws", () => {
  expect(resolveWorkerPoolMax({ DB_POOL_MAX: "20" })).toBe(4);
  expect(resolveWorkerPoolMax({}, undefined)).toBe(2);
  expect(resolveWorkerPoolMax({}, 2)).toBe(2);
  expect(resolveWorkerPoolMax({ DB_POOL_MAX: "20" }, 4)).toBe(4);
  expect(() => resolveWorkerPoolMax({}, 0)).toThrow("worker_pool_max_invalid");
  expect(() => resolveWorkerPoolMax({}, 2.5)).toThrow("worker_pool_max_invalid");
});

test("resolveWorkerEnv clamps ambient DB_POOL_MAX=20 and never throws on it", () => {
  const workerEnv = resolveWorkerEnv(0, {}, { DB_POOL_MAX: "20", DATABASE_DIRECT_URL: DIRECT_URL });
  expect(Number(workerEnv.DB_POOL_MAX)).toBeLessThanOrEqual(MAX_WORKER_POOL_MAX);
  expect(Number(workerEnv.DB_POOL_MAX)).toBe(4);
});

test("resolveWorkerEnv sets NODE_ENV, index, keeps DATABASE_DIRECT_URL, builds DATABASE_URL", () => {
  const workerEnv = resolveWorkerEnv(3, {}, { DATABASE_DIRECT_URL: DIRECT_URL });
  expect(workerEnv.NODE_ENV).toBe("test");
  expect(workerEnv.BUN_TEST_WORKER_INDEX).toBe("3");
  expect(workerEnv.DATABASE_DIRECT_URL).toBe(DIRECT_URL);
  expect(workerEnv.DATABASE_URL).toBe(
    "postgresql://u:p@host:5432/db?options=-csearch_path%3Dbun_worker_3"
  );
  expect(workerEnv.BUN_TEST_FENCE_NAMESPACE_OFFSET).toBeUndefined();
});

test("resolveWorkerEnv sets BUN_TEST_FENCE_NAMESPACE_OFFSET only when fenceOffset is provided", () => {
  const workerEnv = resolveWorkerEnv(3, { fenceOffset: 2 }, { DATABASE_DIRECT_URL: DIRECT_URL });
  expect(workerEnv.BUN_TEST_FENCE_NAMESPACE_OFFSET).toBe("2");
  expect(workerEnv.NODE_ENV).toBe("test");
  expect(workerEnv.BUN_TEST_WORKER_INDEX).toBe("3");
});

test("resolveWorkerEnv throws worker_direct_url_missing without a direct URL", () => {
  expect(() => resolveWorkerEnv(0, {}, {})).toThrow("worker_direct_url_missing");
});

test("assertConnectionBudget enforces workers x pool <= 10", () => {
  expect(() => assertConnectionBudget(8, 1)).not.toThrow();
  expect(() => assertConnectionBudget(5, 2)).not.toThrow(); // exact boundary 10
  expect(() => assertConnectionBudget(8, 4)).toThrow("worker_pool_budget_exceeded");
  // 6 x 2 = 12 > 10; the L01 "(6, 2) passes" bullet contradicts the pseudocode
  // and the parent `workers x pool <= 10` rule, so it must throw.
  expect(() => assertConnectionBudget(6, 2)).toThrow("worker_pool_budget_exceeded");
});

test("resolveWorkerCount defaults to 5 when BUN_TEST_WORKERS is absent", () => {
  expect(resolveWorkerCount({})).toBe(5);
});

test("resolveWorkerCount honors a valid BUN_TEST_WORKERS", () => {
  expect(resolveWorkerCount({ BUN_TEST_WORKERS: "4" })).toBe(4);
  expect(resolveWorkerCount({ BUN_TEST_WORKERS: "16" })).toBe(16);
});

test("resolveWorkerCount throws worker_count_invalid for invalid values", () => {
  expect(() => resolveWorkerCount({ BUN_TEST_WORKERS: "0" })).toThrow("worker_count_invalid");
  expect(() => resolveWorkerCount({ BUN_TEST_WORKERS: "abc" })).toThrow("worker_count_invalid");
  expect(() => resolveWorkerCount({ BUN_TEST_WORKERS: "20" })).toThrow("worker_count_invalid");
  expect(() => resolveWorkerCount({ BUN_TEST_WORKERS: "4.5" })).toThrow("worker_count_invalid");
});

test("resolveWorkerCount defaults to 5 for absent or empty BUN_TEST_WORKERS", () => {
  expect(resolveWorkerCount({})).toBe(5);
  expect(resolveWorkerCount({ BUN_TEST_WORKERS: "" })).toBe(5);
  expect(resolveWorkerCount({ BUN_TEST_WORKERS: " " })).toBe(5);
});

test("describeWorkerTarget is credential-free schema@host:port", () => {
  const target = describeWorkerTarget(0, DIRECT_URL);
  expect(target).toBe("bun_worker_0@host:5432");
  expect(target).not.toContain("u:p@");
  expect(describeWorkerTarget(0, "postgresql://u:p@host/db")).toBe("bun_worker_0@host:5432");
});
