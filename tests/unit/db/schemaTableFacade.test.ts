import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";
import { generateDrizzleJson } from "drizzle-kit/api";

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
 * The projection is `generateDrizzleJson` — the same serializer the drizzle-kit
 * CLI runs — so the two sides of every comparison are the same kind of object:
 * the snapshot JSON `db:generate` WOULD write, against the snapshot JSON it DID
 * write. Nothing here paraphrases a table declaration, which matters because a
 * paraphrase only compares the fields it thought to look at: an earlier version
 * of this file reduced every column default to the bare word `default`, so
 * turning `.default("draft")` into `.default("published")` — an
 * `ALTER COLUMN ... SET DEFAULT` that `db:generate` must emit — kept the guard
 * green. Compared as snapshot JSON, defaults, check constraints, index sort
 * order and `nullsNotDistinct` all carry their real values.
 *
 * The price of that fidelity, stated plainly: the guard is now exactly as stable
 * as drizzle-kit's internal snapshot format. A drizzle-kit bump that adds one
 * table-level field makes the generated side carry a leaf the committed snapshot
 * lacks, so the failure mode is all ~79 per-table tests red at once with zero
 * schema drift. The fix then is to re-run `bun run db:generate` and commit the
 * reprojected snapshot, not to loosen the comparison. Pinning `version`/`dialect`
 * was deliberately NOT done — it would trade this loud, obvious failure for a red
 * lane on every legitimate upgrade without telling you what changed.
 *
 * One thing this comparison structurally cannot see, stated so nobody mistakes a
 * green run here for a guarded schema: `.$type<...>()`. It is erased before either
 * snapshot exists, so `jsonb("context").$type<X>()` and `jsonb("context")`
 * serialise identically and a column's TypeScript contract can be changed -- or
 * deleted -- without moving one leaf. Those contracts are pinned by
 * `schemaColumnTypeContracts.test.ts` instead, at the type level, where they live.
 *
 * Deliberately DB-free: `core/db/schema.ts` imports no client and
 * `generateDrizzleJson` connects to nothing, so unlike the sibling per-area
 * `schema.test.ts` files under `tests/unit` this needs no `DATABASE_URL` and
 * never skips. `drizzle-kit` is declared in `core/package.json` and reaches this
 * root-lane file through `bunfig.toml`'s hoisted linker — the same route the
 * previous version of this file used for `drizzle-orm`, so a linker change would
 * break both alike.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../core/db/migrations/", import.meta.url));

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** The snapshot sections that describe schema objects other than tables. */
type SchemaSection = "enums" | "schemas" | "sequences" | "roles" | "policies" | "views";

const SCHEMA_SECTIONS: readonly SchemaSection[] = [
  "enums",
  "schemas",
  "sequences",
  "roles",
  "policies",
  "views",
];

/**
 * A drizzle-kit snapshot, typed only as deeply as this file walks it. Everything
 * under a section stays `JsonValue` on purpose: the comparison is structural, so
 * re-declaring drizzle-kit's own column/index/constraint shapes here would only
 * add a second place for the format to drift — and a field left out of such a
 * re-declaration is a field the guard stops comparing.
 */
type SnapshotFile = { id: string; prevId: string; tables: Record<string, JsonValue> } & {
  [Section in SchemaSection]: Record<string, JsonValue>;
};

type JournalEntry = { idx: number; tag: string };
type Journal = { entries: JournalEntry[] };

const readJournal = (file: string): Journal => JSON.parse(readFileSync(file, "utf8"));
const readSnapshot = (file: string): SnapshotFile => JSON.parse(readFileSync(file, "utf8"));

const snapshotPath = (idx: number): string =>
  path.join(MIGRATIONS_DIR, `meta/${String(idx).padStart(4, "0")}_snapshot.json`);

/**
 * Journal `idx` is the sequential position in `_journal.json`, while the
 * snapshot filename uses the migration NUMBER (the zero-padded numeric prefix
 * of the tag, e.g. `0076_content_revisions_version_uniq` -> `0076_snapshot.json`).
 * Drizzle-kit chains snapshots by `prevId` over the lexically sorted
 * `NNNN_snapshot.json` files, so the number, not the journal position, is the
 * filename key. The two coincide for every pre-concurrency migration.
 */
const snapshotPathForEntry = (entry: { tag: string }): string =>
  snapshotPath(Number(entry.tag.split("_")[0]));

/** Journal entries oldest first, so the last two are the newest step's pair. */
const journalEntries = (): JournalEntry[] =>
  readJournal(path.join(MIGRATIONS_DIR, "meta/_journal.json"))
    .entries.slice()
    .sort((left, right) => left.idx - right.idx);

