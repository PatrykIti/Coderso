import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../../../core/db/bookingReservationExclusion";
import {
  SEARCH_VECTOR_SQL,
  task551TrigramNormalizedSql,
} from "../../../core/db/searchVectorDefinitions";
import {
  TASK551_ASSERTED_UNIQUE_CONSTRAINTS,
  TASK551_EXCLUSION_CONSTRAINT_NAME,
  TASK551_ONLINE_INDEX_MEMBERS,
  TASK551_REVISION_INTEGRITY_MEMBERS,
} from "../../../tests/perf/fixtures/task551OnlineIndexManifest";

/**
 * TASK-551-05-L01 migration/manifest/snapshot parity.
 *
 * The migration deliberately represents every new snapshot-owned index TWICE:
 * the Drizzle snapshot describes it (so `db:generate` stays zero-drift and a
 * later drop of a column takes its index with it), while the executable bytes
 * live in the non-journaled `CONCURRENTLY` companion so PostgreSQL can build it
 * without an exclusive lock. That split is only safe while the two
 * representations agree exactly, so this suite makes the agreement exhaustive:
 *
 *   - journal: exactly one entry for the transactional tag, at the tail, and
 *     never an entry for the companion;
 *   - companion: every statement is a top-level `CREATE [UNIQUE] INDEX
 *     CONCURRENTLY`, in closed manifest order, byte-identical to the manifest;
 *   - transactional SQL: zero `CONCURRENTLY` and zero new plain index
 *     statements, the exclusion seam added exactly once, and no artifact ever
 *     carries the exclusion's `dropSql` or any `DROP CONSTRAINT` naming it;
 *   - snapshot: every manifest member is described with the same uniqueness,
 *     method, column order and predicate bytes, the seven vector and five
 *     trigram columns carry the exact definition bytes, and the four composite
 *     FK targets are unique CONSTRAINTS that no manifest member rebuilds;
 *   - live catalog (skipped without a database): `pg_get_indexdef` for every
 *     member equals its transactional rendering, so nothing else can drift
 *     between the two representations.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../../core/db/migrations");
const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox";
const ONLINE_TAG = "0081_task551_online_indexes";
const PRESERVED_MEMBER = "content_revisions_entry_version_idx";
const SEARCH_VECTOR_TABLE_NAMES = {
  pages: "pages",
  entries: "content_entries",
  posts: "posts",
  media: "media",
  users: "users",
  assistantDocs: "assistant_docs",
  assistantDocChunks: "assistant_doc_chunks",
} as const;

type JournalEntry = { idx: number; tag: string };
type Json = Record<string, unknown>;

const journal = (): JournalEntry[] =>
  (
    JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")) as {
      entries: JournalEntry[];
    }
  ).entries;

const snapshotPath = (tag: string): string =>
  path.join(MIGRATIONS_DIR, `meta/${tag.split("_")[0]}_snapshot.json`);

const readSnapshot = (tag: string): Json =>
  JSON.parse(readFileSync(snapshotPath(tag), "utf8")) as Json;

const transactionalSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${MIGRATION_TAG}.sql`), "utf8");

const companionStatements = (): string[] =>
  readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"));

const tablesOf = (file: Json): Record<string, Json> => file.tables as Record<string, Json>;

const indexesOf = (file: Json): Record<string, Json> => {
  const collected: Record<string, Json> = {};
  for (const table of Object.values(tablesOf(file))) {
    for (const [name, definition] of Object.entries(
      (table.indexes ?? {}) as Record<string, Json>
    )) {
      collected[name] = definition;
    }
  }
  return collected;
};

const countOf = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

/**
 * The manifest bytes as the transactional migration would have to render them:
 * the exact `CONCURRENTLY` form with the keyword removed is what PostgreSQL
 * stores, so the live-catalog comparison below uses the same rendering.
 */
const transactionalDefinition = (createSql: string): string =>
  createSql.replace(/ CONCURRENTLY/, "");

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";
const canConnect = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

test("the journal holds exactly one TASK-551 entry, at the tail, and never the companion", () => {
  const entries = journal();
  const hits = entries.filter((entry) => entry.tag === MIGRATION_TAG);
  expect(hits).toHaveLength(1);
  expect(entries[entries.length - 1]?.tag).toBe(MIGRATION_TAG);
  expect(entries.some((entry) => entry.tag === ONLINE_TAG)).toBe(false);
  expect(existsSync(snapshotPath(MIGRATION_TAG))).toBe(true);
});

