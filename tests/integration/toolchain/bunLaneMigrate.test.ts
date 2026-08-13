/**
 * DB-backed integration proof for the custom migration applier
 * (TASK-557-03-L01, `scripts/bun-lane-migrate.ts`).
 *
 * Runs only when DATABASE_DIRECT_URL is set (the lane manifest carries it;
 * the test runner loads `.env`, this file only reads `process.env` and never
 * sources it itself) and skips cleanly otherwise, so the pure lane stays green
 * without the DB. Same gating pattern as
 * `tests/unit/db/bunLaneWorkerSchema.test.ts`.
 *
 * Pins the properties the whole parallel design depends on:
 *
 * - `migrateSchema(url, "bun_provision_test")` applies all 71 journal
 *   migrations on the first call and 0 on the second (idempotent, tag-tracked
 *   in `_bun_migrations`).
 * - `to_regclass('bun_provision_test.pages')` / `settings` are non-null after
 *   the run (unqualified DDL landed in the worker schema via search_path).
 * - `pg_trgm` exists exactly once database-wide in `pg_extension`.
 *
 * The throwaway `bun_provision_test` schema is dropped before and after the
 * suite; the suite never touches `public` or any other schema.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";

import { migrateSchema } from "../../../scripts/bun-lane-migrate";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const SCHEMA = "bun_provision_test";

let sql: postgres.Sql | undefined;

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 2 });
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
});

afterAll(async () => {
  if (!sql) return;
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.end();
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "migrateSchema applies all 71 migrations idempotently into one schema",
  async () => {
    const first = await migrateSchema(DATABASE_DIRECT_URL!, SCHEMA);
    expect(first).toBe(71);
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
  120000
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
