# TASK-512-01: Schema & Migration — media_folders + media metadata columns

# FileName: TASK-512-01-Schema-And-Migration.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** DB Schema / Migration / Model Contract
**Estimated Effort:** Medium
**Dependencies:** none (model keystone — lands FIRST). Rides existing `media` table
(`core/db/schema.ts:1121-1136`, symbol `export const media = pgTable("media", ...)`) + existing
migration chain (last = `0066_dashboard_layouts`, journal `idx: 66`). Consumed by 512-02..06.
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer)

**512-01 is the SOLE WRITER of the `media` / new `mediaFolders` region of
`core/db/schema.ts` AND of migration artifacts `0067_*`.** It lands the columns + the new
table + the migration SQL/snapshot/journal (next slot `0067_*` — verify journal at author
time). **Nothing consumes these yet** — services
(512-02), routes (512-03), client/types (512-04), UI (512-05/06) all depend on this file and
MUST land after. This subtask makes ZERO edits to services, routes, client, or UI.

**Land order:** 512-01 (this) → 512-02 → 512-03 → 512-04 → 512-05 → 512-06 → 512-07.

---

## Goal

Extend the media model for maximum end-user configuration flexibility (owner mandate): real
user-defined **folders** (nestable), **tags**, **focal point**, and **richer metadata**
(description + credit). Storage quota is settings-backed (no DDL) — handled in 512-02.

---

## Grounded anchors (verified 2026-07-05)

- `core/db/schema.ts:1121-1136` — `export const media = pgTable("media", { ... })` (durable
  anchor = the `export const media = pgTable("media", ...)` symbol; the range that follows is
  `adminThemeProfiles` at 1101-1119, do not confuse them); current columns:
  `id, key, url, originalName, type, mimeType, size, width, height, alt, title, caption,
  createdAt, createdBy` (line 1136 closes the table). `createdBy: uuid("created_by")
  .references(() => users.id)`.
- jsonb-array precedent for `tags`: search `schema.ts` for existing `jsonb(...).$type<...>()
  .notNull().default([])` patterns (e.g. `mediaIds: jsonb("media_ids").notNull().default([])`
  at line ~1561) — mirror the shape (`$type<string[]>()`).
- Self-referencing FK precedent: use the `references(() => mediaFolders.id, { onDelete: "set
  null" })` form (drizzle supports self-ref via arrow); index helpers already imported
  (`uniqueIndex`, `index`) — confirm both are imported at top of `schema.ts` before use.
- Migrations dir: `core/db/migrations/` — last file `0066_dashboard_layouts.sql`; journal
  `core/db/migrations/meta/_journal.json` last entry `idx: 66, version: "7"` (tag
  `0066_dashboard_layouts`). So this subtask's next slot is `0067_*` / `idx: 67` — but
  drizzle-kit auto-increments off the journal, so RE-VERIFY the tail at author time and use
  whatever the actual next index is. Snapshots live at `core/db/migrations/meta/NNNN_snapshot.json`.

---

## Implementation — schema.ts

Add a NEW `mediaFolders` table (place it immediately ABOVE `export const media` so the self-ref
+ `media.folderId` FK resolve, or below with arrow-ref — verify drizzle ordering; arrow-refs are
lazy so order is flexible, but keep `mediaFolders` before `media` for readability):

```ts
export const mediaFolders = pgTable(
  "media_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => mediaFolders.id, {
      onDelete: "set null",
    }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    slugIdx: uniqueIndex("media_folders_slug_idx").on(t.slug),
    parentIdx: index("media_folders_parent_idx").on(t.parentId),
    parentOrderIdx: index("media_folders_parent_order_idx").on(t.parentId, t.orderIndex),
  })
);
```
(Self-ref needs the explicit `(): AnyPgColumn =>` return annotation — import `AnyPgColumn` from
`drizzle-orm/pg-core` if not already imported. Verify the import line.)

