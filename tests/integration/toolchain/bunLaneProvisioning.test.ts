/**
 * Consolidated regression matrix for the parallel Bun lane applier and
 * provisioning script (TASK-557-03-L03). One DB-backed Bun suite proving the
 * two properties the whole parallel design depends on: idempotent migration
 * and schema-disjoint test state.
 *
 * Pure (DB-free) coverage:
 *
 * - `readJournal` returns 78 entries with strictly increasing, non-contiguous
 *   `idx` (allocated, not identity; sibling streams leave gaps).
 * - `splitStatements` respects the `--> statement-breakpoint` marker and drops
 *   empty chunks.
 * - `workerSchemaName` output is always the exact `bun_worker_<index>` drop
 *   target — never a `bun_worker_%` wildcard — asserted through the small
 *   `assertWorkerSchemasOnly(names)` helper that mirrors the provisioning
 *   code's drop shape.
 *
 * DB-backed coverage (runs only when DATABASE_DIRECT_URL is set; the test
 * runner loads `.env`, this file only reads `process.env` and never sources it
 * itself, same gating pattern as the sibling suites in this directory):
 *
 * - `migrateSchema(url, schema)` applies all 78 journal migrations on the
 *   first call and 0 on the second (idempotent, tag-tracked in
 *   `_bun_migrations`), and `to_regclass` resolves `pages`/`settings`.
 * - `pg_trgm` exists exactly once database-wide in `pg_extension`.
 * - `provisionWorkers(url, 2, 2)` creates disjoint, fully migrated
 *   `bun_worker_0`/`bun_worker_1` schemas; re-provisioning wipes stale state
 *   (a marker row is gone after the drop/recreate).
 * - A real marker table in the control schema `bun_control_schema` survives
 *   re-provisioning, proving only the exact derived `bun_worker_*` schemas
 *   are dropped (never a wildcard, never the control schema).
 * - A failing statement in a migration file aborts that file's transaction
 *   only: the partial table is rolled back, the file tag is never recorded,
 *   and prior migrations stay applied (exercised via `applyMigrationFile`,
 *   the production per-file transaction path).
 *
 * The throwaway `bun_provision_test`, `bun_provision_fail`, `bun_worker_0`,
 * `bun_worker_1`, and `bun_control_schema` schemas are dropped before and
 * after the suite; the suite never truncates domain tables and never touches
 * `public` or any other schema.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";

import {
  applyMigrationFile,
  migrateSchema,
  readJournal,
  splitStatements,
} from "../../../scripts/bun-lane-migrate";
import { provisionWorkers } from "../../../scripts/bun-lane-provision";
import { workerSchemaName, WORKER_SCHEMA_PREFIX } from "../../../scripts/bun-lane-worker-url";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const SCHEMA = "bun_provision_test";
const CONTROL = "bun_control_schema";
const SCRATCH = "bun_provision_fail";
const MIGRATION_COUNT = 78;

let sql: postgres.Sql | undefined;

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 2 });
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${CONTROL}" cascade`);
  await sql.unsafe(`create schema "${CONTROL}"`);
});

afterAll(async () => {
  if (!sql) return;
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${CONTROL}" cascade`);
  await sql.unsafe(`drop schema if exists "${SCRATCH}" cascade`);
  await sql.unsafe(`drop schema if exists "bun_worker_0" cascade`);
  await sql.unsafe(`drop schema if exists "bun_worker_1" cascade`);
  await sql.end();
});

test("journal has 78 entries with strictly increasing idx and unique tags", async () => {
  const journal = await readJournal();
  // Live journal: 0073_smiling_ser_duncan, 0075_form_submissions_export_cursor,
  // 0076_content_revisions_version_uniq and 0078_backup_users_staging were appended
  // by concurrent streams. Concurrent agents allocate `idx` from the live journal,
  // so `idx` is strictly increasing (sorted order) but not equal to the array
  // index — a removed racing migration can leave a gap. The applier iterates
  // entries in array order and only consumes `tag`.
  expect(journal.entries.length).toBe(MIGRATION_COUNT);
  const tags = new Set<string>();
  journal.entries.forEach((entry, index) => {
    if (index > 0) {
      expect(entry.idx).toBeGreaterThan(journal.entries[index - 1]!.idx);
    }
    expect(entry.tag.length).toBeGreaterThan(0);
    tags.add(entry.tag);
  });
  expect(tags.size).toBe(MIGRATION_COUNT);
});

test("splitStatements respects breakpoints and drops empties", () => {
  const chunks = splitStatements("a;\n--> statement-breakpoint\n\nb;");
  expect(chunks).toEqual(["a;", "b;"]);
});

/**
 * Mirror the provisioning code's drop shape: every drop target is exactly
 * `workerSchemaName(index)` for a non-negative integer index. A wildcard
 * (`bun_worker_%`) or hand-built name would silently widen the drop set, so
 * the helper fails closed on any name that is not an exact derived schema.
 */
function assertWorkerSchemasOnly(names: string[]): void {
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    expect(name.startsWith(WORKER_SCHEMA_PREFIX)).toBe(true);
    const index = Number(name.slice(WORKER_SCHEMA_PREFIX.length));
    expect(Number.isInteger(index) && index >= 0).toBe(true);
    expect(name).toBe(workerSchemaName(index));
    expect(name.includes("%")).toBe(false);
    expect(name.includes("*")).toBe(false);
  }
}

