import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";

import * as schema from "../../../core/db/schema";

/**
 * `core/db/schema.ts` is a thin facade that re-exports one domain module per area
 * from `core/db/tables/`. That re-export surface is load-bearing in a way nothing
 * else in the build catches:
 *
 *   - `core/db/drizzle.config.ts` points drizzle-kit at `core/db/schema.ts`, so
 *     drizzle-kit discovers the tables THROUGH the facade. A missing or misspelled
 *     `export *` line still type-checks and still imports — it just hides a table,
 *     and the next `db:generate` would emit a DROP TABLE for it.
 *   - `core/db/client.ts` builds its drizzle instance from
 *     `import * as schema from "./schema"`, so a hidden table is also missing from
 *     the schema metadata the query builder receives.
 *
 * So this asserts the facade's projection against the newest committed migration
 * snapshot, which is the authoritative record of what the database actually has.
 * The expectation is DERIVED from that snapshot rather than hand-pinned, so it
 * cannot rot into a stale list of names, and it doubles as a standing guard that
 * the schema and the migrations never silently diverge.
 *
 * Deliberately DB-free: `core/db/schema.ts` imports no client, so unlike the
 * sibling per-area `schema.test.ts` files under `tests/unit` this needs no
 * `DATABASE_URL` and never skips.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../core/db/migrations/", import.meta.url));

type JournalEntry = { idx: number; tag: string };
type Journal = { entries: JournalEntry[] };

type SnapshotColumn = {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  default?: string;
};
type SnapshotIndexColumn = { expression: string; isExpression: boolean; opclass?: string };
type SnapshotIndex = {
  name: string;
  columns: SnapshotIndexColumn[];
  isUnique: boolean;
  method?: string;
};
type SnapshotForeignKey = {
  name: string;
  tableTo: string;
  columnsFrom: string[];
  columnsTo: string[];
  onDelete?: string;
  onUpdate?: string;
};
type SnapshotCompositePrimaryKey = { name?: string; columns: string[] };
type SnapshotUniqueConstraint = { name: string; columns: string[] };
type SnapshotTable = {
  name: string;
  columns: Record<string, SnapshotColumn>;
  indexes: Record<string, SnapshotIndex>;
  foreignKeys: Record<string, SnapshotForeignKey>;
  compositePrimaryKeys: Record<string, SnapshotCompositePrimaryKey>;
  uniqueConstraints?: Record<string, SnapshotUniqueConstraint>;
};
type Snapshot = { tables: Record<string, SnapshotTable> };

const readJournal = (file: string): Journal => JSON.parse(readFileSync(file, "utf8"));
const readSnapshot = (file: string): Snapshot => JSON.parse(readFileSync(file, "utf8"));

const latestSnapshot = (): Snapshot => {
  const journal = readJournal(path.join(MIGRATIONS_DIR, "meta/_journal.json"));
  const newest = journal.entries.reduce((best, entry) => (entry.idx > best.idx ? entry : best));
  const idx = String(newest.idx).padStart(4, "0");
  return readSnapshot(path.join(MIGRATIONS_DIR, `meta/${idx}_snapshot.json`));
};

/**
 * A table's shape reduced to sorted, comparable strings. Sorting means a pure
 * reordering — which is all that relocating a declaration into a domain module
 * does — is not reported as a difference, while a renamed column, a dropped
 * index, a changed index method, a lost operator class or a flipped `onDelete`
 * is.
 */
type TableShape = {
  columns: string[];
  indexes: string[];
  foreignKeys: string[];
  compositePrimaryKeys: string[];
  uniqueConstraints: string[];
};