Extend `media` (append columns; do NOT reorder existing ones — keeps snapshot diff minimal):
```ts
  // ...existing columns through caption...
  folderId: uuid("folder_id").references(() => mediaFolders.id, { onDelete: "set null" }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  focalX: real("focal_x"),
  focalY: real("focal_y"),
  description: text("description"),
  credit: text("credit"),
  // createdAt, createdBy stay last
```
Add a `media` index config `(t) => ({ folderIdx: index("media_folder_idx").on(t.folderId) })`
— the `media` table currently has NO index callback (it's the object-only form), so this
CONVERTS `pgTable("media", {...})` to `pgTable("media", {...}, (t) => ({...}))`. Verify `real`
and `index` are imported from `drizzle-orm/pg-core` (add to the import list if missing).

---

## Implementation — migration `0067_*` (full artifacts, owner mandate)

Run `bun run db:generate` (drizzle-kit) from the repo ROOT — the `db:generate`/`db:migrate`
scripts live in the ROOT `package.json` (lines 67-68, they auto-source `.env`); core/package.json
has NO `db:*` scripts (only `drizzle-kit` devDep), so `bun --cwd core db:generate` fails
missing-script. This authors `0067_<name>.sql` +
`meta/0067_snapshot.json` + appends `meta/_journal.json` entry `idx: 67` (assuming journal tail
is `0066_dashboard_layouts`/`idx: 66` at author time — drizzle-kit auto-increments, use whatever
it actually emits). THEN hand-verify the
generated SQL contains exactly:
1. `CREATE TABLE "media_folders" (...)` with the 3 indexes (unique slug, parent, parent+order).
2. `ALTER TABLE "media" ADD COLUMN "folder_id" uuid;` + FK constraint `ON DELETE set null`.
3. `ALTER TABLE "media" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;`
4. `ADD COLUMN "focal_x" real;` / `"focal_y" real;` / `"description" text;` / `"credit" text;`
5. `CREATE INDEX "media_folder_idx" ON "media" ("folder_id");`
If drizzle-kit prompts for rename-vs-create, choose CREATE (new columns/table, no renames).

**Byte-identity guarantee:** every new `media` column is nullable EXCEPT `tags` (which has a
`DEFAULT '[]'::jsonb NOT NULL`, so existing rows backfill to `[]`). A legacy row selected after
migration reads identically for all pre-existing columns; new columns default to null/`[]`.

---

## Testing Requirements

- **Bun lane (DB):** `tests/integration/server/media-schema-0067.test.ts` (NEW) — must live
  under `tests/integration/server/` because that is where DB-touching media tests already sit
  (e.g. `tests/integration/server/mediaDeliveryAccess.test.ts`) AND it is one of the dirs the
  `test:bun` glob enumerates (package.json:26); a `tests/integration/db/` dir is NOT in the glob
  and would silently NEVER run (false green). Presumes 0067 is already applied to the shared test
  DB — `test:bun` does NOT run migrations, so run `bun run db:migrate` (repo root) first. After
  migrate:
  (a) insert a `media_folders` row + a nested child (parentId set), assert slug uniqueness
  rejects a dup; (b) insert `media` with `folderId` → delete the folder → assert the media row
  survives with `folderId === null` (NOT deleted — proves `onDelete: "set null"`); (c) assert a
  fresh `media` insert without new fields has `tags === []`, focal/description/credit null.
  Shared-DB safety: unique slugs per test (`crypto.randomUUID()` suffix), delete fixtures in
  `afterEach`; no reliance on row counts from other suites.
- **Vitest lane:** none (pure DDL, no Bun-free logic).
- Run `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` (self-ref type
  annotation is a common tsc break point — verify green).

## Acceptance Criteria

1. `mediaFolders` table + 6 new `media` columns (`folderId`, `tags`, `focalX`, `focalY`,
   `description`, `credit`) present in `schema.ts` with correct types.
2. `0067_*.sql` + `0067_snapshot.json` + `_journal.json` `idx:67` committed; `bun run db:migrate`
   (repo root) applies clean on the test DB.
3. Folder-delete sets `media.folderId` null (never cascade-deletes media) — proven by Bun test.
4. Legacy rows byte-identical for pre-existing columns; `tags` backfills `[]`.
5. `lint:types` + root `tsc` green.
