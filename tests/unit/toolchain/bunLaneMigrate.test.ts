/**
 * Pure regression tests for the custom migration applier
 * (TASK-557-03-L01, `scripts/bun-lane-migrate.ts`).
 *
 * Pins the contract without any database:
 *
 * - `splitStatements` splits exactly on the `--> statement-breakpoint` marker
 *   and drops empty chunks, so each chunk is one statement group.
 * - `readJournal` returns all 71 journal entries (idx 0..70) with monotonic
 *   `idx` and unique tags, in order.
 *
 * Importing `scripts/bun-lane-migrate` opens no connection: the postgres.js
 * client is only dialed by `migrateSchema` / the CLI, never at module load.
 * The DB-backed idempotency proof lives in
 * `tests/integration/toolchain/bunLaneMigrate.test.ts`.
 */
import { expect, test } from "bun:test";

import { readJournal, splitStatements } from "../../../scripts/bun-lane-migrate";

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

test("readJournal returns 71 entries with monotonic idx and unique tags", async () => {
  const journal = await readJournal();
  expect(journal.entries.length).toBe(71);
  const tags = new Set<string>();
  journal.entries.forEach((entry, index) => {
    expect(entry.idx).toBe(index);
    expect(entry.tag.length).toBeGreaterThan(0);
    tags.add(entry.tag);
  });
  expect(tags.size).toBe(71);
});
