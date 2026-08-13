# TASK-557-02-L01: Worker URL Builder and Env Resolution
# FileName: TASK-557-02-L01-Worker-URL-Builder-And-Env-Resolution.md
**Parent Subtask:** TASK-557-02
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
---
## Overview
Build `scripts/bun-lane-worker-url.ts` exposing pure helpers:
- `buildWorkerDatabaseUrl(directUrl: string, workerIndex: number): string` —
  appends `?options=-csearch_path=bun_worker_<index>` (or `&` if the URL
  already has a query), preserving all existing params.
- `resolveWorkerEnv(workerIndex: number, overrides?: Record<string,string>)` —
  returns the full env object for a spawned worker: `DATABASE_URL` = worker
  URL, `DATABASE_DIRECT_URL` kept as-is, `DB_POOL_MAX` = 1-4 (default 1, from
  `--pool` flag, clamped to `MAX_WORKER_POOL_MAX`), `BUN_TEST_WORKER_INDEX`,
  `NODE_ENV=test`, and
  `BUN_TEST_FENCE_NAMESPACE_OFFSET` (for TASK-557-04). `NODE_ENV=test` is
  mandatory: `resolveFenceNamespace` (TASK-557-04) only honors the offset when
  `NODE_ENV === "test"`, and `bun test` does NOT set `NODE_ENV` by default
  (verified at runtime).
- `workerSchemaName(workerIndex: number): string` = `bun_worker_${index}`.
- `assertDirectUrl(directUrl: string, pooledPort: number)` — fail-fast: parse
  with `inspectDatabaseUrl`
  (from `core/db/connectionTargets.ts`). The REAL signature is
  `inspectDatabaseUrl(url: string, pooledPort: number, env?: DatabaseEnvMap)` —
  `pooledPort` is a REQUIRED positional argument (the Render direct pool port
  to compare against), not optional, and the env map defaults to
  `process.env`; call it with `inspectDatabaseUrl(directUrl, pooledPort)` and
  never omit the port. Throw `worker_direct_url_pooled` if
  `inspection.pooled` is true (port 6432), throw `worker_direct_url_unverifiable`
  if not verified. Reuse the existing guard — do not duplicate port logic.

The builder lives in `scripts/` (Bun-free, importable by Vitest for pure
contract tests and by the runner). It must NEVER print or log credentials: all
log lines render `describeWorkerTarget` (schema name + port only).

