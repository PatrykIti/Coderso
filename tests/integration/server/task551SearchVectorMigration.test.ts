import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../../../core/db/bookingReservationExclusion";
import {
  GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
  SEARCH_VECTOR_COLUMN,
  SEARCH_VECTOR_MEMBERS,
  SEARCH_VECTOR_SQL,
  task551TrigramNormalizedSql,
  TRIGRAM_COLUMN,
  TRIGRAM_INDEXED_SOURCE_CONTRACT,
  TRIGRAM_SOURCE_SQL,
} from "../../../core/db/searchVectorDefinitions";
import {
  assistantDocChunks,
  assistantDocs,
  contentEntries,
  media,
  pages,
  posts,
  users,
} from "../../../core/db/schema";

/**
 * TASK-551-05-L01 search-vector byte identity, schema → migration → snapshot →
 * query needle.
 *
 * A generated column is only as trustworthy as the agreement between the four
 * places its expression lives. Before PostgreSQL parses anything, the four
 * renders are compared byte-for-byte with no whitespace canonicalization: the
 * Drizzle column definition, the `ALTER TABLE ... ADD COLUMN` literal in the
 * migration, the newest snapshot's `generated.as`, and the query-side
 * normalizer. Live `pg_get_expr` is the additional catalog-semantic check, and
 * the closed immutable dependency list is resolved in `pg_proc` so a stable or
 * volatile dependency aborts the rollout before the first generated column.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../../core/db/migrations");
const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox";
const ONLINE_TAG = "0081_task551_online_indexes";

type Json = Record<string, unknown>;

const migrationSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${MIGRATION_TAG}.sql`), "utf8");

const companionSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8");

const snapshot = (): Json =>
  JSON.parse(
    readFileSync(
      path.join(MIGRATIONS_DIR, `meta/${MIGRATION_TAG.split("_")[0]}_snapshot.json`),
      "utf8"
    )
  ) as Json;

/**
 * The expression bytes as the Drizzle definition itself renders them: a
 * generated `as` is a single SQL fragment whose chunks carry the literal, and a
 * nested `sql.raw(...)` fragment is its own SQL chunk, so recursing into it and
 * joining the StringChunk values reconstructs exactly what the migrator
 * executes. This mirrors drizzle-orm 0.45.2 `buildQueryFromSourceParams`
 * (StringChunk joins `value`; a nested SQL recurses into `queryChunks`).
 */
const renderedSchemaExpression = (column: unknown): string => {
  const render = (chunk: unknown): string => {
    const node = chunk as { value?: unknown; queryChunks?: unknown[] };
    if (Array.isArray(node.value)) return node.value.map(String).join("");
    return (node.queryChunks ?? []).map(render).join("");
  };
  const generated = (column as { generated?: { as?: { queryChunks?: unknown[] } } }).generated;
  return (generated?.as?.queryChunks ?? []).map(render).join("");
};

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

const VECTOR_MEMBERS: readonly [unknown, string, string][] = [
  [pages, "pages", SEARCH_VECTOR_SQL.pages],
  [contentEntries, "entries", SEARCH_VECTOR_SQL.entries],
  [posts, "posts", SEARCH_VECTOR_SQL.posts],
  [media, "media", SEARCH_VECTOR_SQL.media],
  [users, "users", SEARCH_VECTOR_SQL.users],
  [assistantDocs, "assistantDocs", SEARCH_VECTOR_SQL.assistantDocs],
  [assistantDocChunks, "assistantDocChunks", SEARCH_VECTOR_SQL.assistantDocChunks],
];

const TRIGRAM_MEMBERS: readonly [unknown, keyof typeof TRIGRAM_SOURCE_SQL][] = [
  [pages, "pages"],
  [contentEntries, "entries"],
  [posts, "posts"],
  [media, "media"],
  [users, "users"],
];

const snapshotColumn = (physicalTable: string, column: string): Json => {
  const file = snapshot();
  const table = (file.tables as Json)[`public.${physicalTable}`] as Json;
  return ((table.columns ?? {}) as Json)[column] as Json;
};

test("each vector definition, migration literal, snapshot and index target agree byte-for-byte", () => {
  const sqlText = migrationSql();
  for (const [table, source, bytes] of VECTOR_MEMBERS) {
    const member = SEARCH_VECTOR_MEMBERS[source as keyof typeof SEARCH_VECTOR_MEMBERS];
    expect(renderedSchemaExpression((table as Json).searchVector)).toBe(bytes);
    const literal = `GENERATED ALWAYS AS (${bytes}) STORED`;
    expect(sqlText.includes(literal)).toBe(true);
    const snapshotColumnValue = snapshotColumn(member.table, SEARCH_VECTOR_COLUMN);
    expect((snapshotColumnValue.generated as Json).as).toBe(bytes);
    expect((snapshotColumnValue.generated as Json).type).toBe("stored");
    // The GIN index targets exactly this column, in both representations.
    const companionLine = companionSql()
      .split("\n")
      .find((line) => line.includes(`"${member.index}"`));
    expect(companionLine).toBe(
      `CREATE INDEX CONCURRENTLY "${member.index}" ON "${member.table}" USING gin ("${SEARCH_VECTOR_COLUMN}");`
    );
  }
});

