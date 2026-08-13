/**
 * Worker database URL builder and env resolution (TASK-557-02-L01).
 *
 * Pure helpers for the parallel Bun test lane (TASK-557-05 runner):
 *
 * - `buildWorkerDatabaseUrl` appends `options=-csearch_path=bun_worker_<i>`
 *   (URL-encoded) to the direct 5432 URL, so each spawned worker session runs
 *   against its own schema without touching the shared `public` schema.
 * - `assertDirectUrl` reuses `inspectDatabaseUrl` from
 *   `core/db/connectionTargets.ts` to fail fast when the direct URL is
 *   unverifiable or actually points at the PgBouncer pooler port. The real
 *   signature is `inspectDatabaseUrl(url, pooledPort, env?)` with `pooledPort`
 *   REQUIRED positional; callers must never omit it.
 * - `resolveWorkerPoolMax` clamps the per-worker pool to [1,
 *   MAX_WORKER_POOL_MAX] and NEVER throws on a too-high ambient `DB_POOL_MAX`
 *   (the real `.env` sets 20 for the pooled default client; workers must not
 *   inherit it). Only an explicit non-integer or <1 requested value throws
 *   `worker_pool_max_invalid`. The runner's aggregate check
 *   (`workers x pool <= CONNECTION_BUDGET_MAX = 10`, the Render direct-connect
 *   reserve) enforces the budget.
 * - `resolveWorkerCount` reads `BUN_TEST_WORKERS` (default 8). A present-but-
 *   empty value is a misconfiguration and throws fail-closed
 *   `worker_count_invalid`; absent means "use the default".
 * - `resolveWorkerEnv` returns the full env object for a spawned worker:
 *   `DATABASE_URL` = worker URL, `DATABASE_DIRECT_URL` kept as-is,
 *   `DB_POOL_MAX` = clamped pool, `BUN_TEST_WORKER_INDEX`, `NODE_ENV=test`,
 *   and `BUN_TEST_FENCE_NAMESPACE_OFFSET` when `fenceOffset` is provided
 *   (consumed by TASK-557-04's `resolveFenceNamespace`, which only honors the
 *   offset when `NODE_ENV === "test"`; `bun test` does not set `NODE_ENV`).
 * - `describeWorkerTarget` is the ONLY credential-free log shape
 *   (`schema@host:port`); nothing in this module ever prints or logs the URL.
 *
 * Importing this module opens no connection and touches no runtime services:
 * `connectionTargets.ts` is a pure parsing module (it imports only
 * `driverEndpoints.ts`, which imports the `postgres` driver package without
 * dialing). It is importable by Vitest for pure contract tests and by the
 * runner.
 */
import { inspectDatabaseUrl, type DatabaseEnvMap } from "../core/db/connectionTargets";

export const WORKER_SCHEMA_PREFIX = "bun_worker_";
export const DEFAULT_WORKER_POOL_MAX = 1;
export const MAX_WORKER_POOL_MAX = 4;

/** Render reserves ~10 direct connections (max_connections - 10 backend pool). */
export const CONNECTION_BUDGET_MAX = 10;

/** `bun_worker_${index}`; rejects non-integer or negative indexes. */
export function workerSchemaName(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`worker_index_invalid:${index}`);
  }
  return `${WORKER_SCHEMA_PREFIX}${index}`;
}

/**
 * Direct URL plus `options=-csearch_path=bun_worker_<index>` (URL-encoded),
 * appended with `?` or `&` depending on whether the URL already has a query.
 * All existing parameters are preserved.
 */
export function buildWorkerDatabaseUrl(directUrl: string, workerIndex: number): string {
  const schema = workerSchemaName(workerIndex);
  const option = `-csearch_path=${schema}`;
  const separator = directUrl.includes("?") ? "&" : "?";
  return `${directUrl}${separator}options=${encodeURIComponent(option)}`;
}

/**
 * Fail-fast guard for the direct (non-pooled) URL, reusing the driver-aware
 * `inspectDatabaseUrl` instead of duplicating port logic. Throws
 * `worker_direct_url_unverifiable` when the endpoint cannot be read, and
 * `worker_direct_url_pooled` when it resolves to the PgBouncer pooler port
 * (session-level state such as advisory locks and search_path would leak
 * across pooler backends).
 */