let facadeCache: SnapshotFile | null = null;

/**
 * What `bun run db:generate` would write for the schema it reaches through the
 * facade. The spread hands drizzle-kit a plain object of the facade's own
 * exports — the same bindings its CLI collects from the same module — and the
 * `JSON.stringify` round trip is what makes the comparison literal: the value
 * compared is the value that would land on disk.
 *
 * Called from inside the tests rather than at collection time, and memoised so
 * the ~79 callers pay for it once: drizzle-kit reports a malformed schema by
 * throwing (or, in places, by `process.exit`), and doing that during collection
 * would kill the whole file with a library stack trace instead of failing a
 * named test.
 */
const facadeSnapshot = (): SnapshotFile => {
  const cached = facadeCache;
  if (cached !== null) return cached;
  const generated: SnapshotFile = JSON.parse(JSON.stringify(generateDrizzleJson({ ...schema })));
  facadeCache = generated;
  return generated;
};

/**
 * A snapshot fragment reduced to a sorted list of `path=json` leaves.
 *
 * Sorting means a pure reordering — which is all that relocating a declaration
 * into a domain module does — is not reported as a difference, while every leaf
 * value is. Array positions stay in the path (`columns[0]`), so the order of an
 * index's or a composite key's columns, which SQL cares about, still counts.
 * Empty containers contribute no leaf, so `with: {}` and an absent `with` read
 * alike — they are also alike to drizzle-kit's diff, which emits nothing for
 * either.
 */
