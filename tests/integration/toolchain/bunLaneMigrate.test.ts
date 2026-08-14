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
 * - Worker-schema FKs resolve INSIDE the worker schema: every FK whose
 *   referencing table lives in `bun_provision_test` references a table in the
 *   same schema (confrelid proof), and zero FKs reference `public`. The
 *   applier rewrites drizzle's `REFERENCES "public"."X"` to the target schema
 *   at apply time; without the rewrite every cross-table insert would hit
 *   PostgreSQL 23503.
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
  "worker-schema FKs resolve inside the worker schema, never into public (confrelid proof)",
  async () => {
    // The applier rewrites `REFERENCES "public"."X"` to the target schema at
    // apply time (TASK-557 FK fix). Pin the catalog result: every FK whose
    // referencing table lives in this schema must reference a table in the
    // SAME schema. Before the fix, confrelid pointed at public.<table>, so
    // every cross-table insert hit PostgreSQL 23503.
    const constraints = await sql!.unsafe(
      `select con.conname,
              relns.nspname as referencing_schema,
              refns.nspname as referenced_schema,
              refrel.relname as referenced_table
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace relns on relns.oid = rel.relnamespace
       join pg_class refrel on refrel.oid = con.confrelid
       join pg_namespace refns on refns.oid = refrel.relnamespace
       where con.contype = 'f'
         and relns.nspname = '${SCHEMA}'
       order by con.conname`
    );
    expect(constraints.length).toBeGreaterThan(0);
    for (const c of constraints) {
      expect(c.referenced_schema, c.conname).toBe(SCHEMA);
    }
    // And no FK in this schema references the public schema at all.
    const intoPublic = await sql!.unsafe(
      `select count(*)::int as n
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace relns on relns.oid = rel.relnamespace
       join pg_class refrel on refrel.oid = con.confrelid
       join pg_namespace refns on refns.oid = refrel.relnamespace
       where con.contype = 'f'
         and relns.nspname = '${SCHEMA}'
         and refns.nspname = 'public'`
    );
    expect(intoPublic[0].n).toBe(0);
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
