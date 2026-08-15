# TASK-511-01: Streaming Batched Export Engine + Archive Format & Manifest

# FileName: TASK-511-01-Streaming-Export-Engine-And-Archive-Format.md

**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Priority:** High
**Category:** Backups / Data / Streaming
**Estimated Effort:** Large
**Depends On:** TASK-484 (backups v1 — merged; provides the FK-safe snapshot table set + reverse-delete restore we reuse the *knowledge* of, but do not rewrite)
**Blocks:** TASK-511-02 (compression + encryption wrap), -03 (media members), -04 (users/RBAC members), -05 (import pipeline), -06 (scheduler + UI), -07 (docs/closure)
**Status:** ✅ Done
**Completed:** 2026-08-15

---

## 1. Overview / Goal

Build the **streaming, batched export engine** and the **archive container format +
manifest** that all later Backup-v2 subtasks build on.

Today `createBackupArtifact()` in
`core/services/backups/backupService.ts:405` builds the whole snapshot **in memory**
via `buildDatabaseSnapshot()` (`backupService.ts:300-373` — 22 parallel
`db.select().from(table)` with no paging) and serializes it with
`JSON.stringify(artifact, null, 2)` (`backupService.ts:426`). On a data-heavy site
this OOMs the container.

511-01 replaces the *data-shape* of the archive (not the v1 restore internals) with:

1. **Per-table NDJSON** — one entity per line, produced by **keyset pagination**
   (stable primary-key cursor, ~5–10k rows/batch) so a whole table is never resident
   in memory.
2. A **tar container** whose **first member is `manifest.json`** (artifact version,
   engine version, schema version, per-table row counts + SHA-256 checksums, include
   flags) followed by per-table `tables/<key>.ndjson` members.
3. A **shared archive/manifest type contract** (`ArchiveManifest`,
   `ArchiveTableManifest`, `TarMember`, version constants) that 02 (gzip +
   AES-256-GCM) wraps, and 03/04 (media / users members) compose against —
   **without editing this module**. The `.cbk` **crypto envelope header** (salt /
   KDF params / nonce / per-frame GCM tags) is **owned solely by 02** in
   `backupCrypto.ts` (see 02 §"Archive format — the `.cbk` header + frame layout");
   01 defines **no** crypto-field type (it never writes crypto fields).

**Scope boundary (do NOT do here):**
- No compression, no encryption — 02 wraps the tar byte stream this subtask produces.
- No media file bytes — 03 appends `media/*` members through the generic member API
  this subtask exposes.
- No `users`/RBAC members — 04 appends them (encrypted-only path).
- No import/restore — 05 owns the reverse pipeline. This subtask does **not** touch
  `replaceSnapshotTables` / `restoreArtifactTx` / `restoreBackup`
  (`backupService.ts:608,627,737`); it only reuses the *knowledge* of the FK-safe
  table set and ordering (`snapshotTableOrder`, `backupService.ts:553-583`).
- No route changes, no `createBackup()` rewiring — 06 wires the engine into
  `createBackupArtifact`. This subtask ships a self-contained, test-covered library.

## 2. Owning Module(s) — single-writer

| File | Ownership | Action |
|------|-----------|--------|
| `core/services/backups/backupArchive.ts` | **511-01 (new, sole writer)** | CREATE — engine + tar writer + manifest + envelope types/constants |
| `tests/unit/backups/backupArchive.test.ts` | **511-01 (new, sole writer)** | CREATE — Bun lane |