const shapeFromSnapshot = (value: JsonValue): string[] => {
  const leaves: string[] = [];
  const walk = (node: JsonValue, at: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${at}[${index}]`));
      return;
    }
    if (node !== null && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) walk(child, at ? `${at}.${key}` : key);
      return;
    }
    leaves.push(`${at}=${JSON.stringify(node)}`);
  };
  walk(value, "");
  return leaves.sort();
};

/**
 * Tables the newest snapshot stops recording without the migration beside it
 * saying so, by name as the snapshot keys them.
 *
 * The facade guard above derives its expectation from the newest snapshot, so it
 * cannot see a table deleted from BOTH the facade and that snapshot — the ruler
 * and the thing measured would have moved together. The predecessor snapshot and
 * the migration SQL NARROW that, they do not close it: after this, leaving the
 * newest snapshot costs an editor a visible `DROP TABLE`/`RENAME TO` in the
 * newest `.sql`, which is a reviewable destructive statement — but an editor who
 * writes that statement, or who also rewrites the predecessor snapshot, satisfies
 * every assertion in this file. Closing it needs a record no in-tree edit can
 * reach, i.e. append-only enforcement on committed migrations checked against git
 * history, which needs git and belongs in the release gates rather than in a
 * DB-free unit test.
 */
const droppedWithoutStatement = (
  previousTables: Record<string, JsonValue>,
  newestTables: Record<string, JsonValue>,
  sql: string
): string[] =>
  Object.keys(previousTables)
    .filter((key) => !Object.hasOwn(newestTables, key))
    .filter((key) => {
      const name = key.slice(key.lastIndexOf(".") + 1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // `[^;]*` keeps each match inside one statement.
      const dropped = new RegExp(`drop\\s+table\\b[^;]*"${name}"`, "i").test(sql);
      const renamed = new RegExp(
        `alter\\s+table\\b[^;]*"${name}"[^;]*\\brename\\s+to\\b`,
        "i"
      ).test(sql);
      return !dropped && !renamed;
    });

// The committed snapshot is read at collection time because the per-table test
// names come from its keys; a failure there leaves nothing to name anyway.
describe("core/db/schema.ts facade", () => {
  const entries = journalEntries();
  const committed = readSnapshot(snapshotPathForEntry(entries[entries.length - 1]));

  test("re-exports every table the migration snapshot records, and no others", () => {
    const facade = facadeSnapshot();
    expect(Object.keys(facade.tables).sort()).toEqual(Object.keys(committed.tables).sort());
  });

  test("re-exports exactly as many tables as the snapshot has", () => {
    const facade = facadeSnapshot();
    expect(Object.keys(committed.tables).length).toBeGreaterThan(0);
    expect(Object.keys(facade.tables).length).toBe(Object.keys(committed.tables).length);
  });

  for (const [key, table] of Object.entries(committed.tables)) {
    test(`declares ${key} exactly as the migration snapshot records it`, () => {
      const facade = facadeSnapshot();
      if (!Object.hasOwn(facade.tables, key)) {
        throw new Error(`table ${key} is not reachable through core/db/schema.ts`);
      }
      expect(shapeFromSnapshot(facade.tables[key])).toEqual(shapeFromSnapshot(table));
    });
  }

  test("projects the same enums, schemas, sequences, roles, policies and views", () => {
    const sections = (file: SnapshotFile): Record<string, string[]> =>
      Object.fromEntries(
        SCHEMA_SECTIONS.map((section): [SchemaSection, string[]] => [
          section,
          shapeFromSnapshot(file[section]),
        ])
      );
    expect(sections(facadeSnapshot())).toEqual(sections(committed));
  });
});

/**
 * The guard above is only as sharp as `shapeFromSnapshot`, so these pin its
 * sensitivity directly, on drizzle-kit's own snapshot format, for the three
 * fields a projection is most tempting to drop. Each of them is a difference
 * `db:generate` would turn into DDL, and each of them was invisible to the
 * hand-rolled projection this file used to carry.
 */
describe("shapeFromSnapshot sensitivity", () => {
  const exampleTable = (overrides: { [key: string]: JsonValue } = {}): JsonValue => ({
    name: "example",
    schema: "",
    columns: {
      status: {
        name: "status",
        type: "text",
        primaryKey: false,
        notNull: true,
        default: "'draft'",
      },
    },
    indexes: {
      example_status_idx: {
        name: "example_status_idx",
        columns: [{ expression: "status", isExpression: false, asc: true, nulls: "last" }],
        isUnique: false,
        concurrently: false,
        method: "btree",
        with: {},
      },
    },
    foreignKeys: {},
    compositePrimaryKeys: {},
    uniqueConstraints: {},
    policies: {},
    checkConstraints: {},
    isRLSEnabled: false,
    ...overrides,
  });

  test("a changed column default is a difference", () => {
    const changed = exampleTable({
      columns: {
        status: {
          name: "status",
          type: "text",
          primaryKey: false,
          notNull: true,
          default: "'published'",
        },
      },
    });
    expect(shapeFromSnapshot(changed)).not.toEqual(shapeFromSnapshot(exampleTable()));
  });

  test("an added check constraint is a difference", () => {
    const changed = exampleTable({
      checkConstraints: {
        example_status_check: { name: "example_status_check", value: "status <> ''" },
      },
    });
    expect(shapeFromSnapshot(changed)).not.toEqual(shapeFromSnapshot(exampleTable()));
  });

  test("a changed index sort order is a difference", () => {
    const changed = exampleTable({
      indexes: {
        example_status_idx: {
          name: "example_status_idx",
          columns: [{ expression: "status", isExpression: false, asc: false, nulls: "first" }],
          isUnique: false,
          concurrently: false,
          method: "btree",
          with: {},
        },
      },
    });
    expect(shapeFromSnapshot(changed)).not.toEqual(shapeFromSnapshot(exampleTable()));
  });
});

/**
 * No migration in this repo has ever dropped a table, so the two checks over real
 * data below are green without exercising the interesting branch. The synthetic
 * case is what makes `droppedWithoutStatement` non-vacuous: it tests the helper,
 * which is the part that would have to work the day a drop appears.
 */
describe("core/db/migrations snapshot chain", () => {
  const entries = journalEntries();

  test("the newest snapshot records the one before it as its predecessor", () => {
    expect(entries.length).toBeGreaterThan(1);
    const newest = readSnapshot(snapshotPathForEntry(entries[entries.length - 1]));
    const previous = readSnapshot(snapshotPathForEntry(entries[entries.length - 2]));
    expect(newest.prevId).toBe(previous.id);
  });

  test("no table left the newest snapshot without its migration dropping or renaming it", () => {
    expect(entries.length).toBeGreaterThan(1);
    const newestEntry = entries[entries.length - 1];
    const newest = readSnapshot(snapshotPathForEntry(newestEntry));
    const previous = readSnapshot(snapshotPathForEntry(entries[entries.length - 2]));
    const sql = readFileSync(path.join(MIGRATIONS_DIR, `${newestEntry.tag}.sql`), "utf8");
    expect(droppedWithoutStatement(previous.tables, newest.tables, sql)).toEqual([]);
  });

  test("a table deleted from the newest snapshot alone is reported", () => {
    const previousTables: Record<string, JsonValue> = { "public.kept": {}, "public.gone": {} };
    const newestTables: Record<string, JsonValue> = { "public.kept": {} };
    expect(droppedWithoutStatement(previousTables, newestTables, "")).toEqual(["public.gone"]);
    expect(
      droppedWithoutStatement(previousTables, newestTables, 'DROP TABLE "gone" CASCADE;')
    ).toEqual([]);
    expect(
      droppedWithoutStatement(previousTables, newestTables, 'ALTER TABLE "gone" RENAME TO "moved";')
    ).toEqual([]);
  });
});