test("the companion is present, unjournaled, and contains only concurrent index builds", () => {
  const statements = companionStatements();
  expect(statements.length).toBe(TASK551_ONLINE_INDEX_MEMBERS.length);
  for (const statement of statements) {
    expect(statement).toMatch(/^CREATE (UNIQUE )?INDEX CONCURRENTLY "/);
    expect(statement.endsWith(";")).toBe(true);
  }
});

test("companion statements are the manifest's createSql in the closed manifest order", () => {
  const statements = companionStatements().map((statement) => statement.replace(/;$/, ""));
  expect(statements).toEqual(TASK551_ONLINE_INDEX_MEMBERS.map((member) => member.createSql));
});

test("the manifest's first group is exactly the two revision unique indexes", () => {
  expect(TASK551_REVISION_INTEGRITY_MEMBERS).toEqual([
    TASK551_ONLINE_INDEX_MEMBERS[0]?.name,
    TASK551_ONLINE_INDEX_MEMBERS[1]?.name,
  ]);
  expect(TASK551_ONLINE_INDEX_MEMBERS.slice(0, 2).map((member) => member.unique)).toEqual([
    true,
    true,
  ]);
  for (const [order, member] of TASK551_ONLINE_INDEX_MEMBERS.entries()) {
    expect(member.order).toBe(order);
    expect(member.group).toBe(order < 2 ? "revision-integrity" : "read-performance");
  }
});

test("the transactional migration carries no index DDL at all", () => {
  const sql = transactionalSql();
  expect(sql.includes("CONCURRENTLY")).toBe(false);
  expect(sql).not.toMatch(/^\s*CREATE (UNIQUE )?INDEX\s/m);
  expect(sql.toUpperCase()).not.toContain("DROP INDEX");
});

test("the exclusion seam is appended exactly once, and no artifact may reverse it", () => {
  const sql = transactionalSql();
  expect(countOf(sql, BOOKING_RESERVATION_EXCLUSION_SQL.extensionSql)).toBe(1);
  expect(countOf(sql, BOOKING_RESERVATION_EXCLUSION_SQL.addSql)).toBe(1);
  for (const artifact of [
    sql,
    readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8"),
    readFileSync(snapshotPath(MIGRATION_TAG), "utf8"),
  ]) {
    expect(artifact.includes(BOOKING_RESERVATION_EXCLUSION_SQL.dropSql)).toBe(false);
    expect(artifact.includes(`DROP CONSTRAINT ${TASK551_EXCLUSION_CONSTRAINT_NAME}`)).toBe(false);
    // Only the transactional SQL may name the constraint at all, and only as
    // its one append of `addSql`.
    if (artifact !== sql) {
      expect(artifact.includes(TASK551_EXCLUSION_CONSTRAINT_NAME)).toBe(false);
    }
  }
  expect(countOf(sql, TASK551_EXCLUSION_CONSTRAINT_NAME)).toBe(1);
});

test("every manifest member is described by the snapshot with the same shape", () => {
  const indexes = indexesOf(readSnapshot(MIGRATION_TAG));
  const _previous = new Set(Object.keys(indexesOf(readSnapshot("0080_detail_page_v2_backfill"))));
  for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
    const definition = indexes[member.name];
    if (definition === undefined) {
      throw new Error(`manifest member ${member.name} is missing from the newest snapshot`);
    }
    expect(definition.isUnique).toBe(member.unique);
    // Same `USING <method>` as the executable bytes: the snapshot must agree on
    // the access method too, or the transactional and online representations
    // describe different indexes.
    expect(definition.method).toBe(
      member.createSql
        .slice(
          member.createSql.indexOf(" USING ") + " USING ".length,
          member.createSql.indexOf("(")
        )
        .trim()
    );
    const columns = definition.columns as { expression: string }[];
    // Match only the ordered column items inside `USING <method> (...)` — never
    // the createSql's quoted index/table names or its WHERE bytes. Each item is
    // rendered the way drizzle-kit renders the snapshot's `expression`: a plain
    // or opclassed column as its bare name, a descending column as the exact
    // `"name" desc` bytes.
    const columnSection = member.createSql
      .slice(
        member.createSql.indexOf("(") + 1,
        member.createSql.includes(") WHERE ")
          ? member.createSql.indexOf(") WHERE ")
          : member.createSql.length
      )
      .replace(/\)\s*;?$/, "");
    const renderedColumns = columnSection
      .split(",")
      .map((item) => item.trim().replace(/ (gin_trgm_ops|jsonb_path_ops)$/, ""))
      .map((item) => (item.endsWith(" desc") ? item : item.replace(/^"|"$/g, "")));
    expect(columns.map((column) => column.expression)).toEqual(renderedColumns);
    const predicate = member.createSql.slice(member.createSql.indexOf(") WHERE ") + 8);
    if ((definition.where as string | undefined) === undefined) {
      expect(member.createSql.includes(" WHERE ")).toBe(false);
    } else {
      expect(definition.where).toBe(predicate);
    }
  }
  // The snapshot's NEW index names are exactly the manifest's, in no other
  // order than the manifest's own; the preserved member is not new.
  const previousIndexes = indexesOf(readSnapshot("0080_detail_page_v2_backfill"));
  const fresh = Object.keys(indexes)
    .filter((name) => previousIndexes[name] === undefined)
    .sort();
  expect(fresh).toEqual(TASK551_ONLINE_INDEX_MEMBERS.map((member) => member.name).sort());
});

