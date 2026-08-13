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
  URL, `DATABASE_DIRECT_URL` kept as-is, `DB_POOL_MAX` = 2-4 (default 2, from
  `--pool` flag), `BUN_TEST_WORKER_INDEX`, and
  `BUN_TEST_FENCE_NAMESPACE_OFFSET` (for TASK-557-04).
- `workerSchemaName(workerIndex: number): string` = `bun_worker_${index}`.
- `assertDirectUrl(directUrl: string)` — fail-fast: parse with `inspectDatabaseUrl`
  (from `core/db/connectionTargets.ts`); throw `worker_direct_url_pooled` if
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
export const DEFAULT_WORKER_POOL_MAX = 2;
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
  const raw = requested ?? Number(env.DB_POOL_MAX ?? DEFAULT_WORKER_POOL_MAX);
  if (!Number.isInteger(raw) || raw < 1 || raw > MAX_WORKER_POOL_MAX) {
    throw new Error(`worker_pool_max_invalid:${raw}`);
  }
  return raw;
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
- `assertDirectUrl` accepts a 5432 URL and throws `worker_direct_url_pooled`
  for a 6432 URL.
- `resolveWorkerEnv` returns `DB_POOL_MAX` clamped to 2-4 and sets
  `BUN_TEST_WORKER_INDEX`.
- `describeWorkerTarget` contains no `u:p@` substring.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLaneWorkerUrl.test.ts` green (pure, no DB).
- Dry-run against `.env` prints `describeWorkerTarget` only.

## Documentation Updates Required
- `tests/README.md`: worker URL contract and pool budget.
