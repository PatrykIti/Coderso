# TASK-484-01-L01: Run-metadata + artifact-key columns & migration
# FileName: TASK-484-01-L01-Backup-Schedule-Run-Metadata-Columns.md

**Parent Subtask:** TASK-484-01
**Priority:** High
**Category:** `backups` / `schema-migration`
**Estimated Effort:** Small
**Dependencies:** Sync precondition — before this leaf authors its migration and
runs `db:migrate`, the orchestrator syncs TASK-483's `0064` artifacts (SQL +
`meta/0064_snapshot.json` + `meta/_journal.json` entry) into this worktree so
the journal stays gapless; this leaf then generates `0065`.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Add the persisted fields the feature needs:
  `backup_schedules.next_run_at` (nullable), `backup_schedules.last_run_at`
  (nullable), and `backups.artifact_key` (nullable). Ship **full Drizzle
  migration artifacts**. Extend the domain types + mappers to carry the fields
  (no behaviour change yet — calculation/wiring is L02).
- **Owning module(s) to create-or-extend:** `core/db/schema.ts` (the `backups`
  and `backup_schedules` `pgTable`s at lines 527-560 — **shared surface**: the
  parallel TASK-483 stream adds analytics tables to this same file; edit ONLY
  these two tables, additively, and never restructure/reorder anything else),
  `core/db/migrations/0065_*.sql` + `core/db/migrations/meta/0065_snapshot.json`
  + `core/db/migrations/meta/_journal.json` (append),
  `core/services/backups/backupTypes.ts` (`BackupSchedule`, `BackupRecord`),
  `core/services/backups/backupService.ts` (`mapSchedule` 134-142,
  `mapBackup` 116-132 — add the new fields).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/MEDIA_SPEC.md`.
- **Out of scope:** the `computeNextRunAt` calculator and seeding/recompute logic
  (L02); the scheduler (484-02); any remote upload (484-05).

> **DB change — full migration artifacts required.** This leaf adds columns, so it
> MUST ship the SQL file + `meta/0065_snapshot.json` + an appended
> `meta/_journal.json` entry, generated via the repo's drizzle-kit flow and
> verified to apply cleanly. Precondition: TASK-483's `0064` artifacts are
> synced into this worktree first (see Dependencies).

---

## Security Contract

This is a schema/data leaf (no route added here), but it touches persisted data,
so the data-handling clauses apply:

- **Endpoint visibility:** n/a — no route. Columns are consumed by existing
  internal `/admin/api/backups*` routes.
- **Auth model / RBAC:** unchanged; enforced at the existing routes
  (`backups:read` / `backups:write`).
- **CSRF / Rate-limit:** n/a at this layer.
- **Validation:** the new columns are written only through the domain service
  (L02 `markScheduleRun` / `setBackupSchedule`, 484-05 for `artifact_key`); the
  schema-validation surface (`scheduleUpdateSchema`) is **not** widened —
  `next_run_at` / `last_run_at` / `artifact_key` are server-computed and must
  stay `additionalProperties: false`-rejected from client input.
- **Anti-abuse:** n/a (no public write).
- **Secret/PII handling:** `artifact_key` is a storage object key (e.g.
  `backups/2026/06/<uuid>.json`) — **not a credential** and not a public URL; it
  is server-internal and continues to be redacted from client responses by
  `mapBackup`'s `redactArtifactPath` policy (the key is never returned to clients;
  only the redacted `artifactPath` is). No secret/PII is added to any table.

---

## Implementation Pseudocode

### 1) Schema (`core/db/schema.ts`)

```ts
export const backups = pgTable("backups", {
  // ...existing columns...
  artifactPath: text("artifact_path"),
  artifactKey: text("artifact_key"),          // NEW: remote storage object key (null for local)
  sizeBytes: integer("size_bytes"),
  // ...
});

