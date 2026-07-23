# TASK-511-04: Optional users + RBAC role-matrix include (opt-in, encrypted-only)

# FileName: TASK-511-04-Users-And-RBAC-Matrix-Include.md

**Priority:** High
**Category:** Backups / Data / Security / Admin
**Estimated Effort:** Medium
**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Depends On:** TASK-511-01 (streaming batched export engine + archive format & manifest), TASK-511-02 (compression + passphrase encryption), TASK-511-03 (media file streaming)
**Blocks:** TASK-511-05 (import-file pipeline — restores the users section via this module's tx helper)
**Status:** ⏳ To Do
**Land order:** strictly sequential — lands 4th (after 01→02→03, before 05→06→07).

---

## 1. Overview / Goal

Add a fourth, sensitive, **opt-in** backup include section: `users` — meaning the
full **RBAC matrix**: the `users` table + the `roles` table + the `user_roles`
assignment junction. Large sites that adopt Backup v2 must be able to move their
whole identity/authorization graph (accounts, roles, permission sets, who-has-what)
between environments without rebuilding roles and re-assigning users by hand.

Because this section carries password hashes and (for legacy rows) plaintext /
encrypted email, it is the most security-sensitive part of the archive. This
subtask enforces the owner-confirmed constraints (parent §"Confirmed design
decisions" 5 + §"Security Contract"):

- `users` is **opt-in only** on export (never selected by default) and is **only
  ever permitted into an ENCRYPTED archive**. Selecting `users` without a
  passphrase (unencrypted artifact) is rejected **before any row is read**.
- Password hashes (`users.password_hash`) travel as **opaque blobs** inside the
  encrypted archive only — never logged, never placed in the manifest, never
  returned to any client, never emitted to an unencrypted stream.
- Import of the users section is **opt-in + confirmation-gated** and **must not
  escalate privileges**: it faithfully reproduces exactly what the archive
  states (no added grants, no auto-promotion) and **preserves the existing
  admin-lockout safety** (`last_admin`) — a restore that would leave the system
  with zero admins fails closed and rolls back.

This subtask owns the users/roles/user_roles export + restore logic as a
dedicated module and makes only minimal, additive extensions to the shared
allowlists introduced by 01/02.

### Verified schema (grounded in `core/db/schema.ts`)

The three tables and their real column names (SQL identifier in parentheses):

- **`users`** (`pgTable("users")`, `schema.ts:15`): `id` (uuid pk), `email`
  (`email`, notNull unique — **plaintext for legacy rows**), `emailHash`
  (`email_hash`, nullable), `emailEncrypted` (`email_encrypted` jsonb, nullable),
  `passwordHash` (`password_hash`, notNull — **opaque argon2 hash**, see
  `core/services/auth/password.ts` `@node-rs/argon2`), `name` (`name`), `status`
  (`status`, default `"active"`), `createdAt` (`created_at`), `updatedAt`
  (`updated_at`), `lastLoginAt` (`last_login_at`).
- **`roles`** (`pgTable("roles")`, `schema.ts:28`): `id` (uuid pk), `name`
  (`name`, notNull unique), `description` (`description`), `permissions`
  (`permissions` jsonb notNull — string[] or `["*"]`), `createdAt` (`created_at`).
- **`user_roles`** (`pgTable("user_roles")`, `schema.ts:36`): composite PK
  `[userId, roleId]`; `userId` (`user_id` → `users.id` ON DELETE CASCADE),
  `roleId` (`role_id` → `roles.id` ON DELETE CASCADE).

**Corrected assumption / critical trap (do NOT delete-all users on restore):**
The parent's snapshot restore (`replaceSnapshotTables`, `backupService.ts:569`)
does *delete-all-then-reinsert* for the **content** table set, and that set
**deliberately excludes** `users`/`roles`/`user_roles`. `users.id` is an FK
target of MANY out-of-scope tables, across all three delete behaviours:
**cascade** children — `sessions.userId` (`schema.ts:57`), `searchHistory.userId`
(`schema.ts:154`), `password_resets`, `user_settings`; **set-null** children —
`pages.authorId` (`schema.ts:224`) and `posts.authorId` (`schema.ts:850`); and
several `created_by` columns declared with **no `onDelete`** (i.e. RESTRICT), e.g.
`widgetTemplateRevisions.createdBy` (`schema.ts:306`) and `pageRevisions.createdBy`
(`schema.ts:345`), plus audit-log actor FKs.
A blanket `DELETE FROM users` during restore would either **cascade-wipe**
sessions/revisions or be **blocked by RESTRICT**, and could corrupt or destroy
data owned by other tables that are not part of this archive. Therefore the users
section restore uses **UPSERT (insert-or-update by primary key)** semantics —
never delete-all — and reconciles `user_roles` only for the users present in the
archive. This keeps referential integrity with the (out-of-scope) session/audit/
content tables and is the privilege-safe, lockout-safe choice. (See Open
Questions for the one confirm-worthy consequence.)

## 2. Owning module(s) — single-writer

**Create (owned exclusively by TASK-511-04):**

- `core/services/backups/backupUsersSection.ts` — the whole users/RBAC section
  engine: table descriptors, per-table column allowlist + `normalize*` reject-
  unknown parsers, `exportUsersSection` (streams NDJSON into the engine writer,
  encryption-gated), `restoreUsersSectionTx` (opt-in, tx-scoped, privilege- and
  lockout-safe upsert), and the export guard `assertUsersEncryptionAllowed`.
- `tests/unit/backups/backupUsersSection.test.ts` — Bun test lane (below).
  (Under `tests/unit/`, which the `test:bun` glob covers — `package.json:26`; the
  `core/` tree is **not** globbed, so keep this file beside 01/02/03/05's tests.)

**Extend (additive-only; declared here, coordinated with the earlier owners —
these lands are already merged when 04 lands, and 04 is the sole writer touching
these lines):**

- `core/services/backups/backupTypes.ts` — append `"users"` to the
  `backupIncludeOptions` const array (`backupTypes.ts:8`); the derived
  `BackupIncludeOption` union picks it up automatically. Users are NOT added to
  `BackupArtifactDatabase`/`snapshotTableOrder` — they are their own
  encrypted-only, upsert-restored section, not part of the delete-all content set.
  The manifest's `users` counts block (`ArchiveUsersManifest`) is **pre-declared as
  optional by 01** (01 §4.1 / §4.6a) so 04 only **populates** it via the
  `ExportEngine` hook — 04 does **NOT** edit `backupArchive.ts` (01 sole writer).
- `core/server/validation/backupSchemas.ts` — add `"users"` to the `include`
  enum in `createBackupSchema` (`backupSchemas.ts:11`) and raise `maxItems` from
  `3` → `4` (`backupSchemas.ts:9`). (The schedule's include allowlist, if 06
  introduces one, mirrors the same enum.)
- The export path + 511-05 restore/import pipeline **call into**
  `backupUsersSection.ts` (dependency inversion) rather than duplicating logic. On
  export, `exportUsersSection` is **injected into 01's `packBackupArchive` as
  `opts.usersExporter` by 06's create-wiring** (01 §4.6a land-order-safe injection —
  01 lands first and cannot import 04), NOT hard-wired inside 01's module. On
  restore, 05 calls `restoreUsersSectionTx` inside its outer tx.
- **Named call-site of the encrypted-only guard (single owner, cannot be dropped).**
  `assertUsersEncryptionAllowed` is defined here (04) but its sole invocation lives in
  **06's create-rewiring**: 06 calls `assertUsersEncryptionAllowed(include, { enabled })`
  inside `createBackup` (`backupService.ts:425`) **inside the create `try/catch`, AFTER
  the `running`-row insert (`backupService.ts:429-436`)** so a throw self-marks that row
  `failed` via `markBackupFailed` (`backupService.ts:441-450` route throws to
  `markBackupFailed`). It operates on the include set already resolved by
  `normalizeBackupInclude(input.include)` (`backupService.ts:428`) and runs **before any
  user/role row is read or `packBackupArchive` is invoked** — the fail-closed pre-read
  gate that yields a **PERSISTED** `failed` backups row carrying the coded
  `backup_users_requires_encryption` (which 06 surfaces via `createBackup`'s self-fail
  path). The guard MUST NOT run before the running-row insert: doing so would throw with
  no persisted row and break 06's tested persisted-failed-row behavior. 06 MUST reference the guard **by name**
  (`assertUsersEncryptionAllowed`), not merely as "the 02/04 encrypted-only guard", so
  the security gate has exactly one named owner (04, defines) and one named caller (06,
  invokes) and cannot be silently omitted. The scheduled path (`createBackup({ kind:
  "scheduled" })`) flows through the same `createBackup` guard, so it is covered by the
  same single call-site.

**Do NOT touch** in this subtask: the media streaming (03), the crypto primitives
(02), the import route/multipart handling (05), the admin UI/scheduler (06),
`_docs/_TASKS/*` or `_docs/_CHANGELOG/*` (07 only).

## 3. Security Contract

This subtask is *service-layer* (no new route of its own — the create route
`POST /admin/api/backups` and the 511-05 import/restore route consume it), but it
is squarely route-touching via those paths, so it restates and extends the parent
Security Contract:

- **Encrypted-only export (fail-closed, pre-read).** `assertUsersEncryptionAllowed`
  runs in the export path *before any user/role row is queried*. If `include`
  contains `"users"` and the archive is not encrypted (no passphrase / encryption
  disabled — the encryption context comes from 511-02), throw
  `backup_users_requires_encryption` (mapped 400 in `mapBackupError`,
  `backupRoutes.ts:80`). No unencrypted `.cbk` can ever contain a users section.
- **Password hashes are opaque + never leak.** `password_hash` is copied verbatim
  into the NDJSON row (which only exists inside the gzip+AES-GCM stream). It is
  **never** written to the `manifest.json` (manifest carries only row counts +
  checksums per parent §decision 1), never `console.log`/`logAudit`-ged, never
  part of any `BackupRecord`/API response, never in an error message. NDJSON
  serialization must not be routed through any error/debug logger.
- **RBAC + CSRF + rate-limit unchanged.** Export create stays behind
  `requirePermission("backups:write")` + CSRF (`backupRoutes.ts:150`); restore/
  import stays behind `backups:write` + confirmation (`backupRoutes.ts:170`,
  parent §Security Contract). This subtask adds no new permission.
- **Import is opt-in + confirmation-gated + no privilege escalation.**
  `restoreUsersSectionTx` runs only when the caller explicitly opts in
  (`restoreUsers === true`, a distinct flag from the archive merely *containing*
  the section) AND the outer restore is already `confirm === true`
  (`backup_restore_confirmation_required` unchanged). It reproduces exactly what
  the archive states: role permissions are re-validated through the permission
  allowlist (`listPermissionIds`, `core/services/admin/permissionsCatalog.ts:294`)
  so an unknown/forged permission string is dropped (cannot smuggle a new
  capability); no user is auto-granted a role that is not in the archive's
  `user_roles`; the actor is never elevated.
- **Admin-lockout safety preserved.** After the upsert, inside the same tx, assert
  ≥1 user still holds an admin role — matching the existing lockout semantics
  (`countUsersWithRoles`, `rolesService.ts:80` / `getAdminUserIdsExcluding`,
  `usersService.ts:54`), which count **any** user holding the role and do **not**
  filter by `users.status`; this contract deliberately mirrors that (no `status`
  filter) so restore behaviour matches v1. Admin roles are resolved via the
  canonical `getAdminRoleIds` (`core/services/admin/rolesService.ts:72`), which
  counts a role as admin **iff `hasFullAccess(role)`** (permissions include `"*"`);
  role name `"admin"` alone is **not** sufficient — a restored role literally named
  `admin` but lacking `"*"` does not count (this differs from `isSystemRole`,
  `rolesService.ts:57`, which getAdminRoleIds does NOT call). Zero admins ⇒ throw
  `backup_users_restore_no_admin` ⇒ tx rolls back
  (fail-closed, no lockout). This mirrors `ensureNotLastAdmin`
  (`core/services/admin/usersService.ts:66`) / `ensureAdminRoleRemains`
  (`rolesService.ts` `last_admin`).
- **Audit (coordinated requirement on 06/05 — NOT a 04 edit).** The existing
  `backups.create` audit metadata `{ kind, include }` (`backupRoutes.ts:157`, inside
  `router.post("/backups", …)`) lives in **06's** create-handler region, and the
  `backups.restore` metadata `{ status }` (`backupRoutes.ts:175`) lives in **05's** v2
  restore/import region (parent §Coordination region map: `backupRoutes.ts` = "04 users
  codes, 05 import route/codes, 06 POST /backups create-handler"). 04 owns only the two
  `mapBackupError` codes on that file and must **not** touch either handler body.
  Therefore this is a requirement 04 places on those owners:
  - **Create metadata stays `{ kind, include }` — NO new flag (reconciled with 06).**
    06's `backups.create` audit metadata (`backupRoutes.ts:157`) **stays exactly
    `{ kind, include }`** (06 §"owns the POST /backups handler region" + 06's create-path
    testing note both pin it to `{ kind, include }`). 04 deliberately does **NOT** ask 06
    to add a `usersIncluded` boolean: whether the users section was included is **already
    fully encoded** in the audited `include` array (it contains the literal `"users"` iff
    the RBAC matrix was selected — `include.includes("users")` is derivable by any reader
    of the log), so a separate `usersIncluded` field would be **redundant** and would put
    04 and 06 in direct contradiction over the same handler region. The array-encoded form
    is authoritative; 06 owns that region and its `{ kind, include }` shape is unchanged by
    04.
  - **Restore metadata: 05 adds `usersRestored: number`.** Unlike create (where the
    include array already carries the signal), the restore metadata `{ status }`
    (`backupRoutes.ts:175`, 05's region) has **no** field that reveals whether the users
    section was actually applied, so **05 adds `usersRestored: number`** to the restore
    audit metadata (the count `restoreUsersSectionTx` returns) — a **non-sensitive count
    only, consistent with the sibling `tablesRestored` / `rowsRestored` / `mediaRestored`
    count fields, never emails or hashes**. 05 owns that route/audit region (§5.6), so its
    count shape is authoritative; a count is not PII (`> 0` is trivially derivable by any
    reader), so it is logged verbatim rather than collapsed to a boolean. This half is a
    genuine new signal, not a redundant duplicate, so it is retained (05 §Audit already
    carries `usersRestored` in its restore metadata block).
  04's §6 single-writer list stays authoritative and does not enumerate any
  `backupRoutes.ts` handler-body edit.

## 4. Implementation Pseudocode

All in `core/services/backups/backupUsersSection.ts` unless noted. Reuse the
engine's `db` (`core/db/client`) and the local `DbTransaction` type shape
(`backupService.ts:60` — `Parameters<Parameters<typeof db.transaction>[0]>[0]`).

### 4.1 Table descriptors + reject-unknown normalizers

```ts
import { users, roles, userRoles } from "../../db/schema";
import { listPermissionIds } from "../admin/permissionsCatalog";
import { getAdminRoleIds } from "../admin/rolesService";
import {
  USERS_MEMBER_NAME, ROLES_MEMBER_NAME, USER_ROLES_MEMBER_NAME,
  type ArchiveUsersManifest, // 01 — pinned manifest counts type (01 §4.6a line 179)
} from "./backupArchive"; // 01 — PINNED section member names (writer↔reader agreement)

// Column allowlists (SQL identifiers as they appear in NDJSON — drizzle select
// yields the JS keys; the engine serializes JS keys, matching the content
// snapshot path). Keep in lock-step with schema.ts.
const USER_KEYS   = ["id","email","emailHash","emailEncrypted","passwordHash",
                     "name","status","createdAt","updatedAt","lastLoginAt"] as const;
const ROLE_KEYS   = ["id","name","description","permissions","createdAt"] as const;
const USERROLE_KEYS = ["userId","roleId"] as const;

// Row types — EXPORTED so 05's import pipeline reuses them (single source of truth
// for the reject-unknown parse; 05 §7 Q4). Derived from the drizzle schema.
export type UserRow = typeof users.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
export type UserRoleRow = typeof userRoles.$inferSelect;

// Strict, fail-closed per-row parse (mirrors parseBackupArtifact's reject-unknown
// posture, backupService.ts:647). Reject rows with unknown keys; require the
// notNull columns; NEVER include a row value in the thrown message.
// EXPORTED — 05 imports and reuses these three normalizers directly (05 §7 Q4);
// `normalizeRolePermissions` below stays module-internal.
export function normalizeUserRow(raw: unknown): UserRow { /* isPlainObject; reject
  unknown keys vs USER_KEYS; require id+email+passwordHash+status; revive
  created/updated/lastLogin date strings -> Date (same as reviveRowsForInsert,
  backupService.ts:549); passwordHash copied verbatim, unread */ }
export function normalizeRoleRow(raw: unknown): RoleRow { /* reject unknown; require
  id+name+permissions; permissions -> normalizeRolePermissions() */ }
export function normalizeUserRoleRow(raw: unknown): UserRoleRow { /* reject unknown;
  require userId+roleId */ }

// Privilege-bound permission normalization: keep "*" as ["*"] (full access is a
// legitimate archived state) but drop any string not in the catalog so a forged
// archive cannot introduce a brand-new capability token.
function normalizeRolePermissions(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string") : [];
  if (arr.includes("*")) return ["*"];
  const allowed = new Set(listPermissionIds());
  return [...new Set(arr.filter((p) => allowed.has(p)))];
}
```

### 4.2 Export — encryption-gated NDJSON streaming

```ts
export function assertUsersEncryptionAllowed(
  include: BackupIncludeOption[], encryption: { enabled: boolean }
): void {
  if (include.includes("users") && !encryption.enabled) {
    throw new Error("backup_users_requires_encryption");
  }
}

// Called by the 511-01 engine's section dispatch when include.includes("users").
// `writer` = the engine's per-table NDJSON sink into the tar member (parent
// §decision 1). Streamed via keyset pagination (stable id cursor, ~5–10k/batch,
// parent §decision 4) so a million-user table never loads fully into memory.
// user_roles has no single-column monotonic id -> page by (userId,roleId) keyset.
// `ExportEngine` is IMPORTED from 01 (`backupArchive.ts`, 01 §4.6a) — its `writer`
// (`appendStream`) + `appendNdjson` NDJSON sink. 04 does not redeclare it.
// Return type is 01's PINNED `ArchiveUsersManifest = { users; roles; userRoles }`
// (imported above) so exportUsersSection satisfies 01's injection seam verbatim:
// `usersExporter?: (engine: ExportEngine) => Promise<ArchiveUsersManifest>` (01 line 572,
// invoked at 01 line 634). No local/phantom count type is introduced.
export async function exportUsersSection(engine: ExportEngine): Promise<ArchiveUsersManifest> {
  // Precondition already asserted by assertUsersEncryptionAllowed — invoked by 06's
  // createBackup (backupService.ts:425) inside the create try/catch (after the `running`
  // row insert, so a throw self-marks the row failed), BEFORE any user/role read.
  // exportUsersSection does NOT re-assert (single named call-site).
  // Member names come from 01's PINNED constants (imported from backupArchive.ts) so
  // 05's readUsersMembers reads the EXACT same names — no bare string literals here.
  const usersCount  = await streamTableNdjson(engine, USERS_MEMBER_NAME,      users,     USER_KEYS,     keyById);
  const rolesCount  = await streamTableNdjson(engine, ROLES_MEMBER_NAME,      roles,     ROLE_KEYS,     keyById);
  const urCount     = await streamTableNdjson(engine, USER_ROLES_MEMBER_NAME, userRoles, USERROLE_KEYS, keyByUserRole);
  // Return counts for the manifest ONLY (no row data). NEVER log rows.
  return { users: usersCount, roles: rolesCount, userRoles: urCount };
}
```

**Keyset-pagination helper (the novel runtime piece — spelled out).** `exportUsersSection`
above delegates every table to one `streamTableNdjson` wrapper over 01's `appendNdjson`
(`backupArchive.ts:500` — `appendNdjson(memberName, rows: AsyncIterable<Record<string,
unknown>>): Promise<ArchiveTableManifest>`, 01 line 500). `appendNdjson` **returns an
`ArchiveTableManifest`** whose `.rowCount` (`backupArchive.ts:162`) is exactly the count
`ArchiveUsersManifest` wants, so the wrapper just hands the async row generator IN and
hands the `rowCount` back OUT — no local count type is invented. The generator is a
**keyset (seek) pager**: fixed-size batches ordered by a stable key, cursor advanced by the
LAST row of each batch (NO `OFFSET`), so a million-row table stays O(batch) in memory
(parent §decision 4, ~5–10k/batch). Two cursor comparators are provided — `keyById` for the
single-column uuid PK (`users`, `roles`) and `keyByUserRole` for the composite
`(userId, roleId)` PK (`user_roles`, which has no single monotonic id):

```ts
import { asc, getTableColumns, gt, inArray, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm"; // see 01 §4.2 AnyColumn note (below)
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/client";

const EXPORT_BATCH = 5000; // parent §decision 4 (~5–10k rows/batch)

// keyFn = an async generator (table, keys) => AsyncIterable<Record<string,unknown>>.
// The wrapper only forwards the generator to 01's appendNdjson and returns the count;
// it introduces NO count type of its own (01's ArchiveTableManifest.rowCount is the
// source of truth). `select(pick(table, keys))` projects exactly the allowlisted
// columns (USER_KEYS / ROLE_KEYS / USERROLE_KEYS) — nothing outside the allowlist is read.
async function streamTableNdjson(
  engine: ExportEngine,
  member: string,
  table: PgTable,
  keys: readonly string[],
  keyFn: (table: PgTable, keys: readonly string[]) => AsyncIterable<Record<string, unknown>>,
): Promise<number> {
  const manifest = await engine.appendNdjson(member, keyFn(table, keys));
  return manifest.rowCount; // 01's ArchiveTableManifest.rowCount (backupArchive.ts:162)
}

// COLUMN-TYPING (consistent with 01 §4.2's AnyColumn note — the identical drizzle
// hazard): a generic `PgTable`-typed param has NO string index and does NOT expose
// `.id`/`.userId`/`.roleId` as concrete columns, so `gt(table.id, …)` / `asc(table.id)` /
// `table[k]` are TS2339 / TS7053 and `table.userId` in the `sql` template is likewise
// untyped. Resolve columns through `getTableColumns(table)` (the repo's canonical
// access, `backupService.ts:553`) cast to `Record<string, AnyColumn>` — NOT
// `Record<string, unknown>`: `asc`/`gt`/`sql` require `AnyColumn | SQLWrapper`, so
// `unknown` fails `lint:types` / root `tsc` (01 §4.2). `AnyColumn` is exported from the
// `drizzle-orm` root (re-exported via `column.js`). This is the SAME pattern 01 applies
// in `streamTableRows`/`defaultRunBatch`, so 01 and 04 handle the hazard identically.

// Single monotonic uuid PK (users, roles): cursor = last row's id; WHERE id > cursor.
async function* keyById(table: PgTable, keys: readonly string[]): AsyncIterable<Record<string, unknown>> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>; // 01 §4.2 AnyColumn note
  let cursor: string | null = null;
  for (;;) {
    const rows = await db.select(pick(table, keys)).from(table)
      .where(cursor === null ? undefined : gt(cols["id"], cursor))
      .orderBy(asc(cols["id"])).limit(EXPORT_BATCH);
    for (const r of rows) yield r as Record<string, unknown>;
    if (rows.length < EXPORT_BATCH) return;      // last (short) page
    cursor = (rows[rows.length - 1] as Record<string, unknown>).id as string; // advance the seek cursor
  }
}

// Composite (userId, roleId) PK (user_roles — no single monotonic id): use SQL
// row-value comparison for a stable TOTAL order over the pair, seeking past the last
// tuple: (user_id, role_id) > (cursor.userId, cursor.roleId).
async function* keyByUserRole(table: PgTable, keys: readonly string[]): AsyncIterable<Record<string, unknown>> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>; // 01 §4.2 AnyColumn note
  let cursor: { userId: string; roleId: string } | null = null;
  for (;;) {
    const rows = await db.select(pick(table, keys)).from(table)
      .where(cursor === null ? undefined
        : sql`(${cols["userId"]}, ${cols["roleId"]}) > (${cursor.userId}, ${cursor.roleId})`)
      .orderBy(asc(cols["userId"]), asc(cols["roleId"])).limit(EXPORT_BATCH);
    for (const r of rows) yield r as Record<string, unknown>;
    if (rows.length < EXPORT_BATCH) return;
    const last = rows[rows.length - 1] as Record<string, unknown>;
    cursor = { userId: last.userId as string, roleId: last.roleId as string };
  }
}

// pick(table, keys) => the drizzle select-projection object { [k]: <column> } for the
// allowlisted columns only (never a raw select-all — keeps the NDJSON in lock-step with
// the KEYS allowlist and out-of-allowlist columns unread). Columns are resolved via
// `getTableColumns(table) as Record<string, AnyColumn>` (01 §4.2 AnyColumn note) — a
// bare `table[k]` on a generic `PgTable` is TS7053 and would fail root `tsc` (§5).
function pick(table: PgTable, keys: readonly string[]): Record<string, AnyColumn> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>;
  return Object.fromEntries(keys.map((k) => [k, cols[k]]));
}
```

**`chunk` (restore batching helper, §4.3).** A trivial pure array splitter used by the
UPSERT/reconcile loops — `function chunk<T>(a: T[], n: number): T[][]` slices `a` into
`ceil(a.length / n)` runs of ≤ `n` (n = 500 there); no DB access. Covered by the same Bun
test file (it is exercised transitively by scenario 3's round-trip).

Data flow (export): `createBackup` (`backupService.ts:425`) → `normalizeBackupInclude`
(`:428`) → **06 invokes `assertUsersEncryptionAllowed(include, { enabled })`**
(fail-closed, pre-read; 04 defines it, 06 is the sole named caller)
→ engine opens encrypted (02) gzip (02) tar (01) → `exportUsersSection` streams
three NDJSON members keyset-batched → manifest records the three counts +
per-member checksum. Password hashes ride inside the encrypted stream, untouched.

### 4.3 Restore — opt-in, upsert, privilege- & lockout-safe (tx-scoped)

> **⚠ EXPLICIT, BOUNDED, OWNER-SCOPED MEMORY EXCEPTION (parent §"Confirmed design
> decisions" 4, lines 118–123 — recorded here in the owning subtask, mirrored in
> 05 §5.5, re-stated at closure in 07 §4).** The parent's streaming / no-OOM
> guarantee covers EVERY section symmetrically, so import normally must stream +
> batch each NDJSON member (a bounded window like the content tables) rather than
> `collectLines` it into a full in-memory array before the upsert. **This subtask
> takes the parent-sanctioned exception for the users section ONLY** (the
> `users` / `roles` / `user_roles` members): `restoreUsersSectionTx` receives the
> three sections as **fully-materialized `UserRow[]` / `RoleRow[]` / `UserRoleRow[]`
> arrays** (05 §5.5 `collectLines` them for exactly this signature), and this is a
> deliberate, correctness-mandated full materialization — NOT a silent violation.
> **Why full materialization is genuinely required for correctness** (the parent's
> named "admin-lockout reconciliation that must observe all admin rows" clause):
> the restore's fail-closed correctness guards CANNOT be evaluated over a bounded
> streaming window because each must observe the WHOLE archived set against the
> whole target env *before any write*:
> - **Step 0 — natural-key (email / role name) collision guard.** The UPSERT
>   targets the PK only, so a target env holding a DIFFERENT-uuid row with the same
>   `users.email` / `roles.name` must be detected across the ENTIRE archived set
>   and rejected id-faithfully (`backup_restore_invalid_artifact`) BEFORE any write
>   — a per-batch window could upsert an early batch and only later discover a
>   clash in a later batch, after the tx is already dirtied and (since the whole
>   restore is one outer tx) poisoned.
> - **Step 3 / 3a — `user_roles` reconcile + FK-missing-roleId guard.** The bounded
>   `delete(userRoles).where(inArray(userRoles.userId, archivedUserIds))` and the
>   pre-write check that every `userRoles.roleId` resolves to an archived-∪-existing
>   role require the COMPLETE archived `userIds` / `roleIds` sets in hand.
> - **Step 4 — global admin-lockout guard.** Must confirm ≥1 admin remains after
>   the full upsert; a partial (streamed) apply could transiently leave zero admins.
> **Boundedness / scope of the exception:** it applies to the users section ONLY —
> the 22 content `tables/*` and media members STILL stream + batch (05 §5.5 step 1,
> §5.4), never materialized. The users section is **opt-in** (`restoreUsers`) and
> **encrypted-only** (§3), so it is off the default restore path; and export still
> keyset-streams these members (§4.2), so only the restore side takes the
> exception. Password hashes in the materialized `UserRow[]` remain opaque + unread
> (§3). A future set-based-SQL reconciliation (temp-table load + JOIN) could remove
> even this materialization; that is out of scope for 04 and recorded as the single
> owner-scoped exception rather than left as a silent deviation.

```ts
// Called by 511-05's transactional restore body (the Backup v2 successor of
// restoreArtifactTx, backupService.ts:588), inside the ONE outer tx so users +
// content + settings are all-or-nothing. `sections` = validated NDJSON row
// arrays already parsed by normalize* above. Runs ONLY when opt-in + confirmed.
export async function restoreUsersSectionTx(
  tx: DbTransaction,
  section: { users: UserRow[]; roles: RoleRow[]; userRoles: UserRoleRow[] },
  opts: { restoreUsers: boolean; confirm: boolean }
): Promise<{ usersRestored: number; rolesRestored: number }> {
  if (!opts.restoreUsers) return { usersRestored: 0, rolesRestored: 0 };
  if (!opts.confirm) throw new Error("backup_restore_confirmation_required");

  // 0. Secondary-unique (natural-key) collision guard — fail-closed, PRE-WRITE.
  //    CHOSEN BEHAVIOUR (a): id-faithful reproduction. Besides the primary keys,
  //    schema.ts declares TWO more UNIQUE constraints on this section:
  //    `users.email` notNull().unique() (schema.ts:17) and `roles.name`
  //    notNull().unique() (schema.ts:30). (`email_hash` is NULLABLE and NOT unique.)
  //    The step-1/2 UPSERT is targeted only at the PK (roles.id / users.id): if the
  //    target env already holds a DIFFERENT-uuid row with the same email / role name
  //    — the parent's headline "move the identity graph between environments"
  //    scenario, e.g. an admin independently created in the destination — the
  //    PK-conflict does NOT fire, the row takes the INSERT branch, and Postgres
  //    raises 23505 unique_violation on `users.email` / `roles.name`. That code is
  //    NOT in the enumerated set, would surface as an unmapped raw 500, AND (because
  //    the whole restore runs in ONE outer tx, §4.3 preamble) it poisons the tx so
  //    no in-flight savepoint-catch is viable. We therefore DETECT it before any
  //    write and reject the archive as incompatible with this target — we do NOT
  //    silently reconcile on the natural key, because merging a destination row into
  //    an archived row could change that account's privileges / lockout state in a
  //    way the archive never stated (privilege-safety > convenience). PII-safe: the
  //    offending email / role name is NEVER placed in the thrown message or any log.
  const roleNames = section.roles.map((r) => r.name);
  if (roleNames.length) {
    const existingRoles = await tx.select({ id: roles.id, name: roles.name })
      .from(roles).where(inArray(roles.name, roleNames));
    const archivedRoleIdByName = new Map(section.roles.map((r) => [r.name, r.id]));
    // collision = existing row shares an archived name but has a DIFFERENT id
    if (existingRoles.some((r) => archivedRoleIdByName.get(r.name) !== r.id)) {
      throw new Error("backup_restore_invalid_artifact"); // roles.name natural-key clash
    }
  }
  const emails = section.users.map((u) => u.email);
  if (emails.length) {
    const existingUsers = await tx.select({ id: users.id, email: users.email })
      .from(users).where(inArray(users.email, emails));
    const archivedUserIdByEmail = new Map(section.users.map((u) => [u.email, u.id]));
    if (existingUsers.some((u) => archivedUserIdByEmail.get(u.email) !== u.id)) {
      throw new Error("backup_restore_invalid_artifact"); // users.email natural-key clash
    }
  }

  // 1. UPSERT roles by pk (insert-or-update) — NEVER delete-all (FK trap §1).
  //    Batched multi-row upsert: the set clause CANNOT use bare object shorthand
  //    ({ name, ... }) — those identifiers do not exist in scope and there is no
  //    single incoming row to reference. Drizzle's idiom for a multi-row
  //    onConflictDoUpdate is `excluded.<col>` (the Postgres pseudo-table holding
  //    the row that would have been inserted), expressed via sql`excluded.<col>`.
  //    createdAt is intentionally omitted so the original creation stamp is kept.
  for (const batch of chunk(section.roles, 500)) {
    await tx.insert(roles).values(batch)
      .onConflictDoUpdate({ target: roles.id,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          permissions: sql`excluded.permissions`,
          // createdAt intentionally NOT in set → original stamp preserved
        } });
  }
  // 2. UPSERT users by pk. passwordHash/email* written verbatim (opaque).
  //    Same batched-upsert rule: every updated column references excluded.*.
  for (const batch of chunk(section.users, 500)) {
    await tx.insert(users).values(batch)
      .onConflictDoUpdate({ target: users.id,
        set: {
          email: sql`excluded.email`,
          emailHash: sql`excluded."email_hash"`,
          emailEncrypted: sql`excluded."email_encrypted"`,
          passwordHash: sql`excluded."password_hash"`,
          name: sql`excluded.name`,
          status: sql`excluded.status`,
          updatedAt: sql`excluded."updated_at"`,
          // createdAt intentionally NOT in set → original stamp preserved
        } });
  }
  // 3. Reconcile user_roles ONLY for the archived users (bounded blast radius,
  //    faithful reproduction, no escalation of untouched accounts):
  const archivedUserIds = section.users.map((u) => u.id);
  const archivedUserIdsSet = new Set(archivedUserIds);
  if (archivedUserIds.length) {
    // 3a. FK-safety pre-write guard (mirrors step 0): every user_roles.roleId MUST
    //     resolve to a role that will exist after step 1 = archived role ids ∪ the
    //     roles already present in the target env. A user_roles row pointing at an
    //     unknown roleId would otherwise raise Postgres 23503 foreign_key_violation
    //     (NOT in the enumerated code set) and poison the single outer tx. Detect it
    //     BEFORE any insert and reject the artifact (reuse the already-mapped 422).
    const scopedUserRoles = section.userRoles.filter((ur) => archivedUserIdsSet.has(ur.userId));
    if (scopedUserRoles.length) {
      const allowedRoleIds = new Set(section.roles.map((r) => r.id));
      const missingRoleIds = [...new Set(
        scopedUserRoles.map((ur) => ur.roleId).filter((rid) => !allowedRoleIds.has(rid)),
      )];
      if (missingRoleIds.length) {
        // roleIds not in the archive — check whether the target env already holds them
        const existingRoleRows = await tx.select({ id: roles.id })
          .from(roles).where(inArray(roles.id, missingRoleIds));
        for (const row of existingRoleRows) allowedRoleIds.add(row.id);
      }
      if (scopedUserRoles.some((ur) => !allowedRoleIds.has(ur.roleId))) {
        throw new Error("backup_restore_invalid_artifact"); // FK-missing roleId, PII-free
      }
    }
    await tx.delete(userRoles).where(inArray(userRoles.userId, archivedUserIds));
    for (const batch of chunk(scopedUserRoles, 500)) {
      await tx.insert(userRoles).values(batch).onConflictDoNothing();
      // onConflictDoNothing: composite-pk safety; roleIds validated to exist (3a).
    }
  }
  // 4. Admin-lockout guard (same tx, before commit): >=1 user holds an admin role
  //    (any status, matching v1 lockout semantics), using getAdminRoleIds
  //    (hasFullAccess only; name "admin" alone does NOT count).
  const adminRoleIds = await getAdminRoleIds(undefined, tx);
  const admins = adminRoleIds.length
    ? await tx.select({ userId: userRoles.userId }).from(userRoles)
        .where(inArray(userRoles.roleId, adminRoleIds))
    : [];
  if (new Set(admins.map((r) => r.userId)).size === 0) {
    throw new Error("backup_users_restore_no_admin"); // -> tx rollback, fail-closed
  }
  return { usersRestored: section.users.length, rolesRestored: section.roles.length };
}
```

Error handling: every failure path throws a **machine-readable code** (no PII):
`backup_users_requires_encryption`, `backup_users_restore_no_admin`, plus the
inherited `backup_restore_invalid_artifact` (thrown by the normalizers on
unknown-key / missing-notNull / bad type) and `backup_restore_confirmation_required`.
Only **two** of these codes are NEW and owned by 04 — they are the only ones 04
adds to `mapBackupError` (`backupRoutes.ts:80`):
`backup_users_requires_encryption` → **400** (encrypted-only export gate) and
`backup_users_restore_no_admin` → **409** (a conflict with lockout safety). The
other two are **pre-existing** and reused **as-is** — 04 must NOT re-add them (a
duplicate `switch` case would break region ownership):
`backup_restore_invalid_artifact` is already mapped to **422**
(`backupRoutes.ts:94-99`) and `backup_restore_confirmation_required` to **400**
(`backupRoutes.ts:88-93`). FK-missing `roleId` in `user_roles` is caught by
validating each `userRoles.roleId` against the archived+existing role set before
insert, and it reuses the already-mapped `backup_restore_invalid_artifact` (no new
code needed).

**Secondary-unique (natural-key) collision — enumerated, reuses 422.** Beyond the
PK, the section carries two more UNIQUE constraints: `users.email`
(`schema.ts:17`, notNull unique) and `roles.name` (`schema.ts:30`, notNull unique)
(`email_hash` is nullable, NOT unique). Because the UPSERT is targeted at the PK
only (§4.3 steps 1–2), a target env that already holds a **different-uuid** row
with the same email / role name — the parent's cross-environment scenario — would
drive that row down the INSERT branch and raise **Postgres 23505
`unique_violation`**, which is (a) not in the enumerated code set → unmapped raw
500 and (b) tx-poisoning (whole restore is one outer tx). §4.3 **step 0** detects
this **before any write** and maps it to the already-mapped
`backup_restore_invalid_artifact` (**422**, `backupRoutes.ts:94-99`) with a
PII-free message — the offending email / role name is **never** placed in the
message or any log. This is the deliberate **id-faithful** choice (reject an
incompatible target) rather than natural-key reconciliation, so restore cannot
silently merge a destination account into an archived row and thereby alter its
privileges or lockout state. As defense-in-depth, if a 23505 nonetheless escapes
step 0 it is likewise normalized to `backup_restore_invalid_artifact` (never
re-thrown raw). No new error code is introduced by this case.

## 5. Testing Requirements

**Lane: Bun** (`bun test tests/unit/backups/backupUsersSection.test.ts`).
Rationale (MEMORY "Typecheck scope gotcha" / lane rules): this exercises
DB writes, tx rollback seams, streaming, and crypto-adjacent gating — all
runtime/Bun paths, not Bun-free pure logic. (The one genuinely pure helper,
`normalizeRolePermissions`, is covered inline in the same Bun file; no separate
Vitest file.) Also run root `tsc -p tsconfig.json --noEmit` after prop/signature
changes (MEMORY: `bun --cwd core lint:types` misses `tests/`).

Shared-DB safety (parent §Coordination — shared REMOTE render.com DB): NEVER
truncate `users`/`roles`/`user_roles`; use uniquely-scoped fixtures
(email = `bkp-511-04-<uuid>@example.test`, role name = `bkp-511-04-<uuid>`) and
delete ONLY the rows this test created, in a `finally`. Restore assertions run
inside a **deliberately rolled-back transaction** (reuse the parent's rollback
seam — `restoreUsersSectionTx(tx, …)` is exported precisely so a test can drive
it inside `db.transaction` and `throw` to roll back), so no destructive users
restore is ever committed over the shared DB.

**No-admin scenario isolation (chosen: delete-admin-holders-in-rolled-back-tx).**
The admin-lockout guard (§4.3 step 4) is **global** — it counts admin holders
across the entire `user_roles` table via `getAdminRoleIds(undefined, tx)`
(`rolesService.ts:72`) + a whole-table holder count — while the restore reconcile
is **bounded to `archivedUserIds`**. Because the shared REMOTE DB always holds the
real CMS admin, restoring only-non-admin fixture users leaves that admin's rows
intact and the guard never trips. Scenario 4 therefore first zeroes the admin set
**inside the rolled-back tx** —
`await tx.delete(userRoles).where(inArray(userRoles.roleId, await
getAdminRoleIds(undefined, tx)))` — before calling `restoreUsersSectionTx`, then
asserts the throw. The `throw` unwinds the transaction, so the admin-holder delete
is **never committed** and the shared identity tables are unchanged after the test
(no truncate, no committed mutation of `users`/`roles`/`user_roles`). This is the
one place a destructive statement is issued, and it is safe **only** because it
lives inside the same rolled-back seam that all restore assertions use.

Regression-test shapes (each a distinct real-flow scenario, per MEMORY "Smoke:
five scenarios per area"):

1. **Allowlist round-trip (required by contract-bar "every new validated key
   joins its allowlist + ships a round-trip test"):** `normalizeBackupInclude([...,
   "users"])` accepts `"users"`; `createBackupSchema.include.items.enum` contains
   `"users"` and `maxItems === 4`; a bogus option still throws
   `backup_include_invalid`.
2. **Encrypted-only export gate:** `assertUsersEncryptionAllowed(["users"],
   {enabled:false})` throws `backup_users_requires_encryption`; with
   `{enabled:true}` it passes; `["database"]` unencrypted is unaffected.
3. **Round-trip fidelity + opaque hash:** seed user (known argon2 hash) + role +
   assignment → `exportUsersSection` NDJSON → `normalize*` → `restoreUsersSectionTx`
   (rolled-back tx) → assert users/roles/user_roles rows match by pk, and
   `password_hash` is byte-identical (opaque, unmodified). Assert the produced
   NDJSON/manifest bytes contain the counts but the manifest contains **no**
   `password_hash` substring.
4. **No-admin fail-closed** (reachability caveat — see §5 "No-admin scenario
   isolation"): the guard in §4.3 step 4 is **global** — `getAdminRoleIds(undefined,
   tx)` (`rolesService.ts:72`) reads ALL roles and the admin-holder count selects
   from the WHOLE `user_roles` table (mirrors the private `countUsersWithRoles`,
   `rolesService.ts:80`), whereas the reconcile in step 3 is **bounded to
   `archivedUserIds`**. On the shared REMOTE DB the real CMS admin's `user_roles`
   rows are therefore left intact by a restore of only-non-admin fixture users, so
   the admin set stays non-empty and `backup_users_restore_no_admin` would **never**
   throw. To make the fail-closed path genuinely reachable **without committing any
   destructive change to the shared identity tables**, drive it inside the parent's
   rolled-back tx seam: within the `db.transaction` callback, first delete the
   admin-holder rows so zero admins remain in-tx —
   `await tx.delete(userRoles).where(inArray(userRoles.roleId, await
   getAdminRoleIds(undefined, tx)))` — then call `restoreUsersSectionTx(tx, section,
   {restoreUsers:true, confirm:true})` with an archive whose users hold only a
   non-admin role, and assert it throws `backup_users_restore_no_admin`. The thrown
   error (or an explicit `throw` after the assertion) rolls the tx back, so the
   admin-row delete **and** the upsert are both discarded and the shared DB's real
   admin is untouched after the test. (Alternative if the delete-in-tx seam proves
   awkward: `spyOn`/inject a scoped admin-count that returns 0 so no identity rows
   are touched at all — pick one and state it in §5.)
5. **No privilege escalation:** a role row with `permissions:["pages:write",
   "totally_forged_perm","*"?]` → after `normalizeRolePermissions` the forged
   token is dropped (and `"*"` collapses to `["*"]` only when literally present);
   a user NOT in the archive keeps its existing roles unchanged (reconcile is
   scoped to archived userIds).
6. **Opt-in / confirm gating:** `restoreUsers:false` ⇒ no-op zero-count return
   even when the section is present; `restoreUsers:true, confirm:false` ⇒
   `backup_restore_confirmation_required`.
7. **Reject-unknown:** a users row with an extra key, or a missing
   `password_hash`, throws `backup_restore_invalid_artifact` before any write.
8. **Secondary-unique (natural-key) collision fail-closed** (drive inside the
   rolled-back tx seam, §5 "No-admin scenario isolation" pattern — no committed
   mutation): (a) seed a fixture role with a scoped `name` (`bkp-511-04-<uuid>`)
   and a fixture user with a scoped `email` (`bkp-511-04-<uuid>@example.test`),
   both with their real target ids; (b) build an archive `section` whose role
   carries the SAME `name` but a DIFFERENT `id`, and whose user carries the SAME
   `email` but a DIFFERENT `id`; (c) call `restoreUsersSectionTx(tx, section,
   {restoreUsers:true, confirm:true})` and assert it throws
   `backup_restore_invalid_artifact` **before any write** (step 0), for both the
   role-name clash and (separately) the email clash. Assert the thrown message
   contains **neither** the email **nor** the role name (PII-free). Verify the
   happy path is unaffected: same email/name WITH the SAME id (a genuine
   round-trip re-import) passes step 0 and upserts normally.

## 6. Coordination note

- **Single stream, strictly sequential land order 01→02→03→04→05→06→07.** 04 must
  land only after 01/02/03 are merged (it consumes their engine + encryption
  context + section registry) and before 05 (which calls
  `restoreUsersSectionTx`).
- **Single-writer:** 04 exclusively authors `backupUsersSection.ts` +
  its test, and is the sole writer of the additive lines in `backupTypes.ts`
  (`backupIncludeOptions` — the `"users"` member only), `backupSchemas.ts`
  (`createBackupSchema` include enum + `maxItems`), and the **two** new users codes in
  `mapBackupError` (`backupRoutes.ts`) — `backup_users_requires_encryption` (400) and
  `backup_users_restore_no_admin` (409) — ONLY. It does **not** re-add
  `backup_restore_invalid_artifact` (422, already mapped `backupRoutes.ts:94-99`) or
  `backup_restore_confirmation_required` (400, already mapped `backupRoutes.ts:88-93`);
  those pre-exist and are reused as-is (re-adding them would duplicate a `switch` case
  outside 04's region). 04 exports `exportUsersSection` /
  `restoreUsersSectionTx`; the export-time **wiring** (injecting `exportUsersSection`
  as `packBackupArchive`'s `usersExporter`) is 06's create-path (01 §4.6a
  land-order-safe injection), not an edit to 01's module. No other subtask edits 04's
  declared lines.
- **Changelog:** do NOT create `_docs/_CHANGELOG/1229-*.md` or edit
  `_docs/_TASKS/*` here — only the closure subtask **TASK-511-07** writes the
  single `1229` changelog and flips statuses (parent §Coordination). `1229` is
  the **reserved** number for TASK-511: `1223` is claimed by TASK-480 in the
  merge target `feature/tasks`, and `1220-1228` are reserved by parallel streams
  (482-484 / 512-516). Do NOT "correct" `1229` down to the `1223` shown in this
  worktree's `_docs/_CHANGELOG/README.md` — that worktree README was branched
  before those numbers were consumed and is stale.
- **New env/config:** none introduced by 04 (encryption/passphrase policy is
  02's). If a "users disabled by policy" toggle is later wanted it is 06's UI/env.
- **Shared REMOTE test DB:** see §5 — fixture-scoped, rollback-seam restores,
  never truncate identity tables.
