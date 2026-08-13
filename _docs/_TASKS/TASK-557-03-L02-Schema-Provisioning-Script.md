# TASK-557-03-L02: Schema Provisioning Script
# FileName: TASK-557-03-L02-Schema-Provisioning-Script.md
**Parent Subtask:** TASK-557-03
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Small
**Dependencies:** TASK-557-03-L01 (applier)
**Status:** ⏳ To Do
---
## Overview
Provide `scripts/bun-lane-provision.ts` that, for a given worker count `K`,
drops any previous `bun_worker_*` schemas, creates fresh ones, and applies the
full migration set to each concurrently (each schema migrates independently;
the applier's per-database `CREATE EXTENSION IF NOT EXISTS pg_trgm` is safe
under concurrency — `IF NOT EXISTS` + unique extension OID). The runner calls
this once before spawning workers, so every worker starts with an empty,
migrated schema. The script must be idempotent and re-runnable, and must never
touch the `public` schema or non-worker schemas.

## Implementation Pseudocode
```ts
// scripts/bun-lane-provision.ts
import postgres from "postgres";
import { migrateSchema } from "./bun-lane-migrate";
import { workerSchemaName } from "./bun-lane-worker-url";

export async function provisionWorkers(
  databaseUrl: string,
  workerCount: number,
  concurrency = Math.min(workerCount, 4)
): Promise<Array<{ schema: string; applied: number }>> {
  const schemas = Array.from({ length: workerCount }, (_, i) => workerSchemaName(i));

  // Clean slate: drop any previous worker schemas (owned by this runner only).
  const admin = postgres(databaseUrl, { max: 2 });
  try {
    for (const schema of schemas) {
      await admin.unsafe(`drop schema if exists "${schema}" cascade`);
    }
  } finally {
    await admin.end();
  }

  // Migrate concurrently with bounded concurrency.
  const results: Array<{ schema: string; applied: number }> = [];
  let cursor = 0;
  async function worker() {
    while (cursor < schemas.length) {
      const schema = schemas[cursor++];
      const applied = await migrateSchema(databaseUrl, schema);
      results.push({ schema, applied });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.sort((a, b) => a.schema.localeCompare(b.schema));
}

// CLI: bun scripts/bun-lane-provision.ts <workers>
if (import.meta.main) {
  const workers = Number(process.argv[2] ?? 8);
  if (!Number.isInteger(workers) || workers < 1 || workers > 16) {
    throw new Error(`worker_count_invalid:${workers}`);
  }
  const url = process.env.DATABASE_DIRECT_URL;
  if (!url) throw new Error("DATABASE_DIRECT_URL_required");
  const results = await provisionWorkers(url, workers);
  for (const r of results) console.log(`[bun-lane-provision] ${r.schema}: ${r.applied} applied`);
}
```

Error handling: `drop schema ... cascade` is scoped strictly to
`bun_worker_*` names derived from `workerSchemaName` (never a wildcard, never
user input); abort with `provision_drop_failed:<schema>` if a drop fails;
`migrateSchema` errors propagate as `migration_apply_failed:<tag>` and abort
provisioning (no partial workers start). Redact connection strings in all logs.

Regression-test shape (DB-backed, `tests/integration/toolchain/`):
- `provisionWorkers(url, 2)` creates `bun_worker_0` and `bun_worker_1`, both
  with `to_regclass('<schema>.pages')` non-null and disjoint `pg_tables`
  membership.
- Re-running `provisionWorkers(url, 2)` drops and recreates both (fresh state),
  and a marker row inserted into `bun_worker_0` before re-run is gone after.
- Only schemas matching `bun_worker_%` are dropped; a control schema
  `bun_control_schema` (created by the test, removed by the test) survives.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- DB-backed tests run only with `DATABASE_DIRECT_URL` (clean skip otherwise)
  and clean up only their own schemas/rows.
- Record per-schema applied counts and wall time for K=8 in the handoff.

## Documentation Updates Required
- `tests/README.md`: provisioning command and safety scope (`bun_worker_*` only).