export const backupSchedules = pgTable("backup_schedules", {
  // ...existing columns (enabled, frequency, retention_days, storage_driver)...
  nextRunAt: timestamp("next_run_at"),        // NEW: when the next scheduled backup is due (null = none/disabled)
  lastRunAt: timestamp("last_run_at"),        // NEW: when a scheduled backup last ran
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  frequencyIdx: index("backup_schedules_frequency_idx").on(t.frequency),
  nextRunAtIdx: index("backup_schedules_next_run_at_idx").on(t.nextRunAt), // due-lookup support
}));
```

All three new columns are **nullable with no default** (back-compat: existing
rows read as `null`; L02 seeds `next_run_at` on first access).

### 2) Types (`backupTypes.ts`)

```ts
export type BackupSchedule = {
  // ...existing...
  nextRunAt: Date | null;
  lastRunAt: Date | null;
};

export type BackupRecord = {
  // ...existing...
  artifactKey: string | null;   // server-internal; only emitted on the internal map (not the redacted client map)
};
```

### 3) Mappers (`backupService.ts`)

```ts
const mapSchedule = (row): BackupSchedule => ({
  ...,
  nextRunAt: row.nextRunAt ?? null,
  lastRunAt: row.lastRunAt ?? null,
});

const mapBackup = (row, options = {}): BackupRecord => ({
  ...,
  // artifactKey is internal-only; keep it null on the redacted (client) map,
  // expose the real value only when options.redactArtifactPath === false
  artifactKey: options.redactArtifactPath === false ? (row.artifactKey ?? null) : null,
});
```

### 4) Migration artifacts (FULL — required)

**Sync precondition first:** the orchestrator syncs TASK-483's `0064` artifacts
(SQL + `meta/0064_snapshot.json` + `meta/_journal.json` entry) into this
worktree so the journal stays gapless. Only then generate via the repo's
drizzle-kit flow (`bun run db:generate` to author, `bun run db:migrate` to
apply — both auto-source `.env` and use `core/db/drizzle.config.ts`), and
verify three artifacts. The
pinned index for TASK-484 is **0065** (this worktree's current max is
`0063_yummy_glorian`, journal version `"7"`; `0064` belongs to TASK-483):

- **SQL** — `core/db/migrations/0065_backup_run_metadata.sql`:
  ```sql
  ALTER TABLE "backups" ADD COLUMN "artifact_key" text;
  --> statement-breakpoint
  ALTER TABLE "backup_schedules" ADD COLUMN "next_run_at" timestamp;
  --> statement-breakpoint
  ALTER TABLE "backup_schedules" ADD COLUMN "last_run_at" timestamp;
  --> statement-breakpoint
  CREATE INDEX "backup_schedules_next_run_at_idx" ON "backup_schedules" USING btree ("next_run_at");
  ```
- **Snapshot** — `core/db/migrations/meta/0065_snapshot.json`: full regenerated
  drizzle snapshot including the two new `backup_schedules` columns + index and
  the new `backups.artifact_key` column (do not hand-edit beyond generator
  output).
- **Journal** — append to `core/db/migrations/meta/_journal.json`:
  ```json
  { "idx": 65, "version": "7", "when": <epoch-ms>, "tag": "0065_backup_run_metadata", "breakpoints": true }
  ```

> **Migration index is FIXED by cross-stream pin — do not re-derive.**
> TASK-483 (analytics tables) owns `0064` and merges first; TASK-484 owns
> `0065`. Never author a `0064` in this stream: it would collide with 483's
> `0064` in the journal and against the shared remote DB. Before generating,
> sync 483's `0064` artifacts into this worktree (see Dependencies) so the
> journal stays gapless.

**Data flow:** existing routes/services read the new columns via the mappers; no
write path changes in this leaf.

**Error handling:** none added; mappers tolerate `null`.

**Regression-test shape (Bun):** `mapSchedule` returns `nextRunAt: null` /
`lastRunAt: null` for a freshly created schedule; `mapBackup` keeps
`artifactKey: null` on the redacted map and returns the value on the internal
map; a row with `artifact_key` set still redacts `artifactPath` correctly.

---

## Testing Requirements

Bun lane (DB-backed). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — mapper field coverage (above); existing backup
  service tests stay green with the widened types.
- Apply migration `0065` (`bun run db:migrate`) and confirm the SQL,
  `0065_snapshot.json`, and the `_journal.json` entry (idx 65) exist and the
  columns are present. Precondition: TASK-483's `0064` artifacts are synced in
  first (see Dependencies) so the journal has no gap.
