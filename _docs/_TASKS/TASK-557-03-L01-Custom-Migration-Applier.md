# TASK-557-03-L01: Custom Migration Applier
# FileName: TASK-557-03-L01-Custom-Migration-Applier.md
**Parent Subtask:** TASK-557-03
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Medium
**Dependencies:** TASK-557-02-L01 (worker URL)
**Status:** ⏳ To Do
---
## Overview
Implement `scripts/bun-lane-migrate.ts` with a pure journal reader and a
postgres.js-backed SQL runner that migrates ONE named schema idempotently.
This replaces drizzle's migrator for the test lane only; production
`core/server/startupMigrations.ts` and drizzle-kit are untouched.

Core behavior:
1. Read `core/db/migrations/meta/_journal.json` entries in order (idx 0..70).
2. For each tag, read `core/db/migrations/<tag>.sql` and split on the exact
   marker `--> statement-breakpoint` (each chunk is one statement group).
3. Run each chunk inside one transaction with `SET LOCAL search_path TO
   <schema>` so tables/indexes land in the worker schema (unqualified DDL
   verified: zero `public.` in all 71 files).
4. Track applied tags in `<schema>._bun_migrations(tag text primary key)`:
   insert after each file's chunks commit; re-run skips already-applied tags.
5. `CREATE EXTENSION IF NOT EXISTS pg_trgm` (0006) runs on the first worker
   and is a per-database no-op afterwards (idempotent by `IF NOT EXISTS`).

## Implementation Pseudocode
```ts
// scripts/bun-lane-migrate.ts
import { readFile, readdir } from "node:fs/promises";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const MIGRATIONS_DIR = "core/db/migrations";
const JOURNAL_PATH = `${MIGRATIONS_DIR}/meta/_journal.json`;
const BREAKPOINT = "--> statement-breakpoint";
const TRACK_TABLE = "_bun_migrations";

type Journal = { entries: Array<{ idx: number; tag: string }> };

export async function readJournal(): Promise<Journal> {
  return JSON.parse(await readFile(JOURNAL_PATH, "utf8")) as Journal;
}

export async function readMigrationSql(tag: string): Promise<string> {
  return readFile(`${MIGRATIONS_DIR}/${tag}.sql`, "utf8");
}

export function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

export async function appliedTags(client: postgres.Sql, schema: string): Promise<Set<string>> {
  await client.unsafe(
    `create table if not exists "${schema}"."${TRACK_TABLE}" ("tag" text primary key)`
  );
  const rows = await client.unsafe(`select tag from "${schema}"."${TRACK_TABLE}"`);
  return new Set(rows.map((r: { tag: string }) => r.tag));
}

export async function applyMigrationFile(
  client: postgres.Sql,
  schema: string,
  tag: string,
  statements: string[]
): Promise<void> {
  await client.begin(async (tx) => {
    await tx.unsafe(`set local search_path to "${schema}"`);
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
    await tx.unsafe(`insert into "${schema}"."${TRACK_TABLE}" ("tag") values ('${tag}')`);
  });
}

export async function migrateSchema(databaseUrl: string, schema: string): Promise<number> {
  const client = postgres(databaseUrl, { max: 2 });
  try {
    await client.unsafe(`create schema if not exists "${schema}"`);
    const done = await appliedTags(client, schema);
    const journal = await readJournal();
    let applied = 0;
    for (const entry of journal.entries) {
      if (done.has(entry.tag)) continue;
      const statements = splitStatements(await readMigrationSql(entry.tag));
      await applyMigrationFile(client, schema, entry.tag, statements);
      applied += 1;
    }
    return applied;
  } finally {
    await client.end();
  }
}

// CLI: bun scripts/bun-lane-migrate.ts <schema>
if (import.meta.main) {
  const schema = process.argv[2];
  if (!schema) throw new Error("schema_argument_required");
  const url = process.env.DATABASE_DIRECT_URL;
  if (!url) throw new Error("DATABASE_DIRECT_URL_required");
  const count = await migrateSchema(url, schema);
  console.log(`[bun-lane-migrate] ${schema}: applied ${count} pending migrations`);
}
```

Error handling: a failing statement inside a file aborts that file's
transaction (rollback of partial file work), surfaces as
`migration_apply_failed:<tag>:<message>` (message redacted — never echo bind
values), and leaves prior files applied; re-run resumes from the last
successful tag. Do not wrap the whole run in one transaction (71 files would
hold long locks); per-file transactions only.

Regression-test shape (`tests/unit/toolchain/bunLaneMigrate.test.ts` pure, plus
DB-backed integration in `tests/integration/routes/` or a new
`tests/integration/toolchain/`):
- `splitStatements` splits exactly on breakpoints and drops empty chunks.
- `readJournal` returns 71 entries with monotonic idx.
- DB-backed: `migrateSchema(url, "bun_provision_test")` applies all 71, second
  call applies 0, `to_regclass('bun_provision_test.pages')` is non-null, and
  `pg_trgm` extension exists exactly once in `pg_extension`.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure tests green without DB; DB-backed test runs only when
  `DATABASE_DIRECT_URL` is set (skip cleanly otherwise).
- Record applied count and schema-object spot checks in the handoff.

## Documentation Updates Required
- `tests/README.md`: applier replaces drizzle migrator for the Bun lane.