test("the preserved revision index stays byte-identical and is never a manifest build", () => {
  const before = indexesOf(readSnapshot("0080_detail_page_v2_backfill"))[PRESERVED_MEMBER];
  const after = indexesOf(readSnapshot(MIGRATION_TAG))[PRESERVED_MEMBER];
  expect(before).toBeDefined();
  expect(after).toEqual(before);
  expect(TASK551_ONLINE_INDEX_MEMBERS.some((member) => member.name === PRESERVED_MEMBER)).toBe(
    false
  );
});

test("the four composite FK targets are unique constraints, not manifest members", () => {
  const file = readSnapshot(MIGRATION_TAG);
  const runs = tablesOf(file)["public.solution_kit_install_runs"] as Json;
  const evidence = tablesOf(file)["public.solution_kit_legacy_template_evidence"] as Json;
  for (const name of TASK551_ASSERTED_UNIQUE_CONSTRAINTS.slice(0, 3)) {
    expect(Object.keys((runs.uniqueConstraints ?? {}) as Json)).toContain(name);
  }
  expect(Object.keys((evidence.uniqueConstraints ?? {}) as Json)).toContain(
    TASK551_ASSERTED_UNIQUE_CONSTRAINTS[3]
  );
  for (const name of TASK551_ASSERTED_UNIQUE_CONSTRAINTS) {
    expect(indexesOf(file)[name]).toBeUndefined();
    expect(TASK551_ONLINE_INDEX_MEMBERS.some((member) => member.name === name)).toBe(false);
  }
});

test("the snapshot records the exact generated search expression bytes", () => {
  const file = readSnapshot(MIGRATION_TAG);
  const vectorTables: readonly [string, keyof typeof SEARCH_VECTOR_SQL][] = [
    ["public.pages", "pages"],
    ["public.content_entries", "entries"],
    ["public.posts", "posts"],
    ["public.media", "media"],
    ["public.users", "users"],
    ["public.assistant_docs", "assistantDocs"],
    ["public.assistant_doc_chunks", "assistantDocChunks"],
  ];
  for (const [table, source] of vectorTables) {
    const bytes = SEARCH_VECTOR_SQL[source];
    const columns = (tablesOf(file)[table]?.columns ?? {}) as Json;
    const column = columns.search_vector as Json;
    expect(column.type).toBe("tsvector");
    expect(column.notNull).toBe(false);
    expect((column.generated as Json).type).toBe("stored");
    expect((column.generated as Json).as).toBe(bytes);
    expect(indexesOf(file)[`${SEARCH_VECTOR_TABLE_NAMES[source]}_search_vector_idx`]).toBeDefined();
  }
  const trigramTables: readonly [string, keyof typeof TRIGRAM_SOURCE_BYTES][] = [
    ["public.pages", "pages"],
    ["public.content_entries", "entries"],
    ["public.posts", "posts"],
    ["public.media", "media"],
    ["public.users", "users"],
  ];
  for (const [table, source] of trigramTables) {
    const columns = (tablesOf(file)[table]?.columns ?? {}) as Json;
    const column = columns.search_trigram_text as Json;
    expect(column.type).toBe("text");
    expect((column.generated as Json).type).toBe("stored");
    expect((column.generated as Json).as).toBe(
      task551TrigramNormalizedSql(task551TrigramSourceBytes(source))
    );
  }
});

/** The five trigram source bytes, spelled here so the snapshot is measured, not echoed. */
const TRIGRAM_SOURCE_BYTES = {
  pages: "coalesce(title, '') || ' ' || coalesce(slug, '')",
  entries:
    "coalesce(title, '') || ' ' || coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')",
  posts:
    "coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')",
  media:
    "coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(key, '')",
  users: "coalesce(name, '')",
} as const;

const task551TrigramSourceBytes = (source: keyof typeof TRIGRAM_SOURCE_BYTES): string =>
  TRIGRAM_SOURCE_BYTES[source];

test("the snapshot has no fake representation of the exclusion constraint", () => {
  const file = readSnapshot(MIGRATION_TAG);
  expect(readFileSync(snapshotPath(MIGRATION_TAG), "utf8")).not.toContain("EXCLUDE");
  for (const table of Object.values(tablesOf(file))) {
    expect(Object.keys((table.checkConstraints ?? {}) as Json)).not.toContain(
      TASK551_EXCLUSION_CONSTRAINT_NAME
    );
  }
});

testIfDb("every live member definition equals its transactional rendering", async () => {
  for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
    const result = await db.execute<{ indexdef: string }>(
      sql`select pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relname = ${member.name}`
    );
    const rows = (result as unknown as { rows: { indexdef: string }[] }).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toBe(transactionalDefinition(member.createSql));
  }
});
