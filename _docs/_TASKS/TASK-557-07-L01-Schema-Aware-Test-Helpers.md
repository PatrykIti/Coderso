# TASK-557-07-L01: Schema-Aware Test Helpers
# FileName: TASK-557-07-L01-Schema-Aware-Test-Helpers.md
**Parent Subtask:** TASK-557-07
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
---
## Overview
Fix every hardcoded `public.` reference in the test harness so probes resolve
within the worker's `search_path`:
- `tests/utils/db.ts:17` — `hasTable` uses `to_regclass('public.<name>')`.
- 3 other `to_regclass` sites (grep confirmed only
  `tests/utils/db.ts:17` in-lane; the audit counted 4 sites repo-wide —
  re-grep and fix any in-lane hit).
- `tests/integration/analytics/trafficSchema*` — `information_schema` /
  `pg_indexes` queries must filter `table_schema = current_schema()` (or the
  worker schema), otherwise they see every worker's tables.
- Any `SET search_path` or schema-qualified `SELECT` in test files that pins
  `public` explicitly.

The helpers must remain backward-compatible when running against `public`
(local/CI single-schema runs): resolve the CURRENT schema from the connection
(`select current_schema()`) and use it; never hardcode `public`.

## Implementation Pseudocode
```ts
// tests/utils/db.ts (patch)
import { sql } from "drizzle-orm";
import { db } from "../../core/db/client";

let cachedSchema: string | null = null;

export async function currentSchema(): Promise<string> {
  if (cachedSchema) return cachedSchema;
  const rows = await db.execute(sql`select current_schema() as s`);
  const s = (Array.isArray(rows) ? rows : (rows as { rows?: Array<{ s?: string }> }).rows ?? [])[0]?.s;
  cachedSchema = typeof s === "string" && s.length > 0 ? s : "public";
  return cachedSchema;
}

export async function hasTable(tableName: string): Promise<boolean> {
  try {
    const schema = await currentSchema();
    const result = await db.execute(
      sql`select to_regclass(${`${schema}.${tableName}`}) as name`
    );
    const rows = Array.isArray(result)
      ? result
      : (result as { rows?: Array<{ name?: unknown }> }).rows ?? [];
    const row = rows[0];
    return typeof row?.name === "string" && row.name.length > 0;
  } catch {
    return false;
  }
}
```

`currentSchema()` is cached per process — worker processes are per-file in the
Bun lane, and per-file the schema never changes (the whole worker uses one
search_path), so caching is safe. For `trafficSchema` queries, replace
`table_schema = 'public'` filters with `table_schema = current_schema()`.

Error handling: `currentSchema()` falls back to `"public"` only when the query
itself fails (defensive, matching today's `hasTable` try/catch); never throw
out of `hasTable`.

Regression-test shape (`tests/unit/db/testHelpers.test.ts` + DB-gated):
- Pure: mocked `db.execute` returning `{s: "bun_worker_3"}` -> `hasTable`
  calls `to_regclass('bun_worker_3.<name>')` (assert SQL string via a spy).
- DB-gated: against a throwaway schema, `hasTable("pages")` is true and
  `hasTable("no_such_table")` is false; `currentSchema()` equals the worker
  schema name.
- trafficSchema: `pg_indexes` query returns only rows of the current schema.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Helper tests green (pure + DB-gated); existing `canConnect` behavior
  unchanged.
- Record re-grep result (in-lane hardcoded `public.` count after fix = 0).

## Documentation Updates Required
- `tests/README.md` — helpers are schema-aware.