export function assertDirectUrl(
  directUrl: string,
  pooledPort: number
): { verified: true; port: number; pooled: boolean } {
  const inspection = inspectDatabaseUrl(directUrl, pooledPort);
  if (!inspection.verified) {
    throw new Error(`worker_direct_url_unverifiable: ${inspection.reason}`);
  }
  if (inspection.pooled) {
    throw new Error(
      `worker_direct_url_pooled: DATABASE_DIRECT_URL must point at the direct port, not the transaction pooler`
    );
  }
  return { verified: true, port: inspection.port as number, pooled: false };
}

/**
 * Per-worker pool max, clamped to [1, MAX_WORKER_POOL_MAX]. The ambient
 * `DB_POOL_MAX` (20 in the real `.env`, for the pooled default client) is
 * clamped, never inherited and never throws; only an explicit non-integer or
 * <1 requested value throws `worker_pool_max_invalid`. The runner's
 * connection-budget check (workers x pool <= 10) enforces the aggregate.
 */
export function resolveWorkerPoolMax(
  env: DatabaseEnvMap = process.env,
  requested?: number
): number {
  const raw = requested ?? Number(env.DB_POOL_MAX ?? DEFAULT_WORKER_POOL_MAX);
  if (!Number.isInteger(raw) || raw < 1) {
    throw new Error(`worker_pool_max_invalid:${raw}`);
  }
  return Math.min(raw, MAX_WORKER_POOL_MAX);
}

/**
 * Aggregate direct-connection budget: `workers x pool` must stay within
 * CONNECTION_BUDGET_MAX (the Render direct-connect reserve). Throws
 * `worker_pool_budget_exceeded` otherwise, before any worker is spawned.
 */
export function assertConnectionBudget(workers: number, poolMax: number): void {
  if (workers * poolMax > CONNECTION_BUDGET_MAX) {
    throw new Error(`worker_pool_budget_exceeded:${workers}x${poolMax}>${CONNECTION_BUDGET_MAX}`);
  }
}

/**
 * Worker count from `BUN_TEST_WORKERS`, default 8. Absent or present-but-empty
 * means the default (contract: `raw === undefined || raw.trim() === ""` →
 * 8); non-integer, <1, and >16 values throw fail-closed
 * `worker_count_invalid`.
 */
export function resolveWorkerCount(env: DatabaseEnvMap = process.env): number {
  const raw = env.BUN_TEST_WORKERS;
  if (raw === undefined || raw.trim() === "") return 8; // default K=8
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 16) {
    throw new Error(`worker_count_invalid:${raw}`);
  }
  return count;
}

/**
 * Full env object for a spawned worker: `DATABASE_URL` = worker URL,
 * `DATABASE_DIRECT_URL` kept as-is, `DB_POOL_MAX` = clamped pool max,
 * `BUN_TEST_WORKER_INDEX`, `NODE_ENV=test`, and
 * `BUN_TEST_FENCE_NAMESPACE_OFFSET` when `fenceOffset` is provided.
 */
export function resolveWorkerEnv(
  workerIndex: number,
  opts: { directUrl?: string; poolMax?: number; fenceOffset?: number } = {},
  baseEnv: DatabaseEnvMap = process.env
): Record<string, string> {
  const directUrl = opts.directUrl ?? baseEnv.DATABASE_DIRECT_URL;
  if (!directUrl) throw new Error("worker_direct_url_missing");
  assertDirectUrl(directUrl, Number(baseEnv.DATABASE_POOLED_PORT ?? 6432));
  const poolMax = resolveWorkerPoolMax(baseEnv, opts.poolMax);
  return {
    ...(baseEnv as Record<string, string>),
    NODE_ENV: "test",
    DATABASE_URL: buildWorkerDatabaseUrl(directUrl, workerIndex),
    DATABASE_DIRECT_URL: directUrl,
    DB_POOL_MAX: String(poolMax),
    BUN_TEST_WORKER_INDEX: String(workerIndex),
    ...(opts.fenceOffset !== undefined
      ? { BUN_TEST_FENCE_NAMESPACE_OFFSET: String(opts.fenceOffset) }
      : {}),
  };
}

/**
 * Credential-free log line for a worker target: `schema@host:port` only.
 * Never renders userinfo; this is the only shape anything in the lane may log
 * for a target.
 */
export function describeWorkerTarget(workerIndex: number, directUrl: string): string {
  const parsed = new URL(directUrl);
  return `${workerSchemaName(workerIndex)}@${parsed.hostname}:${parsed.port || 5432}`;
}
