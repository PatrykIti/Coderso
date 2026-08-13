/**
 * Integration proof for the worker URL builder (TASK-557-02-L02): postgres.js
 * must forward the `?options=-csearch_path=bun_worker_<i>` parameter to the
 * PostgreSQL StartupMessage, so each spawned parallel-lane worker session
 * really runs against its own schema.
 *
 * Runs only when DATABASE_DIRECT_URL is set (the lane manifest carries it) and
 * skips cleanly otherwise, so the pure lane stays green without the DB. The
 * test runner loads `.env`; this file only reads `process.env` and never
 * sources it itself.
 *
 * `bun_worker_99` is never provisioned and this test never CREATEs it: the
 * forwarding proof is `current_setting('search_path')`, which the server
 * applies from the startup parameter. `current_schema()` is deliberately NOT
 * asserted to be "bun_worker_99" — PostgreSQL returns the first EXISTING
 * schema in the search path (NULL when none exists), so a never-provisioned
 * schema name can never be its answer. The L02 contract pseudocode claimed
 * otherwise; it was verified wrong against PostgreSQL 16 (see task handoff).
 */
import { expect, test } from "bun:test";
import postgres from "postgres";

import { buildWorkerDatabaseUrl } from "../../../scripts/bun-lane-worker-url";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;

test.skipIf(!DATABASE_DIRECT_URL)(
  "postgres.js forwards ?options=-csearch_path= to the StartupMessage",
  async () => {
    const url = buildWorkerDatabaseUrl(DATABASE_DIRECT_URL!, 99);
    const sql = postgres(url, { max: 1 });
    try {
      const rows =
        await sql`select current_setting('search_path') as search_path, current_schema() as schema_name`;
      expect(rows[0].search_path).toBe("bun_worker_99");
      // The throwaway schema does not exist, so current_schema() is NULL or the
      // first existing schema — never "bun_worker_99". Pin that so nobody
      // "fixes" this into a CREATE SCHEMA.
      expect(rows[0].schema_name).not.toBe("bun_worker_99");
    } finally {
      await sql.end();
    }
  }
);