test("workerSchemaName names are exact drop targets, never wildcards", () => {
  const derived = Array.from({ length: 5 }, (_, i) => workerSchemaName(i));
  expect(derived).toEqual([
    "bun_worker_0",
    "bun_worker_1",
    "bun_worker_2",
    "bun_worker_3",
    "bun_worker_4",
  ]);
  assertWorkerSchemasOnly(derived);
  // A wildcard or non-derived name must fail the exact-target helper.
  expect(() => assertWorkerSchemasOnly(["bun_worker_%"])).toThrow();
  expect(() => assertWorkerSchemasOnly(["bun_worker_*"])).toThrow();
  expect(() => workerSchemaName(-1)).toThrow("worker_index_invalid");
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "migrateSchema applies all migrations idempotently into one schema",
  async () => {
    const first = await migrateSchema(DATABASE_DIRECT_URL!, SCHEMA);
    expect(first).toBe(MIGRATION_COUNT);
    const second = await migrateSchema(DATABASE_DIRECT_URL!, SCHEMA);
    expect(second).toBe(0);
    // to_regclass returns simple identifiers UNQUOTED (no double quotes):
    // `bun_provision_test.pages`, not `"bun_provision_test.pages"`.
    const rows = await sql!.unsafe(
      `select to_regclass('${SCHEMA}.pages') as pages, to_regclass('${SCHEMA}.settings') as settings`
    );
    expect(rows[0].pages).toBe(`${SCHEMA}.pages`);
    expect(rows[0].settings).toBe(`${SCHEMA}.settings`);
  },
  // 72 files at ~3s/file under shared-DB load is ~216s; cap with headroom.
  300000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "pg_trgm extension exists exactly once database-wide",
  async () => {
    const rows = await sql!.unsafe(
      `select count(*)::int as n from pg_extension where extname = 'pg_trgm'`
    );
    expect(rows[0].n).toBe(1);
  }
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "provisionWorkers creates disjoint migrated schemas and drops stale state",
  async () => {
    const results = await provisionWorkers(DATABASE_DIRECT_URL!, 2, 2);
    expect(results.map((r) => r.schema)).toEqual(["bun_worker_0", "bun_worker_1"]);
    for (const r of results) {
      const table = await sql!.unsafe(`select to_regclass('${r.schema}.content_entries') as t`);
      expect(table[0].t).toBeTruthy();
    }
    // Stale marker in bun_worker_0 must be wiped by drop/create.
    await sql!.unsafe(`insert into "bun_worker_0"."_bun_migrations" ("tag") values ('stale')`);
    await provisionWorkers(DATABASE_DIRECT_URL!, 2, 2);
    const stale = await sql!.unsafe(
      `select count(*)::int as n from "bun_worker_0"."_bun_migrations" where tag = 'stale'`
    );
    expect(stale[0].n).toBe(0);
    // Control schema survives: create a real marker table, then re-provision,
    // then assert the marker still exists. (Checking to_regclass of a table
    // that was never created proves nothing — the earlier tautology.)
    await sql!.unsafe(`create table if not exists "${CONTROL}"."_marker" (id int)`);
    await provisionWorkers(DATABASE_DIRECT_URL!, 2, 2);
    const control = await sql!.unsafe(`select to_regclass('${CONTROL}._marker') as t`);
    expect(control[0].t).toBe(`${CONTROL}._marker`);
  },
  // Three full provision cycles (2 schemas concurrent x 72 files each) run in
  // this one test: ~216s per cycle at ~3s/file under shared-DB load, so the
  // cap needs ~3x the idle-DB runtime (measured 139s idle).
  720000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "failing statement aborts its file transaction only",
  async () => {
    // Migrate a scratch schema fully, then apply a bogus migration file whose
    // second statement fails. The failing statement must abort that file's
    // transaction: the partial table is rolled back, the file tag is never
    // recorded, and the 72 already-applied migrations stay intact.
    //
    // The contract's original sketch sent a raw `begin; ...; commit;` string
    // through sql.unsafe; postgres.js rejects transaction-control statements
    // on pooled connections by DESTROYING the socket mid-stream, which hangs
    // the bun:test harness (the promise never settles). The production path
    // `applyMigrationFile` uses postgres.js `client.begin()`, which keeps the
    // per-file transaction semantics without that harness-hostile teardown.
    await sql!.unsafe(`drop schema if exists "${SCRATCH}" cascade`);
    const applied = await migrateSchema(DATABASE_DIRECT_URL!, SCRATCH);
    expect(applied).toBe(MIGRATION_COUNT);
    const client = postgres(DATABASE_DIRECT_URL!, { max: 2 });
    try {
      await expect(
        applyMigrationFile(client, SCRATCH, "ztest_fail", [
          "create table _partial (id int)",
          "select * from no_such_table",
        ])
      ).rejects.toThrow(/no_such_table/);
      // Partial work from the failed file rolled back with its transaction.
      const partial = await sql!.unsafe(`select to_regclass('${SCRATCH}._partial') as t`);
      expect(partial[0].t).toBeNull();
      // The failed file's tag was never recorded.
      const tag = await sql!.unsafe(
        `select count(*)::int as n from "${SCRATCH}"."_bun_migrations" where "tag" = 'ztest_fail'`
      );
      expect(tag[0].n).toBe(0);
    } finally {
      await client.end();
    }
    // Prior migrations survive: re-running applies 0 pending files.
    const again = await migrateSchema(DATABASE_DIRECT_URL!, SCRATCH);
    expect(again).toBe(0);
    await sql!.unsafe(`drop schema if exists "${SCRATCH}" cascade`);
  },
  // A full 72-file migrate into the scratch schema is setup here; under
  // shared-DB load it measured ~3s/file (~216s total), so the cap needs
  // headroom above the ~180s the same migrate needs when the DB is idle.
  300000
);
