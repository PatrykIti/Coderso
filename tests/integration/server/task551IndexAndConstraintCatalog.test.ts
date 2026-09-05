import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../../../core/db/bookingReservationExclusion";
import {
  TASK551_ASSERTED_UNIQUE_CONSTRAINTS,
  TASK551_EXCLUSION_CONSTRAINT_NAME,
  TASK551_ONLINE_INDEX_MEMBERS,
} from "../../../tests/perf/fixtures/task551OnlineIndexManifest";

/**
 * TASK-551-05-L01 catalog pins.
 *
 * The manifest owns executable bytes and the snapshot owns the description;
 * only the live catalog proves PostgreSQL actually stores what both claim, so
 * this suite pins the catalog twice:
 *
 *   - statically (no database): every new member's column order, sort/null
 *     order, opclass and predicate bytes as the newest snapshot records them,
 *     plus the constraint names the migration installs and the exclusion's
 *     single documented snapshot exception;
 *   - live (skipped without a database): `pg_get_indexdef` for every member,
 *     the `pg_constraint` row of the exclusion (`contype = 'x'`, exact name,
 *     table, predicate, GiST access method, equality/overlap operators), the
 *     `btree_gist` extension, the four composite FK-target unique constraints,
 *     and the preserved `content_revisions_entry_version_idx` member.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../../core/db/migrations");
const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox";
const PRESERVED_MEMBER = "content_revisions_entry_version_idx";

type Json = Record<string, unknown>;

const snapshot = (): Json =>
  JSON.parse(
    readFileSync(
      path.join(MIGRATIONS_DIR, `meta/${MIGRATION_TAG.split("_")[0]}_snapshot.json`),
      "utf8"
    )
  ) as Json;

const migrationSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${MIGRATION_TAG}.sql`), "utf8");

const snapshotIndex = (physicalTable: string, name: string): Json => {
  const table = ((snapshot().tables as Json)[`public.${physicalTable}`] ?? {}) as Json;
  return (((table.indexes ?? {}) as Json)[name] ?? {}) as Json;
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

const AUTHOR_COMPOSITES: readonly [string, string, string[]][] = [
  ["pages", "pages_author_list_updated_id_idx", ["author_id", "updated_at", "id"]],
  [
    "content_entries",
    "content_entries_author_list_updated_id_idx",
    ["author_id", "updated_at", "id"],
  ],
  [
    "content_entries",
    "content_entries_type_author_list_updated_id_idx",
    ["type_id", "author_id", "updated_at", "id"],
  ],
  ["posts", "posts_author_list_updated_id_idx", ["author_id", "updated_at", "id"]],
];

test("every page/entry/post author composite is pinned with its exact descending list shape", () => {
  for (const [table, name, columns] of AUTHOR_COMPOSITES) {
    const index = snapshotIndex(table, name);
    expect(index.method).toBe("btree");
    expect(index.isUnique).toBe(false);
    const recorded = (index.columns as { expression: string }[]).map((column) =>
      column.expression.replace(/"/g, "").replace(/ desc$/, "")
    );
    expect(recorded).toEqual(columns);
    // Every trailing key-desc composite ends `updated_at desc, id desc`.
    expect(
      (index.columns as { expression: string }[]).slice(-2).map((column) => column.expression)
    ).toEqual(['"updated_at" desc', '"id" desc']);
  }
});

test("the role-leading user_roles index leads with role_id", () => {
  const index = snapshotIndex("user_roles", "user_roles_role_user_idx");
  expect((index.columns as { expression: string }[]).map((column) => column.expression)).toEqual([
    "role_id",
    "user_id",
  ]);
});

test("the webhook traversal index keeps webhook_id first, then created_at desc, id desc", () => {
  const index = snapshotIndex("webhook_deliveries", "webhook_deliveries_webhook_list_idx");
  expect(
    (index.columns as { expression: string }[]).map((column) =>
      column.expression.replace(/"/g, "").replace(/ desc$/, "")
    )
  ).toEqual(["webhook_id", "created_at", "id"]);
});

test("the three TASK-551 jsonb_path_ops containment indexes land with exact opclasses", () => {
  const members: readonly [string, string, string][] = [
    ["webhooks", "webhooks_events_gin_idx", "events"],
    ["media", "media_tags_gin_idx", "tags"],
    ["posts", "posts_tags_gin_idx", "tags"],
  ];
  for (const [table, name, column] of members) {
    const index = snapshotIndex(table, name);
    expect(index.method).toBe("gin");
    expect(index.columns as { expression: string; opclass?: string }[]).toEqual([
      {
        expression: column,
        isExpression: false,
        asc: true,
        nulls: "last",
        opclass: "jsonb_path_ops",
      },
    ]);
    const member = TASK551_ONLINE_INDEX_MEMBERS.find((entry) => entry.name === name);
    expect(member?.createSql).toBe(
      `CREATE INDEX CONCURRENTLY "${name}" ON "${table}" USING gin ("${column}" jsonb_path_ops);`.replace(
        /;$/,
        ""
      )
    );
  }
});

test("the four composite FK targets are unique constraints the migration installs once", () => {
  const sqlText = migrationSql();
  for (const name of TASK551_ASSERTED_UNIQUE_CONSTRAINTS) {
    // Drizzle installs a unique constraint as `ADD CONSTRAINT` on an existing
    // table and as an inline `CONSTRAINT` inside the CREATE TABLE it generates
    // for a new one; either byte form carries the same `UNIQUE(...)` exactly once.
    expect(sqlText.match(new RegExp(`CONSTRAINT "${name}" UNIQUE\\(`, "g")) ?? []).toHaveLength(1);
    expect(TASK551_ONLINE_INDEX_MEMBERS.some((member) => member.name === name)).toBe(false);
  }
});

test("the exclusion is the one object the snapshot cannot describe", () => {
  expect(
    readFileSync(
      path.join(MIGRATIONS_DIR, `meta/${MIGRATION_TAG.split("_")[0]}_snapshot.json`),
      "utf8"
    )
  ).not.toContain(TASK551_EXCLUSION_CONSTRAINT_NAME);
  expect(migrationSql()).toContain(BOOKING_RESERVATION_EXCLUSION_SQL.addSql);
  expect(migrationSql()).toContain(BOOKING_RESERVATION_EXCLUSION_SQL.extensionSql);
});

testIfDb("every member's catalog definition equals its transactional rendering", async () => {
  const transactional = (createSql: string): string => createSql.replace(/ CONCURRENTLY/, "");
  for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
    const result = await db.execute<{ indexdef: string }>(
      sql`select pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relname = ${member.name}`
    );
    const rows = (result as unknown as { rows: { indexdef: string }[] }).rows;
    expect(rows, member.name).toHaveLength(1);
    expect(rows[0].indexdef).toBe(transactional(member.createSql));
  }
});

testIfDb("the preserved revision index stays byte-identical in the catalog", async () => {
  const result = await db.execute<{ indexdef: string }>(
    sql`select pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relname = ${PRESERVED_MEMBER}`
  );
  const rows = (result as unknown as { rows: { indexdef: string }[] }).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].indexdef).toBe(
    "CREATE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)"
  );
});

testIfDb(
  "the exclusion exists as a GiST exclusion constraint with its exact predicate",
  async () => {
    const result = await db.execute<{
      contype: string;
      pg_get_constraintdef: string;
      amname: string;
    }>(
      sql`select c.contype, pg_get_constraintdef(c.oid) as pg_get_constraintdef, am.amname
        from pg_constraint c
        join pg_class rel on rel.oid = c.conrelid
        join pg_am am on am.oid = c.conindid
        where c.conname = ${TASK551_EXCLUSION_CONSTRAINT_NAME} and rel.relname = 'bookings'`
    );
    const rows = (
      result as unknown as {
        rows: { contype: string; pg_get_constraintdef: string; amname: string }[];
      }
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].contype).toBe("x");
    expect(rows[0].amname).toBe("gist");
    expect(rows[0].pg_get_constraintdef).toContain("resource_id WITH =");
    expect(rows[0].pg_get_constraintdef).toContain("tsrange(starts_at, ends_at, '[)') WITH &&");
    expect(rows[0].pg_get_constraintdef).toContain(BOOKING_RESERVATION_EXCLUSION_SQL.predicate);
  }
);

testIfDb(
  "btree_gist backs the exclusion and no other TASK-551 constraint was invented",
  async () => {
    const extension = await db.execute<{ extname: string }>(
      sql`select extname from pg_extension where extname = 'btree_gist'`
    );
    expect(((extension as unknown as { rows: { extname: string }[] }).rows ?? []).length).toBe(1);
    const unexpected = await db.execute<{ conname: string }>(
      sql`select conname from pg_constraint where conname like 'cache_invalidation_outbox%' and contype <> 'c'`
    );
    expect((unexpected as unknown as { rows: { conname: string }[] }).rows ?? []).toEqual([]);
  }
);

testIfDb("the four unique constraints exist as constraints, not indexes", async () => {
  const result = await db.execute<{ conname: string; contype: string }>(
    sql`select conname, contype from pg_constraint
        where conname = any(${[...TASK551_ASSERTED_UNIQUE_CONSTRAINTS]})`
  );
  const rows = (result as unknown as { rows: { conname: string; contype: string }[] }).rows;
  expect(rows.map((row) => row.conname).sort()).toEqual(
    [...TASK551_ASSERTED_UNIQUE_CONSTRAINTS].sort()
  );
  for (const row of rows) expect(row.contype).toBe("u");
});
