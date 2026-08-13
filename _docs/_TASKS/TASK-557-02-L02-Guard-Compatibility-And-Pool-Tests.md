# TASK-557-02-L02: Guard-Compatibility and Pool Tests
# FileName: TASK-557-02-L02-Guard-Compatibility-And-Pool-Tests.md
**Parent Subtask:** TASK-557-02
**Priority:** Medium
**Category:** Testing / Database
**Estimated Effort:** Small
**Dependencies:** TASK-557-02-L01 (builder exists)
**Status:** ⏳ To Do
---
## Overview
Prove the worker URL builder is compatible with the repository's fail-closed
driver-endpoint guard and with postgres.js startup-parameter forwarding, and
that the per-worker pool budget fits Render's direct-connection reserve. No
production code changes; this leaf extends the existing driver-endpoint lane
(`tests/unit/db/*` or wherever `driverEndpoints` tests live) with the
`?options=-csearch_path=` case.

## Implementation Pseudocode
```ts
// extend tests/unit/db/driverEndpoints.test.ts (or the lane that owns it)
import { inspectDatabaseUrl } from "../../../core/db/connectionTargets";
import { buildWorkerDatabaseUrl, workerSchemaName } from "../../../scripts/bun-lane-worker-url";

const DIRECT_URL = "postgresql://u:p@db.example.com:5432/coderso?sslmode=require";
const POOLED_URL = "postgresql://u:p@db.example.com:6432/coderso?sslmode=require";

test("worker URL with search_path option still resolves as direct, non-pooled", () => {
  const url = buildWorkerDatabaseUrl(DIRECT_URL, 3);
  const inspection = inspectDatabaseUrl(url, 6432);
  expect(inspection.verified).toBe(true);
  expect(inspection.port).toBe(5432);
  expect(inspection.pooled).toBe(false);
});

test("pooled URL is rejected by assertDirectUrl", () => {
  const url = buildWorkerDatabaseUrl(POOLED_URL, 0);
  const inspection = inspectDatabaseUrl(url, 6432);
  expect(inspection.port).toBe(6432);
  expect(inspection.pooled).toBe(true);
});

test("worker schema names are stable and bounded", () => {
  expect(workerSchemaName(0)).toBe("bun_worker_0");
  expect(workerSchemaName(9)).toBe("bun_worker_9");
  expect(() => workerSchemaName(-1)).toThrow();
});

test("postgres.js forwards options.connection to the StartupMessage (integration, direct DB)", async () => {
  // Requires DATABASE_DIRECT_URL; skips cleanly when absent.
  const url = buildWorkerDatabaseUrl(process.env.DATABASE_DIRECT_URL!, 99);
  const sql = postgres(url, { max: 1 });
  const rows = await sql`select current_schema() as s`;
  expect(rows[0].s).toBe("bun_worker_99");
  await sql.end();
});
```

The integration test creates a throwaway schema name (`bun_worker_99` never
provisioned by the runner) — do NOT `CREATE SCHEMA` here; `current_schema()`
returns the search_path first entry even if the schema does not exist yet.
Skip (`test.skip` style) when `DATABASE_DIRECT_URL` is absent so the pure lane
stays Bun-free-safe.

Pool budget test (pure, no DB):
```ts
test("workers x pool stays within the direct-connection reserve", () => {
  const workers = 8;
  const pool = 2;
  expect(workers * pool).toBeLessThanOrEqual(10); // Render direct reserve
});
```

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Driver-endpoint lane green with the new case.
- The integration assertion above runs only when `DATABASE_DIRECT_URL` is set;
  record its result (expect `bun_worker_99`) in the handoff.

## Documentation Updates Required
- `tests/README.md`: direct-5432 worker URL is guard-compatible; direct reserve
  budget `workers × pool ≤ 10`.
