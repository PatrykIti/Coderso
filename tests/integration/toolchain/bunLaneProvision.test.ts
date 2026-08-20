/**
 * DB-backed integration proof for worker schema provisioning
 * (TASK-557-03-L02, `scripts/bun-lane-provision.ts`).
 *
 * Runs only when DATABASE_DIRECT_URL is set (the lane manifest carries it;
 * the test runner loads `.env`, this file only reads `process.env` and never
 * sources it itself) and skips cleanly otherwise, so the pure lane stays green
 * without the DB. Same gating pattern as
 * `tests/integration/toolchain/bunLaneMigrate.test.ts`.
 *
 * Pins the properties the parallel runner depends on:
 *
 * - `provisionWorkers(url, 2)` creates `bun_worker_0` and `bun_worker_1`,
 *   both with `to_regclass('<schema>.pages')` non-null and disjoint
 *   `pg_tables` membership (each schema owns a full, independent copy).
 * - Re-running `provisionWorkers(url, 2)` drops and recreates both schemas:
 *   a marker row inserted into `bun_worker_0` before the re-run is gone
 *   after, and all 71 migrations are re-applied.
 * - Only the exact derived `bun_worker_*` schemas are dropped; a control
 *   schema `bun_control_schema` (created by the test, removed by the test)
 *   survives provisioning untouched.
 *
 * The throwaway `bun_worker_0`, `bun_worker_1`, and `bun_control_schema`
 * schemas are dropped before and after the suite; the suite never touches
 * `public` or any other schema.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";

import { provisionWorkers } from "../../../scripts/bun-lane-provision";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const WORKER_SCHEMAS = ["bun_worker_0", "bun_worker_1"];
const CONTROL_SCHEMA = "bun_control_schema";
// Live journal has 78 entries: 0073_smiling_ser_duncan, 0075_form_submissions_export_cursor,
// 0076_content_revisions_version_uniq, 0078_backup_users_staging and
// 0079_hot_shadowcat (TASK-493-01-L02) were appended by concurrent streams
// (see core/db/migrations/meta/_journal.json).
const MIGRATION_COUNT = 78;

let sql: postgres.Sql | undefined;

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 2 });
  for (const schema of [...WORKER_SCHEMAS, CONTROL_SCHEMA]) {
    await sql.unsafe(`drop schema if exists "${schema}" cascade`);
  }
});

afterAll(async () => {
  if (!sql) return;
  for (const schema of [...WORKER_SCHEMAS, CONTROL_SCHEMA]) {
    await sql.unsafe(`drop schema if exists "${schema}" cascade`);
  }
  await sql.end();
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "provisionWorkers creates two fully migrated, disjoint worker schemas",
  async () => {
    const results = await provisionWorkers(DATABASE_DIRECT_URL!, 2);
    expect(results.map((r) => r.schema)).toEqual(WORKER_SCHEMAS);
    expect(results.every((r) => r.applied === MIGRATION_COUNT)).toBe(true);
    // to_regclass returns simple identifiers UNQUOTED (no double quotes):
    // `bun_worker_0.pages`, not `"bun_worker_0.pages"`.
    const rows = await sql!.unsafe(
      `select to_regclass('${WORKER_SCHEMAS[0]}.pages') as p0,
              to_regclass('${WORKER_SCHEMAS[1]}.pages') as p1,
              to_regclass('${WORKER_SCHEMAS[0]}.pages')::oid as oid0,
              to_regclass('${WORKER_SCHEMAS[1]}.pages')::oid as oid1`
    );
    expect(rows[0].p0).toBe(`${WORKER_SCHEMAS[0]}.pages`);
    expect(rows[0].p1).toBe(`${WORKER_SCHEMAS[1]}.pages`);
    // Distinct OIDs prove the schemas do not share catalog rows.
    expect(rows[0].oid0).not.toBe(rows[0].oid1);
    const tables = await sql!.unsafe(
      `select schemaname, tablename from pg_tables
        where schemaname in ('${WORKER_SCHEMAS[0]}', '${WORKER_SCHEMAS[1]}')
        order by schemaname, tablename`
    );
    const names0 = new Set(
      tables.filter((r) => r.schemaname === WORKER_SCHEMAS[0]).map((r) => r.tablename)
    );
    const names1 = new Set(
      tables.filter((r) => r.schemaname === WORKER_SCHEMAS[1]).map((r) => r.tablename)
    );
    expect(names0.size).toBeGreaterThan(0);
    expect(names1.size).toBeGreaterThan(0);
    expect(names0).toEqual(names1);
    // Disjoint pg_tables membership: every (schemaname, tablename) row is unique.
    const all = tables.map((r) => `${r.schemaname}.${r.tablename}`);
    expect(new Set(all).size).toBe(all.length);
  },
  180000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "re-running provisionWorkers drops and recreates schemas (marker row gone)",
  async () => {
    await provisionWorkers(DATABASE_DIRECT_URL!, 2);
    await sql!.unsafe(
      `insert into "${WORKER_SCHEMAS[0]}"."_bun_migrations" ("tag") values ('provision_marker')`
    );
    const results = await provisionWorkers(DATABASE_DIRECT_URL!, 2);
    // Fresh drop + recreate means the full migration set re-applies.
    expect(results.map((r) => r.applied)).toEqual([MIGRATION_COUNT, MIGRATION_COUNT]);
    const markerRows = await sql!.unsafe(
      `select count(*)::int as n from "${WORKER_SCHEMAS[0]}"."_bun_migrations" where "tag" = 'provision_marker'`
    );
    expect(markerRows[0].n).toBe(0);
    const pages = await sql!.unsafe(`select to_regclass('${WORKER_SCHEMAS[0]}.pages') as p`);
    expect(pages[0].p).toBe(`${WORKER_SCHEMAS[0]}.pages`);
  },
  240000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "provisionWorkers only drops bun_worker_* schemas; control schema survives",
  async () => {
    await sql!.unsafe(`create schema "${CONTROL_SCHEMA}"`);
    await sql!.unsafe(`create table "${CONTROL_SCHEMA}".marker ("id" int)`);
    await sql!.unsafe(`insert into "${CONTROL_SCHEMA}".marker ("id") values (1)`);
    await provisionWorkers(DATABASE_DIRECT_URL!, 2);
    const rows = await sql!.unsafe(
      `select to_regclass('${CONTROL_SCHEMA}.marker') as m,
              (select count(*)::int from "${CONTROL_SCHEMA}".marker) as n`
    );
    expect(rows[0].m).toBe(`${CONTROL_SCHEMA}.marker`);
    expect(rows[0].n).toBe(1);
  },
  180000
);