## Implementation Pseudocode
```ts
// scripts/bun-lane-worker-url.ts
import { inspectDatabaseUrl, resolveDatabasePoolMax, resolveDefaultDatabaseTarget } from "../core/db/connectionTargets";

export const WORKER_SCHEMA_PREFIX = "bun_worker_";
export const DEFAULT_WORKER_POOL_MAX = 1;
export const MAX_WORKER_POOL_MAX = 4;

export function workerSchemaName(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new Error(`worker_index_invalid:${index}`);
  return `${WORKER_SCHEMA_PREFIX}${index}`;
}

export function buildWorkerDatabaseUrl(directUrl: string, workerIndex: number): string {
  const schema = workerSchemaName(workerIndex);
  const option = `-csearch_path=${schema}`;
  const separator = directUrl.includes("?") ? "&" : "?";
  return `${directUrl}${separator}options=${encodeURIComponent(option)}`;
}

export function assertDirectUrl(directUrl: string, pooledPort: number): { verified: true; port: number; pooled: boolean } {
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

export function resolveWorkerPoolMax(env: Record<string, string | undefined> = process.env as never, requested?: number): number {
  // Clamp, never throw on a too-high ambient value: the real `.env` sets
  // DB_POOL_MAX=20 for the pooled default client, and workers must NOT inherit
  // it. An explicit `--pool` is honored up to MAX_WORKER_POOL_MAX; the ambient
  // value is always clamped to [1, MAX_WORKER_POOL_MAX]. The runner's
  // connection-budget check (workers x pool <= 10) enforces the aggregate.
  const raw = requested ?? Number(env.DB_POOL_MAX ?? DEFAULT_WORKER_POOL_MAX);
  if (!Number.isInteger(raw) || raw < 1) {
    throw new Error(`worker_pool_max_invalid:${raw}`);
  }
  return Math.min(raw, MAX_WORKER_POOL_MAX);
}

// Render reserves ~10 direct connections (max_connections - 10 backend pool).
export const CONNECTION_BUDGET_MAX = 10;

export function assertConnectionBudget(workers: number, poolMax: number): void {
  if (workers * poolMax > CONNECTION_BUDGET_MAX) {
    throw new Error(`worker_pool_budget_exceeded:${workers}x${poolMax}>${CONNECTION_BUDGET_MAX}`);
  }
}

export function resolveWorkerCount(env: Record<string, string | undefined> = process.env as never): number {
  const raw = env.BUN_TEST_WORKERS;
  if (raw === undefined || raw.trim() === "") return 8; // default K=8
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 16) {
    throw new Error(`worker_count_invalid:${raw}`);
  }
  return count;
}

export function resolveWorkerEnv(
  workerIndex: number,
  opts: { directUrl?: string; poolMax?: number; fenceOffset?: number } = {},
  baseEnv: Record<string, string | undefined> = process.env as never
): Record<string, string> {
  const directUrl = opts.directUrl ?? (baseEnv.DATABASE_DIRECT_URL as string);
  if (!directUrl) throw new Error("worker_direct_url_missing");
  assertDirectUrl(directUrl, Number(baseEnv.DATABASE_POOLED_PORT ?? 6432));
  const schema = workerSchemaName(workerIndex);
  const poolMax = resolveWorkerPoolMax(baseEnv, opts.poolMax);
  return {
    ...baseEnv,
    NODE_ENV: "test",
    DATABASE_URL: buildWorkerDatabaseUrl(directUrl, workerIndex),
    DATABASE_DIRECT_URL: directUrl,
    DB_POOL_MAX: String(poolMax),
    BUN_TEST_WORKER_INDEX: String(workerIndex),
    ...(opts.fenceOffset !== undefined ? { BUN_TEST_FENCE_NAMESPACE_OFFSET: String(opts.fenceOffset) } : {}),
  };
}

export function describeWorkerTarget(workerIndex: number, directUrl: string): string {
  // credential-free log line: schema + parsed port only
  const parsed = new URL(directUrl);
  return `${workerSchemaName(workerIndex)}@${parsed.hostname}:${parsed.port || 5432}`;
}
```

Error handling: all failures throw named machine-readable errors
(`worker_index_invalid`, `worker_direct_url_missing`,
`worker_direct_url_unverifiable`, `worker_direct_url_pooled`,
`worker_pool_max_invalid`); the runner maps them to a single `mapWorkerEnvError`
helper and aborts before spawning any worker. Do not print the URL with
credentials anywhere.

Regression-test shape (`tests/unit/toolchain/bunLaneWorkerUrl.test.ts`):
- `buildWorkerDatabaseUrl("postgresql://u:p@host:5432/db", 0)` ends with
  `?options=-csearch_path=bun_worker_0` (encoded); `&options=...` when the URL
  already has `?sslmode=require`.
- `assertDirectUrl(url, 6432)` accepts a 5432 URL and throws `worker_direct_url_pooled`
  for a 6432 URL (pooledPort passed explicitly).
- `resolveWorkerEnv(0, {}, { DB_POOL_MAX: "20" })` with ambient `DB_POOL_MAX=20`
  and no `opts.poolMax` does NOT throw and yields `DB_POOL_MAX <= MAX_WORKER_POOL_MAX`
  (clamp regression: the real `.env` has DB_POOL_MAX=20).
- `resolveWorkerEnv` sets `NODE_ENV=test` and `BUN_TEST_WORKER_INDEX`; with
  `fenceOffset` set it also sets `BUN_TEST_FENCE_NAMESPACE_OFFSET`.
- `assertConnectionBudget(8, 1)` passes; `(8, 4)` throws
  `worker_pool_budget_exceeded`; `(6, 2)` passes.
- `resolveWorkerCount({})` == 8; `({ BUN_TEST_WORKERS: "4" })` == 4;
  `({ BUN_TEST_WORKERS: "0" })` / `"abc"` / `"20"` throw `worker_count_invalid`.
- `describeWorkerTarget` contains no `u:p@` substring.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLaneWorkerUrl.test.ts` green (pure, no DB).
- Dry-run against `.env` prints `describeWorkerTarget` only.

## Documentation Updates Required
- `tests/README.md`: worker URL contract and pool budget.