**Explicitly NOT edited by this subtask** (owned elsewhere; avoids single-writer
collisions and preserves 484's restore posture):
- `core/services/backups/backupService.ts` (TASK-484) — not exported symbols we need
  (`snapshotTableOrder`, `BACKUP_SNAPSHOT_TABLE_KEYS`) are **private consts**; we
  **mirror** them in `backupArchive.ts` and guard drift with a regression test rather
  than editing 484's file.
- `core/services/backups/backupTypes.ts` (TASK-484) — new archive/envelope types live
  in `backupArchive.ts`, not appended here.
- Route/schema/scheduler/UI/client files — untouched in 01.

Rationale for a brand-new module (vs. extending `backupService.ts`): the parent
mandates a new module (`backupArchive.ts`) so the v1 destructive-restore internals
stay intact and single-writer ownership is clean while five later subtasks compose
against it.

## 3. Security Contract

**This subtask adds NO route surface** (no handler in
`core/server/routes/backupRoutes.ts`, no schema in
`core/server/validation/backupSchemas.ts`). It is a backend-only library consumed by
tests now and by `createBackup()` in 06. RBAC/CSRF/reject-unknown are enforced by the
existing `/admin/api/backups` routes (`backupRoutes.ts:150` `backups:write`) and are
unchanged.

Engine-level security invariants (defense-in-depth, verified by review + tests):

- **No secrets in scope.** 01 exports `database`-section rows only. `users`, roles,
  `user_roles`, and password hashes are **out of scope** here and are *not* readable
  by this module — they are added by 04 on the encrypted-only path. The archive
  produced by 01 alone is plaintext-tar and MUST never carry credential data.
- **No artifact data logged.** Row values, ids, and temp-spool paths are never
  `console.*`-ed. Errors throw machine-readable codes (`backup_archive_export_failed`,
  `backup_archive_tempdir_failed`) that the service layer already runs through
  `sanitizeBackupError()` (`backupService.ts:272`, strips `cwd` + backup-dir) before
  it reaches `row.error`.
- **Bounded temp spool, always cleaned.** Per-table NDJSON is spooled to a
  per-run directory. **Spool-dir resolution (owner-confirmed 2026-07-06), first match wins:**
  (1) the backend-only `BACKUP_TMP_DIR` env override if set; else (2) a persistent path
  derived from the configured **storage settings** (`getStorageSettings()` — the same
  media-storage config surface: when the admin has set a local persistent base dir there,
  spool under a `backups-tmp/` subdir of it, since an operator who configured persistent
  storage wants large spools on durable disk, not an ephemeral container `tmpdir`); else
  (3) default `os.tmpdir()` (local). NOTE: only a LOCAL/filesystem storage base contributes
  a spool path — a remote (s3/azure) storage driver does NOT (you cannot spool a local tar
  member to an object store), so remote-configured installs fall through to `os.tmpdir()`
  unless `BACKUP_TMP_DIR` is set. The per-run dir is named with `randomUUID()` (no user input in the path — no
  traversal), created with `mkdir(..., { recursive: true, mode: 0o700 })`, and
  removed with `rm(dir, { recursive: true, force: true })` in a `finally` on every
  path (success, throw, cancellation).
- **Bounded memory.** No `db.select().from(table)` without a `LIMIT`; the batch size
  is a module constant, not attacker-controlled. Row counts + checksums are computed
  incrementally over the stream.

## 4. Implementation Pseudocode (execution-ready)

All shapes below are grounded in the real code: drizzle helpers already imported in
`backupService.ts:3` (`and, desc, eq, getTableColumns, inArray, lt` — 01 additionally
imports `asc, gt, sql` and `type AnyColumn`), the `db` client (`core/db/client.ts:13`), the schema tables,
and the FK-safe order from `snapshotTableOrder` (`backupService.ts:553-583`).

### 4.1 Envelope + manifest types/constants (the shared contract)

```ts
// core/services/backups/backupArchive.ts
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asc, gt, getTableColumns, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/client";
import {
  pages, contentTypes, media, menus, themeProfiles, redirects,
  contentEntries, posts, menuItems, themeRoutes, pageRevisions,
  detailPageDocuments, customScreens, contentTaxonomies, detailPageRevisions,
  contentTerms, contentRevisions, customScreenEntryPresentationOverrides,
  postRevisions, postPreviewTokens, contentTermAssignments, postTermAssignments,
} from "../../db/schema";
import type { BackupIncludeOption } from "./backupTypes";
import { getStorageSettings } from "../settings/storageSettings"; // 3-tier spool base (§4.5/§4.6a)
import { exportConfig } from "../tools/importExportService"; // 484 (exported :289) — settings.json member (§4.6a step 3)

// v1 JSON artifact = version 1 (backupService BACKUP_ARTIFACT_VERSION). The tar
// archive is a NEW artifact format — start at 2 so a reader can tell them apart.
export const ARCHIVE_ARTIFACT_VERSION = 2 as const;
// Bumped whenever the snapshot table SET/shape changes (lock-step with 484's
// snapshotTableOrder). Distinct from artifact version.
export const ARCHIVE_SCHEMA_VERSION = 1 as const;
export const ARCHIVE_ENGINE_VERSION = "2026.07-backup-v2" as const;
export const MANIFEST_MEMBER_NAME = "manifest.json" as const;
export const TABLE_MEMBER_DIR = "tables" as const; // tables/<key>.ndjson
// Section member names (siblings of manifest.json, NOT under tables/). PINNED here so
// the section WRITERS (01 settings, 04 users/roles/user_roles) and the section READER
// (05 readJsonMember/readUsersMembers) agree on the EXACT byte string — a name drift
// would make 05 silently read nothing (e.g. a users restore that inserts zero rows).
// 04 and 05 import these constants; neither uses a bare string literal.
export const SETTINGS_MEMBER_NAME = "settings.json" as const;
export const USERS_MEMBER_NAME = "users.ndjson" as const;
export const ROLES_MEMBER_NAME = "roles.ndjson" as const;
export const USER_ROLES_MEMBER_NAME = "user_roles.ndjson" as const;
export const EXPORT_BATCH_SIZE = 5_000; // rows/batch (5–10k window per parent §4)

// NOTE: the outer `.cbk` crypto envelope header (magic/KDF params/salt/nonce
// prefix/per-frame GCM tags) is NOT defined here. It is a BINARY, framed header
// owned solely by 02 (`backupCrypto.ts`, 02 §"Archive format"); 01 emits only the
// plaintext tar byte stream and never reads/writes any crypto field. There is no
// `CbkEnvelopeHeader` type in this module — do not add one (it would contradict
// 02's on-disk format and be unpopulatable, since 02 does not edit this file).

export type ArchiveTableManifest = {
  key: string;                   // logical table key (matches BackupArtifactDatabase)
  member: string;                // e.g. "tables/pages.ndjson"
  rowCount: number;
  byteSize: number;              // raw member bytes
  sha256: string;                // hex digest of raw member bytes
};

// Optional sibling sections populated by later subtasks WITHOUT editing this file
// (they are PRE-DECLARED here as optional so single-writer holds: 03 fills `media`,
// 04 fills `users`; both are validated as reject-unknown blocks by 05's manifest
// validator, whose MANIFEST_TOP_KEYS is exactly {…, media, users}). `settings` is
// carried as a `settings.json` MEMBER (see §4.7), not a manifest metadata block.
export type ArchiveMediaManifest = {
  fileCount: number; totalBytes: number;
  skipped: Array<{ key: string; reason: "missing" }>;
};
export type ArchiveUsersManifest = { users: number; roles: number; userRoles: number };

export type ArchiveManifest = {
  artifactVersion: typeof ARCHIVE_ARTIFACT_VERSION;
  schemaVersion: typeof ARCHIVE_SCHEMA_VERSION;
  engineVersion: string;
  createdAt: string;             // ISO
  include: BackupIncludeOption[]; // parent adds "users" to this union in 04
  tables: ArchiveTableManifest[];
  media?: ArchiveMediaManifest;   // 03 fills when include has "media" (03 §4.2 summary)
  users?: ArchiveUsersManifest;   // 04 fills when include has "users" (04 §4.2 counts)
  // The type stays additive/back-compat and CLOSED (no free-form keys) so 05's
  // reject-unknown validator can enforce it.
};

// A tar member is a name + exact byte size + a chunk source. tar requires size in
// the 512-byte header BEFORE the body, so members stream from a spooled file whose
// size is known (see 4.3). This keeps memory O(batch), not O(table).
export type TarMember = {
  name: string;
  size: number;
  body: AsyncIterable<Uint8Array>;
};
```

**Shared spool-base resolver (3-tier, owner-confirmed §3/§7 — the single source of
truth both `packDatabaseArchive` §4.5 and `packBackupArchive` §4.6a call):**

```ts
// First match wins: (1) BACKUP_TMP_DIR env override; (2) a LOCAL/filesystem
// persistent base from getStorageSettings() → `${base}/backups-tmp` (ONLY for a
// local driver — remote s3/azure yields no local spool path and falls through);
// (3) os.tmpdir(). The per-run leaf stays a fresh `coderso-backup-<uuid>` subdir.
async function resolveSpoolBase(): Promise<string> {
  if (process.env.BACKUP_TMP_DIR) return process.env.BACKUP_TMP_DIR;
  const storage = await getStorageSettings();          // ../settings/storageSettings (:281)
  if (storage.driver === "local" && storage.local.dir) {
    return path.join(storage.local.dir, "backups-tmp");
  }
  return os.tmpdir();
}
```

### 4.2 Table descriptors + keyset cursor (mirrors 484's FK-safe set)

```ts
// Cursor columns per table: single PK for most, COMPOSITE for the two junctions.
// GROUNDED: postTermAssignments PK = [postId, termId] (core/db/tables/posts.ts:95);
// contentTermAssignments PK = [entryId, termId] (core/db/tables/content.ts:134); postPreviewTokens
// id is uuid (core/db/tables/posts.ts:77); all other snapshot tables use a single uuid/text id.
type TableDescriptor = {
  key: keyof import("./backupTypes").BackupArtifactDatabase;
  table: PgTable;
  cursor: string[]; // ordered PK column property names on the drizzle table
};

// Order MIRRORS snapshotTableOrder (backupService.ts:553-583). Export order does not
// need FK-safety (no writes), but keeping the same order makes the drift test 1:1.
export const ARCHIVE_TABLE_DESCRIPTORS: TableDescriptor[] = [
  { key: "pages", table: pages, cursor: ["id"] },
  { key: "contentTypes", table: contentTypes, cursor: ["id"] },
  { key: "media", table: media, cursor: ["id"] },
  { key: "menus", table: menus, cursor: ["id"] },
  { key: "themeProfiles", table: themeProfiles, cursor: ["id"] },
  { key: "redirects", table: redirects, cursor: ["id"] },
  { key: "contentEntries", table: contentEntries, cursor: ["id"] },
  { key: "posts", table: posts, cursor: ["id"] },
  { key: "menuItems", table: menuItems, cursor: ["id"] },
  { key: "themeRoutes", table: themeRoutes, cursor: ["id"] },
  { key: "pageRevisions", table: pageRevisions, cursor: ["id"] },
  { key: "detailPageDocuments", table: detailPageDocuments, cursor: ["id"] },
  { key: "customScreens", table: customScreens, cursor: ["id"] },
  { key: "contentTaxonomies", table: contentTaxonomies, cursor: ["id"] },
  { key: "detailPageRevisions", table: detailPageRevisions, cursor: ["id"] },
  { key: "contentTerms", table: contentTerms, cursor: ["id"] },
  { key: "contentRevisions", table: contentRevisions, cursor: ["id"] },
  { key: "customScreenEntryPresentationOverrides", table: customScreenEntryPresentationOverrides, cursor: ["id"] },
  { key: "postRevisions", table: postRevisions, cursor: ["id"] },
  { key: "postPreviewTokens", table: postPreviewTokens, cursor: ["id"] },
  { key: "contentTermAssignments", table: contentTermAssignments, cursor: ["entryId", "termId"] },
  { key: "postTermAssignments", table: postTermAssignments, cursor: ["postId", "termId"] },
];

// Async generator: yields rows in stable cursor order, batch by batch. Never holds
// more than one batch in memory. `runBatch` is injectable so tests can count calls
// (streaming assertion) and unit-test keyset math without the DB.
async function* streamTableRows(
  desc: TableDescriptor,
  batchSize = EXPORT_BATCH_SIZE,
  runBatch = defaultRunBatch,
): AsyncGenerator<Record<string, unknown>> {
  // `getTableColumns` returns a mapped type with NO string index signature, so an
  // arbitrary `cols[c]` string index needs a cast. Widen to `Record<string, AnyColumn>`
  // (NOT `unknown`): `asc`/`gt`/`sql` require `AnyColumn | SQLWrapper`, so `unknown`
  // would fail typecheck (see §4.2 note).
  const cols = getTableColumns(desc.table) as Record<string, AnyColumn>;
  let cursor: unknown[] | null = null;
  for (;;) {
    const batch = await runBatch(desc, cols, cursor, batchSize);
    if (batch.length === 0) break;
    for (const row of batch) yield row;
    if (batch.length < batchSize) break; // last page
    const last = batch[batch.length - 1];
    cursor = desc.cursor.map((c) => last[c]);
  }
}

async function defaultRunBatch(
  desc: TableDescriptor,
  cols: Record<string, AnyColumn>,
  cursor: unknown[] | null,
  batchSize: number,
) {
  const orderCols = desc.cursor.map((c) => asc(cols[c]));
  // IMPORTANT (drizzle-orm ^0.45.2, core/package.json:36): the default select
  // builder is a STAGED, phantom-typed chain — `.where()` must precede
  // `.orderBy()/.limit()`, and a query variable CANNOT be reassigned across
  // conditional method calls without `.$dynamic()` (the whole repo uses single
  // unbroken chains, e.g. backupService.ts:494; zero `$dynamic` usage). So compute
  // the WHERE expression FIRST, then build ONE unbroken chain. `where(undefined)`
  // is a valid no-op in drizzle (drops the clause), so the first page needs no
  // branch. Passing `undefined` keeps the types happy without `.$dynamic()`.
  let where: import("drizzle-orm").SQL | undefined;
  if (cursor !== null) {
    if (desc.cursor.length === 1) {
      where = gt(cols[desc.cursor[0]], cursor[0]);               // WHERE id > $cursor
    } else {
      // Row-value comparison for composite PK: WHERE (a, b) > ($ca, $cb).
      const lhs = sql.join(desc.cursor.map((c) => sql`${cols[c]}`), sql`, `);
      const rhs = sql.join(cursor.map((v) => sql`${v}`), sql`, `);
      where = sql`(${lhs}) > (${rhs})`;
    }
  }
  // Single unbroken chain — WHERE before ORDER BY/LIMIT, no reassignment, no $dynamic.
  return db.select().from(desc.table).where(where).orderBy(...orderCols).limit(batchSize);
}
```

> **Typecheck note (satisfies §8 gates):** the pattern above deliberately avoids the
> `let q = …; q = q.where(…)` reassignment that drizzle's staged builder rejects.
> Either this precompute-WHERE form (preferred) or an explicit
> `db.select().from(t).$dynamic()` before conditional chaining is acceptable; the
> plain reassignment form is **not** and would fail `bun --cwd core lint:types` /
> root `tsc`.
>
> **Second typecheck hazard — column typing.** `getTableColumns(desc.table)` returns a
> per-table *mapped* type with **no string index signature**, so the arbitrary-string
> index `cols[c]` (c comes from `desc.cursor`) requires a cast. Cast to
> `Record<string, AnyColumn>` — **not** `Record<string, unknown>`. drizzle
> (`^0.45.2`, `core/package.json:36`) types `asc(column: AnyColumn | SQLWrapper)`
> (`drizzle-orm/sql/expressions/select.d.ts:21`) and `gt` as a `BinaryOperator` whose
> overloads take `Column`/`SQLWrapper` (`.../conditions.d.ts:4-8,107`); `unknown` is
> assignable to neither, so `asc(cols[c])` / `gt(cols[desc.cursor[0]], cursor[0])` /
> `sql\`${cols[c]}\`` would fail `lint:types` / root `tsc`. `AnyColumn` is exported from
> the `drizzle-orm` root (`import type { AnyColumn }`, re-exported via `column.js`), and
> `Column` satisfies `SQLWrapper` so it also works in the `sql` template and in `gt`
> (whose RHS `GetColumnData<AnyColumn,'raw'>` resolves to `unknown`, accepting the
> `unknown` cursor value). For the same reason `defaultRunBatch`'s params must be
> annotated (`cols: Record<string, AnyColumn>`, `cursor: unknown[] | null`, etc.) —
> leaving them implicit would trip `noImplicitAny`.

*Keyset correctness note:* uuid/text ids and the composite `(entryId, termId)` /
`(postId, termId)` tuples are totally ordered in Postgres, so `ORDER BY … ASC` +
strict `>` cursor visits every row exactly once even under concurrent inserts (new
rows beyond the cursor are simply captured or not, never duplicated). We do **not**
depend on monotonic ids — `defaultRandom()` uuids are fine because the cursor is the
sort key itself.

### 4.3 Spool each table to NDJSON (compute count + checksum + size)

```ts
// Serialize one DB row to a single NDJSON line. JSON.stringify renders Date columns
// as ISO strings (drizzle timestamps) and jsonb as objects — this is exactly what
// 484's reviveRowsForInsert (backupService.ts:588-607) expects to revive on restore,
// so the round-trip is lossless. numeric columns round-trip as strings (postgres-js).
const toNdjsonLine = (row: unknown) => `${JSON.stringify(row)}\n`;

type SpooledTable = { manifest: ArchiveTableManifest; filePath: string };

async function spoolTable(desc, tmpDir, batchSize, runBatch): Promise<SpooledTable> {
  const member = `${TABLE_MEMBER_DIR}/${desc.key}.ndjson`;
  const filePath = path.join(tmpDir, `${desc.key}.ndjson`);
  const fh = await open(filePath, "w", 0o600);
  const hash = createHash("sha256");
  let rowCount = 0;
  let byteSize = 0;
  try {
    for await (const row of streamTableRows(desc, batchSize, runBatch)) {
      const buf = Buffer.from(toNdjsonLine(row), "utf8");
      await fh.write(buf);        // stream to disk; memory stays O(1) per row
      hash.update(buf);
      byteSize += buf.byteLength;
      rowCount += 1;
    }
  } finally {
    await fh.close();
  }
  return {
    filePath,
    manifest: { key: desc.key, member, rowCount, byteSize, sha256: hash.digest("hex") },
  };
}
```

### 4.4 Minimal tar writer (no new dependency)

No `tar`/`tar-stream`/`archiver` dependency exists in the repo (verified — not in
`package.json`). Implement a tiny **ustar** writer inline (512-byte header +
NUL-padded body to a 512 boundary + two zero blocks EOF). Only `file` type records
are needed; names stay < 100 bytes (`manifest.json`, `tables/<key>.ndjson`), so no
GNU/pax long-name path is required. Reader side (05) uses the same primitives.

```ts
function tarHeader(name: string, size: number): Buffer {
  const h = Buffer.alloc(512);
  h.write(name, 0, "utf8");                       // name (<100 bytes)
  h.write("000644 \0", 100);                      // mode
  h.write("0000000 \0", 108);                     // uid
  h.write("0000000 \0", 116);                     // gid
  h.write(size.toString(8).padStart(11, "0") + " ", 124); // size (octal)
  h.write("00000000000 ", 136);                   // mtime (deterministic 0)
  h.write("        ", 148);                       // checksum placeholder (spaces)
  h.write("0", 156);                              // typeflag '0' = regular file
  h.write("ustar\0", 257); h.write("00", 263);    // magic + version
  let sum = 0; for (const b of h) sum += b;        // header checksum
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
}

// Returns a ReadableStream<Uint8Array> of the whole tar (manifest first). Bodies are
// pulled lazily from their spool files, so the tar is produced streaming — 02 pipes
// this straight through gzip + GCM without buffering the archive.
function tarPack(members: AsyncIterable<TarMember>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const m of members) {
          controller.enqueue(tarHeader(m.name, m.size));
          for await (const chunk of m.body) controller.enqueue(chunk);
          const pad = (512 - (m.size % 512)) % 512;
          if (pad) controller.enqueue(new Uint8Array(pad));
        }
        controller.enqueue(new Uint8Array(1024)); // two zero blocks = EOF
        controller.close();
      } catch (err) { controller.error(err); }
    },
  });
}
```

### 4.5 Public entry point

```ts
export type PackDatabaseArchiveOptions = {
  include: BackupIncludeOption[];          // must contain "database" for 01
  batchSize?: number;                       // default EXPORT_BATCH_SIZE
  tmpDir?: string;                          // default: resolveSpoolBase()/coderso-backup-<uuid> where resolveSpoolBase() = BACKUP_TMP_DIR ?? (local persistent base from getStorageSettings() → `${base}/backups-tmp`) ?? os.tmpdir()
  runBatch?: typeof defaultRunBatch;        // test seam
};

export type PackedArchive = {
  stream: ReadableStream<Uint8Array>;       // the raw .tar bytes (02 wraps this)
  manifest: ArchiveManifest;                // fully populated (counts + checksums)
  cleanup: () => Promise<void>;             // remove temp spool dir (idempotent)
};

export async function packDatabaseArchive(
  opts: PackDatabaseArchiveOptions,
): Promise<PackedArchive> {
  if (!opts.include.includes("database")) throw new Error("backup_archive_export_failed");
  // Base spool dir (first match wins): BACKUP_TMP_DIR override → else a LOCAL persistent
  // base from getStorageSettings() (`${base}/backups-tmp`, only for a local/filesystem
  // storage driver; remote s3/azure does NOT yield a spool path) → else os.tmpdir()
  // (§3/§7). The per-run leaf is ALWAYS a fresh `coderso-backup-<uuid>` subdir — neither
  // env nor settings overrides the unique leaf, so no user input enters the path
  // (traversal-safe) and concurrent/repeat runs never collide or wipe each other.
  const baseTmp = await resolveSpoolBase(); // 3-tier, §3/§7 (env → local storage base → os.tmpdir)
  const tmpDir = opts.tmpDir ?? path.join(baseTmp, `coderso-backup-${randomUUID()}`);
  const batchSize = opts.batchSize ?? EXPORT_BATCH_SIZE;
  const runBatch = opts.runBatch ?? defaultRunBatch;
  try {
    await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  } catch { throw new Error("backup_archive_tempdir_failed"); }

  const cleanup = async () => { await rm(tmpDir, { recursive: true, force: true }); };

  try {
    // 1) Spool every table (bounded memory) → per-table manifests + checksums.
    const spooled: SpooledTable[] = [];
    for (const desc of ARCHIVE_TABLE_DESCRIPTORS) {
      spooled.push(await spoolTable(desc, tmpDir, batchSize, runBatch));
    }
    // 2) Build manifest AFTER checksums are known (so it can be the FIRST member).
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: opts.include,
      tables: spooled.map((s) => s.manifest),
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
    // 3) Assemble members: manifest.json FIRST, then each table spool file.
    async function* members(): AsyncGenerator<TarMember> {
      yield { name: MANIFEST_MEMBER_NAME, size: manifestBytes.byteLength,
              body: (async function* () { yield manifestBytes; })() };
      for (const s of spooled) {
        yield { name: s.manifest.member, size: s.manifest.byteSize, body: fileChunks(s.filePath) };
      }
    }
    // NOTE: cleanup() is called by the consumer (02/tests) AFTER the stream drains —
    // the spool files must outlive `packDatabaseArchive` return because bodies read
    // them lazily. Expose cleanup; the caller runs it in its own finally.
    return { stream: tarPack(members()), manifest, cleanup };
  } catch (err) {
    await cleanup();                          // spool failed before streaming — clean now
    throw err instanceof Error ? err : new Error("backup_archive_export_failed");
  }
}

// fileChunks: read a spool file in 64KiB chunks as an AsyncIterable<Uint8Array>.
async function* fileChunks(filePath: string): AsyncGenerator<Uint8Array> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(64 * 1024);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      yield Uint8Array.prototype.slice.call(buf, 0, bytesRead);
    }
  } finally { await fh.close(); }
}
```

**Lifecycle contract for callers (02/06/tests):** `packDatabaseArchive` returns
`{ stream, manifest, cleanup }`. The temp spool underlies `stream`, so the caller
MUST fully consume/pipe `stream` and only then `await cleanup()` — always in a
`finally`. Documented in the module header so 02 wires it correctly.

### 4.6a Composition seam for 03/04 + the `settings.json` member (single-writer contract)

`packDatabaseArchive` above is the DB-only convenience entry, but 01 also exports
the **incremental member seam** that 03 (media) and 04 (users) compose against — so
those subtasks append members and populate their manifest block **without editing
this module**. This is the "generic member API" referenced in §1/§7; define it
concretely here so the consumers' names line up:

```ts
// The archive WRITER seam 03 uses directly and 04 uses via its NDJSON sink.
// SPOOL-FIRST (not write-through): `appendStream` streams `body` to a spool file in
// the run tmpDir (computing byte size + SHA-256 incrementally, memory O(1)) and
// records the member — it does NOT write into the live tar. The USTAR header is
// written LATER, by `tarPack` (§4.4), only after `manifest.json` is finalized, so
// section counts (`manifest.media`/`manifest.users`) are known before the manifest
// (the FIRST member) is emitted. `appendStream` asserts the streamed byte count
// equals the declared `size` (never a header/body desync). Matches 03 §7.1's shape
// (03 just hands `(name, size, body)` and does not care where the bytes land).
export interface BackupArchiveWriter {
  appendStream(name: string, size: number, body: AsyncIterable<Uint8Array>): Promise<void>;
}

// The section-export hook 04 receives (04 §4.2 `exportUsersSection(engine)`): the
// writer plus a per-table NDJSON sink built on `appendStream`. 04's `ExportEngine`
// is THIS type — 04 imports it rather than redeclaring.
export interface ExportEngine {
  writer: BackupArchiveWriter;
  appendNdjson(memberName: string, rows: AsyncIterable<Record<string, unknown>>): Promise<ArchiveTableManifest>;
}
```

**Push→pull reconciliation (the concrete data flow).** The seam APIs above are
*push* (`appendStream`/`appendNdjson` are awaitable calls that hand bytes IN), but
`tarPack` (§4.4) is *pull* (it iterates a fixed member set and needs each member's
exact `size` in the 512-byte header BEFORE the body). Rather than bridge a live
push stream into the pull generator with a backpressured queue, `packBackupArchive`
reuses §4.5's **spool-first** model: every pushed section member is streamed to a
file in the SAME `tmpDir` (computing its size + SHA-256 incrementally, memory O(1)),
recorded in an ordered list, and only tar-packed AFTER `manifest.json` is finalized.
This also resolves the manifest-first-vs-section-counts ordering — `manifest.media`
/ `manifest.users` are known because those sections are fully spooled before the
manifest is built, exactly as §4.5 spools all tables before emitting the manifest.
`tarPack` therefore still iterates a fixed, already-spooled member list — there is
**no** push↔pull backpressure to reconcile at stream time.

```ts
// Concrete writer/engine: spools every pushed member to tmpDir, never into the live
// tar. Reused by 03 (media, known size) and 04 (users NDJSON, size discovered).
type SpooledMember = { name: string; size: number; filePath: string; sha256: string };

class SpoolWriter implements BackupArchiveWriter {
  readonly members: SpooledMember[] = [];
  constructor(private readonly tmpDir: string) {}

  // Stream `body` (known exact `size`) to a spool file; assert the streamed byte count
  // matches `size` so a header/body size mismatch can NEVER be emitted into the tar.
  async appendStream(name: string, size: number, body: AsyncIterable<Uint8Array>): Promise<void> {
    const { filePath, sha256, byteSize } = await this.spool(body);
    if (byteSize !== size) throw new Error("backup_archive_export_failed");
    this.members.push({ name, size, filePath, sha256 });
  }

  // Serialize NDJSON rows (users/roles/user_roles): the byte size is DISCOVERED while
  // spooling, so this cannot go through the size-first appendStream — it spools then
  // records the member directly and returns the per-member manifest (04 §4.2 counts).
  async appendNdjson(
    name: string,
    rows: AsyncIterable<Record<string, unknown>>,
  ): Promise<ArchiveTableManifest> {
    let rowCount = 0;
    const lines = (async function* () {
      for await (const row of rows) { rowCount += 1; yield Buffer.from(toNdjsonLine(row), "utf8"); }
    })();
    const { filePath, sha256, byteSize } = await this.spool(lines);
    this.members.push({ name, size: byteSize, filePath, sha256 });
    return { key: name, member: name, rowCount, byteSize, sha256 };
  }

  // Shared spool primitive (mirrors spoolTable's write loop, §4.3): O(1) memory.
  private async spool(body: AsyncIterable<Uint8Array>) {
    const filePath = path.join(this.tmpDir, `section-${randomUUID()}.bin`);
    const fh = await open(filePath, "w", 0o600);
    const hash = createHash("sha256");
    let byteSize = 0;
    try {
      for await (const chunk of body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        await fh.write(buf);
        hash.update(buf);
        byteSize += buf.byteLength;
      }
    } finally { await fh.close(); }
    return { filePath, sha256: hash.digest("hex"), byteSize };
  }
}

export type PackBackupArchiveOptions = PackDatabaseArchiveOptions & {
  // Injected by 06 (which lands last and CAN import 03/04); absent ⇒ section skipped.
  mediaExporter?: (writer: BackupArchiveWriter) => Promise<ArchiveMediaManifest>;
  usersExporter?: (engine: ExportEngine) => Promise<ArchiveUsersManifest>;
};

export async function packBackupArchive(opts: PackBackupArchiveOptions): Promise<PackedArchive> {
  // Every section is INDEPENDENTLY opt-in (parent decision 5): database, settings,
  // media and users can each be selected alone. Require only a NON-EMPTY include so
  // settings-only / media-only / users-only archives are producible — matching 05
  // (import of non-database archives + its data-loss guard/test 15), 06's create
  // dialog (gates on selected.length > 0), and backupService.normalizeBackupInclude
  // (accepts any non-empty enum subset). The DB-table spool below is itself gated on
  // "database", so a non-database archive simply carries no table members.
  if (opts.include.length < 1) throw new Error("backup_archive_export_failed");
  // Base spool dir (first match wins): BACKUP_TMP_DIR override → else a LOCAL persistent
  // base from getStorageSettings() (`${base}/backups-tmp`, only for a local/filesystem
  // storage driver; remote s3/azure does NOT yield a spool path) → else os.tmpdir()
  // (§3/§7). The per-run leaf is ALWAYS a fresh `coderso-backup-<uuid>` subdir — neither
  // env nor settings overrides the unique leaf, so no user input enters the path
  // (traversal-safe) and concurrent/repeat runs never collide or wipe each other.
  const baseTmp = await resolveSpoolBase(); // 3-tier, §3/§7 (env → local storage base → os.tmpdir)
  const tmpDir = opts.tmpDir ?? path.join(baseTmp, `coderso-backup-${randomUUID()}`);
  const batchSize = opts.batchSize ?? EXPORT_BATCH_SIZE;
  const runBatch = opts.runBatch ?? defaultRunBatch;
  try {
    await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  } catch { throw new Error("backup_archive_tempdir_failed"); }
  const cleanup = async () => { await rm(tmpDir, { recursive: true, force: true }); };

  try {
    // 1) Spool every DB table first (reuses §4.5's loop) → per-table manifests.
    //    GATED on the opt-in "database" include (parent decision 5): a
    //    settings-/media-/users-only archive spools no tables, so manifest.tables = []
    //    and import restores no DB content (05's data-loss guard relies on this).
    const spooledTables: SpooledTable[] = [];
    if (opts.include.includes("database")) {
      for (const desc of ARCHIVE_TABLE_DESCRIPTORS) {
        spooledTables.push(await spoolTable(desc, tmpDir, batchSize, runBatch));
      }
    }

    // 2) Section writer/engine: collects settings/media/users members into the SAME
    //    tmpDir (spool-first ⇒ counts + checksums known before manifest is built).
    const writer = new SpoolWriter(tmpDir);
    const engine: ExportEngine = { writer, appendNdjson: (n, r) => writer.appendNdjson(n, r) };

    // 3) settings.json member — OWNED BY 01 (resolves 05 Open Q #1). Known size.
    //    Uses the pinned SETTINGS_MEMBER_NAME so 05's readJsonMember matches exactly.
    if (opts.include.includes("settings")) {
      const bundle = await exportConfig({ target: "settings" }); // importExportService.ts:287
      const bytes = Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8");
      await writer.appendStream(SETTINGS_MEMBER_NAME, bytes.byteLength, (async function* () { yield bytes; })());
    }
    // 4) media/* via injected 03 exporter (push through appendStream → spooled).
    let media: ArchiveMediaManifest | undefined;
    if (opts.include.includes("media") && opts.mediaExporter) media = await opts.mediaExporter(writer);
    // 5) users/roles/user_roles via injected 04 exporter (encrypted-only path).
    //    LAND-ORDER TYPING: at 01 land time BackupIncludeOption is
    //    ("database"|"media"|"settings") — "users" is added to the enum by 04
    //    (parent §Coordination), which lands AFTER 01. So a bare
    //    `opts.include.includes("users")` is a TS2345 (`"users"` is out of the union)
    //    and would fail 01's own §8 gate in isolation. Compare through a WIDENED view
    //    so the module typechecks standalone; when 04 widens the enum this stays
    //    correct (no literal narrowing to "users" anywhere in backupArchive.ts).
    let users: ArchiveUsersManifest | undefined;
    if ((opts.include as readonly string[]).includes("users") && opts.usersExporter) {
      users = await opts.usersExporter(engine);
    }

    // 6) Build manifest.json AFTER all sections spooled — media/users counts now known.
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: opts.include,
      tables: spooledTables.map((s) => s.manifest),
      ...(media ? { media } : {}),
      ...(users ? { users } : {}),
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");

    // 7) Pull-based tarPack over the fixed, already-spooled member set: manifest.json
    //    FIRST, then table members, then spooled section members (settings/media/users).
    async function* members(): AsyncGenerator<TarMember> {
      yield { name: MANIFEST_MEMBER_NAME, size: manifestBytes.byteLength,
              body: (async function* () { yield manifestBytes; })() };
      for (const s of spooledTables) {
        yield { name: s.manifest.member, size: s.manifest.byteSize, body: fileChunks(s.filePath) };
      }
      for (const m of writer.members) {
        yield { name: m.name, size: m.size, body: fileChunks(m.filePath) };
      }
    }
    // Same lifecycle contract as §4.5: caller drains `stream`, THEN awaits `cleanup()`.
    return { stream: tarPack(members()), manifest, cleanup };
  } catch (err) {
    await cleanup();
    throw err instanceof Error ? err : new Error("backup_archive_export_failed");
  }
}
```

The public **full-archive orchestrator `packBackupArchive(opts)`** (exported by 01,
invoked from 06's create-wiring, code above) **shares `packDatabaseArchive`'s spool
building blocks** — `spoolTable` (§4.3), `fileChunks`/`tarPack` (§4.4-4.5) — rather
than wrapping `packDatabaseArchive`'s already-returned stream (which cannot be
reopened to interleave section members before `manifest.json`). It adds the
section-dispatch that calls into 03/04, returning `{ stream, manifest, cleanup }`
just like §4.5. `packDatabaseArchive` stays the DB-only convenience entry;
`packBackupArchive` is what the create path actually calls. It assembles members in
this order and returns the fully-populated manifest:

1. `manifest.json` (written FIRST, after all checksums are known).
2. `tables/<key>.ndjson` for every DB descriptor (§4.5).
3. **`settings.json` member — OWNED BY 01** (resolves 05 Open Q #1): when
   `include` contains `"settings"`, 01 emits a `settings.json` member built from
   `exportConfig({ target: "settings" })` (`services/tools/importExportService.ts`,
   the same bundle 484's `importConfigTx` consumes on restore). This keeps the
   parent scope's "database + **settings** + media" promise real — without it a
   full/scheduled backup silently drops settings. No manifest metadata key is added
   for settings (it is tracked via the `include` array; 05 reads the member in PASS 2).
4. `media/*` members appended by 03 via `appendStream`; 01 records the returned
   summary into `manifest.media`.
5. `users`/`roles`/`user_roles` NDJSON members appended by 04 via `appendNdjson`,
   named with the **pinned** `USERS_MEMBER_NAME` / `ROLES_MEMBER_NAME` /
   `USER_ROLES_MEMBER_NAME` constants (encrypted-only path); 01 records the counts
   into `manifest.users`. 05's `readUsersMembers` reads those same pinned names.

**Land-order-safe injection:** 01 lands FIRST and is the sole writer of
`backupArchive.ts`, so it must NOT hard-import 03/04 (they don't exist yet). Instead
`packBackupArchive(opts)` takes **optional injected section exporters** —
`opts.mediaExporter?: (writer: BackupArchiveWriter) => Promise<ArchiveMediaManifest>`
and `opts.usersExporter?: (engine: ExportEngine) => Promise<ArchiveUsersManifest>` —
which the create-wiring caller (**06**, which lands last and can import
`streamMediaIntoArchive` (03) + `exportUsersSection` (04)) passes in. When an
exporter is absent (or its include flag is off) that section is simply skipped. This
keeps 01 free of downstream imports, preserves single-writer, and honors the strict
land order while still producing a full archive at create time.

**Standalone-typecheck rule (`"users"` is out of the union until 04):** because
`BackupIncludeOption` is `("database"|"media"|"settings")` at 01 land time
(`backupTypes.ts:8`; the `"users"` literal is added by **04**, which lands AFTER 01,
and 01 is forbidden from editing `backupTypes.ts` per §2), 01 MUST NOT write a
`BackupIncludeOption` literal narrowing for `"users"` — a bare
`opts.include.includes("users")` is a TS2345 (`Array<T>.includes(x)` requires
`x: T`) and would fail 01's own §8 `bun --cwd core lint:types` / root `tsc` in
isolation. The users-section gate therefore compares through a widened view
(`(opts.include as readonly string[]).includes("users")`, §4.6a step 5) so the
module compiles standalone; this stays correct once 04 widens the enum. The
`.includes("database")`/`.includes("media")`/`.includes("settings")` gates keep the
in-union literal (no cast) — only `"users"` needs the widened compare.

`ARCHIVE_TABLE_DESCRIPTORS` (DB set) intentionally excludes `users`/`roles`/
`user_roles` and settings — those ride the section hooks above, not the DB loop.

### 4.6 Error handling summary

| Situation | Behavior |
|-----------|----------|
| `include` is empty (no section selected) | throw `backup_archive_export_failed` (`packBackupArchive` requires `length >= 1`) |
| `packBackupArchive` `include` lacks `database` | VALID — DB tables skipped, only the opt-in sections (settings/media/users) are archived (parent decision 5) |
| `packDatabaseArchive` called without `database` | throw `backup_archive_export_failed` (DB-only convenience entry; the create path uses `packBackupArchive`) |
| temp dir mkdir fails | throw `backup_archive_tempdir_failed`; nothing spooled |
| DB error mid-spool | reject; `cleanup()` runs; partial spool removed; no stream returned |
| stream consumer aborts | `tarPack` controller `.error(err)`; caller's `finally` runs `cleanup()` |
| any thrown non-Error | wrapped as `Error("backup_archive_export_failed")` |

All codes pass through `sanitizeBackupError()` at the service layer; no raw paths or
row data ever surface.

## 5. Testing Requirements

**Lane:** **Bun** (`bun:test`) — this is DB + streams + `node:fs`/`node:crypto`
(exactly the reasons the parent pins Bun). Vitest is NOT used here. File:
`tests/unit/backups/backupArchive.test.ts`, mirroring the existing Bun harness in
`tests/unit/backups/backupService.test.ts:5` (`import { … } from "bun:test"`, `db`
from `../../../core/db/client`). It runs under `test:bun` (root `package.json:26`,
glob includes `tests/unit`).

**Shared REMOTE test-DB safety (mandatory — render.com `DATABASE_URL`):**
- Every seeded row uses `randomUUID()` ids and a unique run marker (e.g.
  `slug`/`name` prefixed `t511-01-<uuid>`); collect all inserted ids.
- `afterEach`/`finally` deletes **only** the collected ids via `inArray(table.id, ids)`
  (composite junctions: delete by their FK ids). **Never** `truncate`, never a
  blanket `db.delete(table)`.
- 01 has **no restore/import path**, so no test ever performs a destructive replace
  over the shared DB. All DB interaction is scoped inserts + reads + scoped deletes.
- Prefer FK-leaf tables (`redirects`, `pages`, `postPreviewTokens`) + one junction
  (`postTermAssignments`) for round-trip fixtures to keep FK setup minimal.
- **Full-table export vs ambient rows (critical for the count/empty assertions).**
  `packDatabaseArchive`/`packBackupArchive` export **whole tables** by design —
  `defaultRunBatch` (§4.2) does an unscoped `db.select().from(table)` paged only by
  the keyset cursor, with **no** seeded-id filter (mirrors 484's unbounded
  `buildDatabaseSnapshot`, `backupService.ts:300-373`). On the shared REMOTE DB every
  snapshot table already holds ambient/other-test/real rows, so **no snapshot table
  is ever empty** and a real full-table run pages the ambient rows too. Therefore any
  test that asserts an **exact** `rowCount` or an **exact** `runBatch` call count MUST
  either (a) drive the engine through the injectable `runBatch` seam **scoped to the
  run's seeded ids** — a test `runBatch` that ANDs `inArray(cols[pk], seededIds)` onto
  the cursor `where` (drizzle `inArray` is already imported, `backupService.ts:3`) so
  only seeded rows are visited — or (b) use the **pure keyset-math variant** with a
  fake in-memory `runBatch` and **no DB** at all. A bare full-table run over the
  shared DB gives non-deterministic counts and MUST NOT back an exact assertion.
- **Timeout guard.** A real full-table `packDatabaseArchive` over the shared DB may be
  slow/large (it spools every ambient row of all 22 tables) and can approach the
  `test:bun` 15s per-test window. Keep the DB-backed round-trip fixture (test 1) small
  and use the seeded-id-scoped or no-DB `runBatch` seam for the paging/count tests
  (tests 3–4) so they neither spool nor time out on ambient data.

**Regression-test shapes:**
1. **Round-trip integrity** — seed scoped rows across ≥3 tables incl. one composite-PK
   junction; `packDatabaseArchive({ include:["database"] })`; drain `stream`; untar
   (reuse the same 512-block reader 05 will formalize, or a local test helper);
   assert `manifest.json` is the FIRST member; for each seeded table recompute SHA-256
   over the member bytes and assert it equals `manifest.tables[].sha256`; assert
   `rowCount`/`byteSize` match; `JSON.parse` each NDJSON line and assert the seeded
   rows are present and field-equal (Date→ISO tolerated).
2. **Keyset across batch boundaries** — seed > 2×`batchSize` rows in one table (call
   with `batchSize: 3`); assert every seeded id appears **exactly once**, no dupes,
   no gaps — proves the `WHERE id > cursor` / row-value cursor is correct. Include the
   composite junction crossing a batch boundary.
3. **Empty member (engine property, NOT a DB claim)** — the "zero rows ⇒ still emit a
   member with 0 lines, `rowCount: 0`, and the SHA-256 of empty content" contract is a
   property of the engine, but it CANNOT be observed against a real snapshot table on
   the shared DB (every snapshot table holds ambient rows, so none is ever empty — see
   §5 "Full-table export vs ambient rows"). Assert it via the **injectable `runBatch`
   seam with a fake that yields an empty first batch** (no DB): drive `spoolTable`/
   `packDatabaseArchive` with a `runBatch` returning `[]`, then assert the descriptor
   still produces a `tables/<key>.ndjson` member with `rowCount: 0`, `byteSize: 0`, and
   `sha256 === createHash("sha256").digest("hex")` of empty content. Separately, on the
   real DB, assert only **member existence** — the manifest lists a member for **all 22
   descriptors** (every `ARCHIVE_TABLE_DESCRIPTORS` key present) — and do **not** assert
   any table's `rowCount` is 0 (it won't be, given ambient rows).
4. **Streaming assertion (no full-table load)** — proves paging (many bounded selects),
   not one big select. Do this WITHOUT depending on ambient rows, via one of two forms:
   - **Pure keyset-math, no DB (preferred, deterministic):** run `streamTableRows`/
     `spoolTable` with a **fake in-memory `runBatch`** that serves exactly N synthetic
     rows in cursor order, `batchSize: k`; spy the fake's call count. `streamTableRows`
     breaks as soon as it sees a short page (`if (batch.length < batchSize) break;`), so
     a trailing empty-batch call only happens when the last page is exactly full:
     `expected = (N % k === 0) ? N / k + 1 : Math.ceil(N / k)` (and `1` for `N === 0`,
     which the `N/k+1` branch already yields). To keep the assertion a clean literal,
     PREFER N an exact multiple of k (e.g. N=6, k=3 → 3 calls: two full pages + one
     empty page that ends the loop); for N not a multiple of k (e.g. N=7, k=3 → 3 calls,
     third page short-breaks) assert `Math.ceil(N / k)`. No DB row is read, so the count
     is exact regardless of ambient data.
   - **Seeded-id-scoped DB variant (optional):** if a DB-backed variant is wanted, the
     injected `runBatch` MUST scope reads to the run's seeded ids — a spy `runBatch` that
     ANDs `inArray(cols[desc.cursor[0]], seededIds)` onto the cursor `where` (drizzle
     `inArray`, `backupService.ts:3`) so it pages ONLY the N seeded rows, then assert the
     same formula. A bare full-table `defaultRunBatch` over the shared DB pages ambient
     rows too and MUST NOT back an exact call-count assertion.
5. **Manifest contract** — assert `artifactVersion === 2`, `schemaVersion`,
   `engineVersion === ARCHIVE_ENGINE_VERSION`, `include` echoes input, member names are
   `tables/<key>.ndjson`.
6. **Drift guard (lock-step with 484)** — assert `ARCHIVE_TABLE_DESCRIPTORS` has 22
   entries and its ordered key list equals the documented snapshot set/order from
   `snapshotTableOrder` (`backupService.ts:553-583`) / `BackupArtifactDatabase`
   (`backupTypes.ts:105-133`); assert the two junction descriptors carry composite
   cursors (`["entryId","termId"]`, `["postId","termId"]`). Fails loudly if 484's set
   changes without updating the descriptor.
7. **Cleanup** — after draining + `cleanup()`, assert the temp spool dir no longer
   exists; assert `cleanup()` is idempotent (second call no-throw).
8. **Tar structural validity** — headers are 512 bytes, checksum field valid, bodies
   NUL-padded to 512, EOF is two zero blocks.

## 6. Allowlist / round-trip discipline

- No new *validated route key* is introduced in 01 (no schema edits), so no
  allowlist entry is required yet. The **manifest** is the archive's own schema; its
  fields are covered by the round-trip + manifest-contract tests above. When 05 adds
  the import-side manifest validator, it becomes the reject-unknown gate for these
  keys — 01’s manifest MUST stay a strict, closed shape (no free-form extra keys) so
  05’s validator can enforce it.
- `ARCHIVE_ARTIFACT_VERSION`/`ARCHIVE_SCHEMA_VERSION`/`ARCHIVE_ENGINE_VERSION` are the
  version handshake later subtasks assert against.

## 7. Coordination

- **Changelog:** do NOT create `_docs/_CHANGELOG/1281-*.md` here. Only the closure
  subtask **511-07** writes the changelog (1281, pinned per parent §Coordination)
  and edits `_docs/_TASKS/*`. 01 ships code + tests only.
- **Land order:** strictly sequential **01 → 02 → 03 → 04 → 05 → 06 → 07**. 01 lands
  first as the foundation.
- **Single-writer:** `core/services/backups/backupArchive.ts` and
  `tests/unit/backups/backupArchive.test.ts` are owned solely by 01. Later subtasks
  **compose against** this module and MUST NOT edit it:
  - 02 wraps `packDatabaseArchive().stream` with streaming gzip + AES-256-GCM/scrypt
    (owns `backupCrypto.ts` **and** the entire `.cbk` binary crypto header/frame
    format — 01 defines no crypto-field type).
  - 03 appends `media/*` members via the `appendStream` writer seam (§4.6a), injected
    into `packBackupArchive` by 06 (owns `mediaArchive.ts`).
  - 04 appends `users`/`roles`/`user_roles` NDJSON members, encrypted-only (owns its
    module); those tables are intentionally NOT in `ARCHIVE_TABLE_DESCRIPTORS`.
  - 05 implements the reverse (untar/validate/batched transactional restore),
    reusing 484’s `replaceSnapshotTables` ordering knowledge — not touched here.
  - 06 wires `packBackupArchive` (§4.6a full orchestrator, injecting 03/04's
    exporters) into `createBackup`/scheduler + Admin UI.
- **Env/config:** the optional backend-only `BACKUP_TMP_DIR` (spool location) is
  documented by 07 in `.env.example` + `docs/develop/getting-started.md` (parent
  §Coordination); 01 reads it defensively with an `os.tmpdir()` fallback.

## 8. Gates (run before hand-off)

- `bun --cwd core lint && bun --cwd core lint:types`
- root `tsc -p tsconfig.json --noEmit` (catches test excess-prop errors outside
  `core/`, per the typecheck-scope gotcha)
- `bun test tests/unit/backups/backupArchive.test.ts` (named file; avoids full-glob
  flakes)
