/**
 * Pure regression tests for the custom migration applier
 * (TASK-557-03-L01, `scripts/bun-lane-migrate.ts`).
 *
 * Pins the contract without any database:
 *
 * - `splitStatements` splits exactly on the `--> statement-breakpoint` marker
 *   and drops empty chunks, so each chunk is one statement group.
 * - `readJournal` returns all 72 journal entries (idx 0..71) with monotonic
 *   `idx` and unique tags, in order.
 *
 * Importing `scripts/bun-lane-migrate` opens no connection: the postgres.js
 * client is only dialed by `migrateSchema` / the CLI, never at module load.
 * The DB-backed idempotency proof lives in
 * `tests/integration/toolchain/bunLaneMigrate.test.ts`.
 */
import { expect, test } from "bun:test";

import {
  readJournal,
  readMigrationSql,
  rewritePublicReferences,
  splitStatements,
} from "../../../scripts/bun-lane-migrate";

test("splitStatements splits exactly on breakpoints and drops empty chunks", () => {
  const chunks = splitStatements(
    "a;\n--> statement-breakpoint\n\nb;\n\n\n--> statement-breakpoint\nc;"
  );
  expect(chunks).toEqual(["a;", "b;", "c;"]);
});

test("splitStatements trims whitespace and keeps single-chunk files intact", () => {
  expect(splitStatements("  create table t (id int);  ")).toEqual(["create table t (id int);"]);
  expect(splitStatements("")).toEqual([]);
});

test("readJournal returns 72 entries with monotonic idx and unique tags", async () => {
  const journal = await readJournal();
  expect(journal.entries.length).toBe(72); // live journal: 0071_seed_admin_role added 2026-08-14
  const tags = new Set<string>();
  journal.entries.forEach((entry, index) => {
    expect(entry.idx).toBe(index);
    expect(entry.tag.length).toBeGreaterThan(0);
    tags.add(entry.tag);
  });
  expect(tags.size).toBe(72);
});

test("rewritePublicReferences retargets public-qualified REFERENCES to the worker schema", () => {
  expect(
    rewritePublicReferences(
      `ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;`,
      "bun_worker_3"
    )
  ).toBe(
    `ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bun_worker_3"."users"("id") ON DELETE cascade ON UPDATE no action;`
  );
});

test("rewritePublicReferences preserves spaced paren forms and leaves other DDL alone", () => {
  // 0027_young_marvel.sql uses `REFERENCES "public"."users" ("id")` with a
  // space before the paren; the rewrite must keep the space and the parens.
  const spaced =
    `CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") ` +
    `REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action,`;
  expect(rewritePublicReferences(spaced, "bun_worker_0")).toBe(
    `CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") ` +
      `REFERENCES "bun_worker_0"."users" ("id") ON DELETE cascade ON UPDATE no action,`
  );
  // Extension/operator-class DDL and unqualified references are untouched.
  const other =
    `create index "search_gin" on "pages" using gin (title gin_trgm_ops); ` +
    `ALTER TABLE "posts" ADD CONSTRAINT "fk" FOREIGN KEY ("author_id") REFERENCES "users"("id");`;
  expect(rewritePublicReferences(other, "bun_worker_0")).toBe(other);
});

test("GATE: no public-qualified REFERENCES remains after rewriting every migration file", async () => {
  // The worker-schema applier rewrites `REFERENCES "public"."X"` at apply time
  // so every FK resolves inside the worker schema. This gate pins that the
  // rewrite covers ALL 73 drizzle-generated clauses across the 34 files: any
  // leftover public qualification would recreate the 23503 FK violations the
  // parallel lane hit. The migration files themselves stay byte-identical for
  // the production/public path; only the applier output is asserted here.
  const journal = await readJournal();
  const schema = "bun_worker_0";
  let totalRewritten = 0;
  for (const entry of journal.entries) {
    const sqlText = await readMigrationSql(entry.tag);
    for (const statement of splitStatements(sqlText)) {
      const rewritten = rewritePublicReferences(statement, schema);
      expect(rewritten).not.toMatch(/REFERENCES\s+"public"\."/);
      totalRewritten += (statement.match(/REFERENCES\s+"public"\."/g) ?? []).length;
    }
  }
  expect(totalRewritten).toBe(73);
});