test("each trigram column, its normalization and its gin_trgm_ops index agree byte-for-byte", () => {
  const sqlText = migrationSql();
  for (const [table, source] of TRIGRAM_MEMBERS) {
    const member = TRIGRAM_INDEXED_SOURCE_CONTRACT[source];
    if (member === null) {
      // A rejected candidate lands neither column nor index anywhere.
      expect(sqlText.includes(`"${TRIGRAM_COLUMN}"`)).toBe(false);
      continue;
    }
    const expected = task551TrigramNormalizedSql(TRIGRAM_SOURCE_SQL[source]);
    expect(renderedSchemaExpression((table as Json).searchTrigramText)).toBe(expected);
    expect(sqlText.includes(`GENERATED ALWAYS AS (${expected}) STORED`)).toBe(true);
    const snapshotColumnValue = snapshotColumn(member.table, TRIGRAM_COLUMN);
    expect((snapshotColumnValue.generated as Json).as).toBe(expected);
    const companionLine = companionSql()
      .split("\n")
      .find((line) => line.includes(`"${member.index}"`));
    expect(companionLine).toBe(
      `CREATE INDEX CONCURRENTLY "${member.index}" ON "${member.table}" USING gin ("${TRIGRAM_COLUMN}" gin_trgm_ops);`
    );
  }
});

test("email and the email hash never enter a users search expression", () => {
  const sqlText = migrationSql();
  // Drizzle writes one statement per line and puts the `--> statement-breakpoint`
  // marker inline at the end of the statement's own line, so the exact-line
  // comparison splits the migration bytes by newline.
  const usersAddColumns = sqlText
    .split("\n")
    .filter((line) => line.startsWith('ALTER TABLE "users" ADD COLUMN'));
  expect(usersAddColumns).toHaveLength(2);
  for (const statement of usersAddColumns) {
    expect(statement.includes("email")).toBe(false);
    expect(statement.includes("email_hash")).toBe(false);
  }
});

test("the closed immutable dependency list is the only function surface the literals use", () => {
  const allowed = GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES.map(
    (signature) => signature.split("(")[0]
  );
  const literalBytes = [...Object.values(SEARCH_VECTOR_SQL), ...Object.values(TRIGRAM_SOURCE_SQL)]
    .map((bytes) => task551TrigramNormalizedSql(bytes))
    .join(" ");
  const functions = new Set([...literalBytes.matchAll(/([a-z_]+)\(/g)].map((match) => match[1]));
  for (const name of functions) {
    // Contract (:755-764): `coalesce` is a parser construct rather than a
    // `pg_proc` member, so it is checked by the exact-expression guards above,
    // never resolved through `GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES`.
    if (name === "coalesce") continue;
    expect(allowed).toContain(name);
  }
  expect(functions.has("concat")).toBe(false);
});

test("no generated artifact carries a second exclusion add or its reverse", () => {
  const sqlText = migrationSql();
  expect(sqlText.split(BOOKING_RESERVATION_EXCLUSION_SQL.addSql).length - 1).toBe(1);
  expect(sqlText.includes(BOOKING_RESERVATION_EXCLUSION_SQL.dropSql)).toBe(false);
  expect(companionSql().includes("EXCLUDE")).toBe(false);
});

testIfDb("every stored generated column renders its exact bytes in the catalog", async () => {
  for (const [_table, source, bytes] of VECTOR_MEMBERS) {
    const member = SEARCH_VECTOR_MEMBERS[source as keyof typeof SEARCH_VECTOR_MEMBERS];
    const result = await db.execute<{ expression: string }>(
      sql`select pg_get_expr(ad.adbin, ad.adrelid) as expression
          from pg_attrdef ad join pg_class c on c.oid = ad.adrelid
          join pg_attribute a on a.attrelid = c.oid and a.attname = ${SEARCH_VECTOR_COLUMN}
          where c.relname = ${member.table}`
    );
    const rows = (result as unknown as { rows: { expression: string }[] }).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].expression.replace(/\s+/g, " ")).toBe(bytes);
  }
});

testIfDb("every immutable dependency resolves to exactly one immutable function", async () => {
  for (const signature of GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES) {
    const result = await db.execute<{ provolatile: string }>(
      sql`select p.provolatile from pg_proc p
          where p.oid = to_regprocedure(${signature})`
    );
    const rows = (result as unknown as { rows: { provolatile: string }[] }).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].provolatile).toBe("i");
  }
});

testIfDb("the text concatenation and jsonb text output operators resolve immutably", async () => {
  const operatorSignatures: readonly [string, string, string][] = [
    ["text || text", "textcat(text,text)", "||"],
    ["tsvector || tsvector", "tsvector_concat(tsvector,tsvector)", "||"],
    ["jsonb ->> text", "jsonb_object_field_text(jsonb,text)", "->>"],
  ];
  for (const [signature, expectedImplementation] of operatorSignatures) {
    const result = await db.execute<{ provolatile: string }>(
      sql`select p.provolatile from pg_operator o join pg_proc p on p.oid = o.oprcode
          where o.oid = to_regoperator(${signature})`
    );
    const rows = (result as unknown as { rows: { provolatile: string }[] }).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].provolatile).toBe("i");
    const implementation = await db.execute<{ proname: string }>(
      sql`select p.proname from pg_operator o join pg_proc p on p.oid = o.oprcode
          where o.oid = to_regoperator(${signature})`
    );
    expect(
      expectedImplementation.startsWith(
        ((implementation as unknown as { rows: { proname: string }[] }).rows[0]?.proname ?? "") +
          "("
      )
    ).toBe(true);
  }
});
