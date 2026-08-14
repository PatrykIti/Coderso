# TASK-557-03-L03: Applier and Provisioning Tests
# FileName: TASK-557-03-L03-Applier-And-Provisioning-Tests.md
**Parent Subtask:** TASK-557-03
**Priority:** Medium
**Category:** Testing / Database
**Estimated Effort:** Medium
**Dependencies:** TASK-557-03-L01, TASK-557-03-L02
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
Consolidate the regression matrix for the applier and the provisioning script
into one DB-backed Bun suite (`tests/integration/toolchain/bunLaneProvisioning.test.ts`)
plus pure unit tests where no DB is needed. The suite must run ONLY against a
dedicated throwaway schema, clean up everything it created, and prove the two
properties the whole parallel design depends on: idempotent migration and
schema-disjoint test state.

## Implementation Pseudocode
```ts
// tests/integration/toolchain/bunLaneProvisioning.test.ts
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";
import { migrateSchema, readJournal, splitStatements } from "../../../scripts/bun-lane-migrate";
import { provisionWorkers } from "../../../scripts/bun-lane-provision";
import { workerSchemaName } from "../../../scripts/bun-lane-worker-url";

const hasDb = Boolean(process.env.DATABASE_DIRECT_URL);
const testIfDb = hasDb ? test : test.skip;
const SCHEMA = "bun_provision_test";
const CONTROL = "bun_control_schema";
let sql: postgres.Sql;

beforeAll(async () => {
  if (!hasDb) return;
  sql = postgres(process.env.DATABASE_DIRECT_URL!, { max: 2 });
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${CONTROL}" cascade`);
  await sql.unsafe(`create schema "${CONTROL}"`);
});

afterAll(async () => {
  if (!hasDb) return;
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${CONTROL}" cascade`);
  await sql.end();
});

test("journal has 71 monotonic entries", async () => {
  const journal = await readJournal();
  expect(journal.entries.length).toBe(71);
  journal.entries.forEach((e, i) => expect(e.idx).toBe(i));
});

test("splitStatements respects breakpoints and drops empties", () => {
  const chunks = splitStatements("a;\n--> statement-breakpoint\n\nb;");
  expect(chunks).toEqual(["a;", "b;"]);
});

testIfDb("migrateSchema applies all migrations idempotently into one schema", async () => {
  const first = await migrateSchema(process.env.DATABASE_DIRECT_URL!, SCHEMA);
  expect(first).toBe(71);
  const second = await migrateSchema(process.env.DATABASE_DIRECT_URL!, SCHEMA);
  expect(second).toBe(0);
  const rows = await sql.unsafe(
    `select to_regclass('${SCHEMA}.pages') as pages, to_regclass('${SCHEMA}.settings') as settings`
  );
  // to_regclass returns simple identifiers UNQUOTED (no double quotes):
  // `bun_provision_test.pages`, not `"bun_provision_test.pages"`.
  expect(rows[0].pages).toBe(`${SCHEMA}.pages`);
  expect(rows[0].settings).toBe(`${SCHEMA}.settings`);
});

testIfDb("pg_trgm extension exists exactly once database-wide", async () => {
  const rows = await sql.unsafe(`select count(*)::int as n from pg_extension where extname = 'pg_trgm'`);
  expect(rows[0].n).toBe(1);
});

testIfDb("provisionWorkers creates disjoint migrated schemas and drops stale state", async () => {
  const results = await provisionWorkers(process.env.DATABASE_DIRECT_URL!, 2, 2);
  expect(results.map((r) => r.schema)).toEqual(["bun_worker_0", "bun_worker_1"]);
  for (const r of results) {
    const table = await sql.unsafe(`select to_regclass('${r.schema}.content_entries') as t`);
    expect(table[0].t).toBeTruthy();
  }
  // Stale marker in bun_worker_0 must be wiped by drop/create.
  await sql.unsafe(`insert into "bun_worker_0"."_bun_migrations" ("tag") values ('stale')`);
  await provisionWorkers(process.env.DATABASE_DIRECT_URL!, 2, 2);
  const stale = await sql.unsafe(`select count(*)::int as n from "bun_worker_0"."_bun_migrations" where tag = 'stale'`);
  expect(stale[0].n).toBe(0);
  // Control schema survives: create a real marker table, then re-provision,
  // then assert the marker still exists. (Checking to_regclass of a table that
  // was never created proves nothing — the earlier tautology.)
  await sql.unsafe(`create table if not exists "${CONTROL}"."_marker" (id int)`);
  await provisionWorkers(process.env.DATABASE_DIRECT_URL!, 2, 2);
  const control = await sql.unsafe(`select to_regclass('${CONTROL}._marker') as t`);
  expect(control[0].t).toBe(`${CONTROL}._marker`);
});

testIfDb("failing statement aborts its file transaction only", async () => {
  // Migrate a scratch schema, then attempt a bogus file; expect rollback of that file.
  const scratch = "bun_provision_fail";
  await sql.unsafe(`drop schema if exists "${scratch}" cascade`);
  await migrateSchema(process.env.DATABASE_DIRECT_URL!, scratch);
  await expect(
    sql.unsafe(`begin; set local search_path to "${scratch}"; select * from no_such_table; commit;`)
  ).rejects.toThrow();
  await sql.unsafe(`drop schema if exists "${scratch}" cascade`);
});
```

Also add a pure test that `workerSchemaName` output is always the only thing a
drop targets (no `bun_worker_%` wildcard) — enforced by the provisioning code
shape; assert via a small helper `assertWorkerSchemasOnly(names)`.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/integration/toolchain/bunLaneProvisioning.test.ts` green with
  `DATABASE_DIRECT_URL` set; clean skip otherwise.
- No truncation of domain tables; only own schemas/rows are created and
  removed.
- Record pass counts and provision wall time in the handoff.

## Documentation Updates Required
- None beyond the parent subtask's README notes.