const shapeFromSnapshot = (table: SnapshotTable): TableShape => ({
  columns: Object.values(table.columns)
    .map(
      (column) =>
        `${column.name}:${column.type}:${column.notNull ? "notNull" : "nullable"}` +
        `:${column.primaryKey ? "pk" : "-"}:${column.default === undefined ? "-" : "default"}`
    )
    .sort(),
  indexes: Object.values(table.indexes)
    .map(
      (index) =>
        `${index.name}:${index.method ?? "btree"}:${index.isUnique ? "unique" : "plain"}:` +
        index.columns
          .map((column) => `${column.expression}${column.opclass ? `(${column.opclass})` : ""}`)
          .join("+")
    )
    .sort(),
  foreignKeys: Object.values(table.foreignKeys)
    .map(
      (key) =>
        `${key.name}:${key.columnsFrom.join("+")}->${key.tableTo}.${key.columnsTo.join("+")}` +
        `:onDelete=${key.onDelete ?? "no action"}:onUpdate=${key.onUpdate ?? "no action"}`
    )
    .sort(),
  compositePrimaryKeys: Object.values(table.compositePrimaryKeys)
    .map((key) => key.columns.join("+"))
    .sort(),
  uniqueConstraints: Object.values(table.uniqueConstraints ?? {})
    .map((constraint) => `${constraint.name}:${constraint.columns.join("+")}`)
    .sort(),
});

type LiveTableConfig = ReturnType<typeof getTableConfig>;

const shapeFromDeclaration = (config: LiveTableConfig): TableShape => ({
  columns: config.columns
    .map(
      (column) =>
        `${column.name}:${column.getSQLType()}:${column.notNull ? "notNull" : "nullable"}` +
        `:${column.primary ? "pk" : "-"}:${column.hasDefault ? "default" : "-"}`
    )
    .sort(),
  indexes: config.indexes
    .map((index) => {
      const columns = index.config.columns
        .map((column) => {
          if (!is(column, PgTable) && "name" in column && typeof column.name === "string") {
            const opClass = "indexConfig" in column ? column.indexConfig?.opClass : undefined;
            return `${column.name}${opClass ? `(${opClass})` : ""}`;
          }
          return "expression";
        })
        .join("+");
      const method = index.config.method ?? "btree";
      return `${index.config.name}:${method}:${index.config.unique ? "unique" : "plain"}:${columns}`;
    })
    .sort(),
  foreignKeys: config.foreignKeys
    .map((key) => {
      const reference = key.reference();
      const to = getTableConfig(reference.foreignTable).name;
      return (
        `${key.getName()}:${reference.columns.map((column) => column.name).join("+")}` +
        `->${to}.${reference.foreignColumns.map((column) => column.name).join("+")}` +
        `:onDelete=${key.onDelete ?? "no action"}:onUpdate=${key.onUpdate ?? "no action"}`
      );
    })
    .sort(),
  compositePrimaryKeys: config.primaryKeys
    .map((key) => key.columns.map((column) => column.name).join("+"))
    .sort(),
  // A column-level `.unique()` never lands in `uniqueConstraints`; drizzle keeps
  // it on the column, while the snapshot renders both forms identically.
  uniqueConstraints: [
    ...config.uniqueConstraints.map(
      (constraint) => `${constraint.name}:${constraint.columns.map((c) => c.name).join("+")}`
    ),
    ...config.columns
      .filter((column) => column.isUnique)
      .map(
        (column) => `${column.uniqueName ?? `${config.name}_${column.name}_unique`}:${column.name}`
      ),
  ].sort(),
});

const declaredTables = (): Map<string, LiveTableConfig> => {
  const found = new Map<string, LiveTableConfig>();
  for (const exported of Object.values(schema)) {
    if (!is(exported, PgTable)) continue;
    const config = getTableConfig(exported);
    found.set(config.name, config);
  }
  return found;
};

describe("core/db/schema.ts facade", () => {
  const snapshot = latestSnapshot();
  const expectedShapes = new Map(
    Object.values(snapshot.tables).map((table) => [table.name, shapeFromSnapshot(table)])
  );
  const declared = declaredTables();

  test("re-exports every table the migration snapshot records, and no others", () => {
    expect([...declared.keys()].sort()).toEqual([...expectedShapes.keys()].sort());
  });

  test("re-exports exactly as many tables as the snapshot has", () => {
    expect(expectedShapes.size).toBeGreaterThan(0);
    expect(declared.size).toBe(expectedShapes.size);
  });

  for (const [name, expectedShape] of expectedShapes) {
    test(`declares ${name} exactly as the migration snapshot records it`, () => {
      const config = declared.get(name);
      if (!config) throw new Error(`table ${name} is not reachable through core/db/schema.ts`);
      expect(shapeFromDeclaration(config)).toEqual(expectedShape);
    });
  }
});
