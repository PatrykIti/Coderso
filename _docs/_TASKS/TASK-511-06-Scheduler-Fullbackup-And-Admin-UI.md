# TASK-511-06: Scheduler full-backup wiring + Admin UI (include options, passphrase, upload-to-import)

# FileName: TASK-511-06-Scheduler-Fullbackup-And-Admin-UI.md

**Priority:** High
**Category:** Backups / Data / Security / Admin
**Estimated Effort:** Large
**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Depends On:** TASK-511-01 (export engine + manifest + `packDatabaseArchive`), TASK-511-02 (compression + passphrase encryption / KDF contract + `encryptBackupArchive` / `normalizeBackupPassphrase` / `.cbk` naming constants), TASK-511-03 (media file streaming), TASK-511-04 (users + RBAC include), TASK-511-05 (import-file pipeline + route)
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** 2026-07-05

---

## Overview / Goal

Subtasks 01–05 build the Backup v2 engine (streaming NDJSON export, gzip + AES-256-GCM/scrypt
encryption, media-file streaming, opt-in users/RBAC include, and the upload→decrypt→validate→
batched transactional import pipeline + import route). This subtask is the **last functional
subtask** and does two things:

1. **Scheduler full-backup wiring (Bun lane).** Extend the singleton `backup_schedules` record and
   `runDueScheduledBackups` so automatic backups run as **full backups** — `database + settings +
   media(files)` by default, with an operator-controlled include set and the (opt-in, encrypted-only)
   `users`/RBAC matrix. Scheduled runs have no interactive user, so encryption uses a **backend-only
   passphrase resolved from a server-owned env var** (the 02 passphrase contract). Because **every v2
   `.cbk` is encrypted** (02 owns the format — there is no unencrypted archive variant, and 05's import
   always decrypts), a scheduled run needs the server passphrase for **any** include; if
   `BACKUP_ENCRYPTION_PASSPHRASE` is not configured, the run **fails closed** (no unencrypted archive is
   ever produced).

2. **Admin Backups UI (Vitest lane).** Extend the Create dialog with the full include-option
   checkboxes — including a **`users`/RBAC opt-in with a clear sensitivity warning** and a
   **passphrase input** — add a **new Import dialog** with an upload control + passphrase input that
   calls the 05 import route, and extend the schedule card so operators pick the scheduled include
   set. All UI reuses the existing admin cache/prefetch/SPA-router patterns and shared canonical
   helpers; **no set-state-in-effect**; layout stays faithful to `_docs/_PROTOTYPE/src/pages/tools/
   BackupsPage.tsx`.

The security posture from TASK-484 (fail-closed, confirm-gated restore, RBAC `backups:write`/`read`,
CSRF on writes, strict reject-unknown validation, backend-only secrets) is preserved and extended;
the passphrase and derived key material are **never logged, cached in browser storage, or returned to
clients**.

Grounded on the current code (all in `/home/coder/project/Coderso-task-511`):
`core/services/backups/backupService.ts` (`normalizeBackupInclude`, `createBackup`,
`getBackupSchedule`, `setBackupSchedule`, `mapSchedule`, `markScheduleRun`, `DEFAULT_INCLUDE`),
`core/services/backups/backupTypes.ts` (`backupIncludeOptions`, `BackupSchedule`,
`BackupScheduleUpdate`), `core/server/jobs/backupScheduler.ts` (`runDueScheduledBackups`),
`core/server/validation/backupSchemas.ts` (`scheduleUpdateSchema`, `createBackupSchema`),
`core/server/routes/backupRoutes.ts` (`PATCH /backups/schedule`, `POST /backups`),
`core/admin/services/backupsClient.ts`, `core/admin/ui/backups/{BackupsPage,BackupNowDialog,
BackupScheduleCard}.tsx`, `core/db/tables/operations.ts` (`backupSchedules` :82);
`core/db/tables/identity.ts` (`users`/`roles`/`userRoles` :23/:36/:44; both re-exported by
`core/db/schema.ts`).

---

## Owning modules (single-writer)

This subtask lands **last in the strictly sequential order 01→02→03→04→05→06→07**, so it is the sole
writer of every file it touches at land time. It **extends** files that 01–05 already reshaped
(their contracts must have landed first) and **creates** one new UI file.

**Backend (extend):**
- `core/db/tables/operations.ts` — add `include jsonb` column to `backupSchedules` (default full set).
- `core/db/migrations/0072_backup_schedule_include.sql` (**new**) + `core/db/migrations/meta/
  0072_snapshot.json` (**new**) + append entry `idx: 72` to `core/db/migrations/meta/_journal.json`.
  (Next free index — current last is `0071_seed_admin_role`, journal has 72 entries idx 0–71.)
  ⚠ **Re-verify the index against `feature/tasks` at 06's land time** — this is the SAME staleness the
  changelog pin (1281, below) exists for: this worktree was cut before parallel streams
  (480 / 482-484 / 512-516) landed, and migration indices are sequential integers merged into the
  same target with an identical collision surface. `0072` is next-free only relative to this
  pre-branch worktree; a parallel stream landing a migration first could claim `0072`. Do NOT
  hard-commit `idx: 72` blindly — at land time re-check the last migration on `feature/tasks`,
  renumber the SQL file if needed, and regenerate the snapshot + journal via the drizzle toolchain
  (do not hand-edit them).
- `core/services/backups/backupTypes.ts` — add `include: BackupIncludeOption[]` to `BackupSchedule`
  and optional `include` to `BackupScheduleUpdate`; **add `passphrase?: string` to
  `BackupCreateInput`** (create-path; `backupTypes.ts:24` has no `passphrase` today — 02 provides only
  `normalizeBackupPassphrase`, it does **not** edit `backupTypes.ts`). (`backupIncludeOptions` already
  gained `"users"` in 04.)
- `core/services/backups/backupService.ts` — `getBackupSchedule` seed default include; `mapSchedule`
  map the new column; `setBackupSchedule` normalize + persist `include` (reuse
  `normalizeBackupInclude`). **Create-path rewiring (06 owns; 01 §Scope defers "06 wires the engine
  into `createBackupArtifact`"):** replace the v1 in-memory `JSON.stringify` artifact build with the
  streaming engine — `packBackupArchive` (01 §4.6a full orchestrator: DB + media + users + settings
  members, NOT the DB-only `packDatabaseArchive`) → `encryptBackupArchive(stream, passphrase)` (02)
  when a passphrase is present → write `coderso-backup-<id>.cbk`. 06 (landing last) injects the
  section exporters into `packBackupArchive` — `mediaExporter: streamMediaIntoArchive` (03) and
  `usersExporter: exportUsersSection` (04) — so 01 never hard-imports them (01 §4.6a land-order-safe
  injection). Thread `input.passphrase` into
  `createBackup`/`createBackupArtifact` via `normalizeBackupPassphrase` (02); call **04's named
  fail-closed guard `assertUsersEncryptionAllowed(include, { enabled: input.passphrase != null })`** in
  `createBackup` **inside the try/catch** (after the `running` row is inserted, before any user/role
  read or `packBackupArchive`) (04 §4.2 — 06 is its sole named call-site) — run BEFORE the mandatory
  `normalizeBackupPassphrase` so the users-specific code wins, and so a guard throw self-marks the row
  `failed` (via `markBackupFailed`) rather than throwing recordlessly. Full function
  shape/data-flow/error-handling in **§A0**. Passphrase is never
  logged nor added to `backups.create` audit metadata.
  **Binary `.cbk` coupling — 06 owns every backupService.ts function the artifact-format flip
  touches (sole writer at land time), not just the constants (see §A0-persist):**
  - `resolveBackupArtifactPath` (`backupService.ts:80`) — swap the `.json` literals for 02's
    `backupArchiveFileName` (`.cbk`).
  - `writeStreamToFile(stream, filePath): Promise<number>` (**new 06-owned private helper in
    `backupService.ts`**) — the local binary sink: pipe the encrypted archive `ReadableStream` to
    `filePath` (e.g. `Bun.write(filePath, stream)` or a `Writable` pipe) without buffering the whole
    archive, returning the byte count for `markBackupComplete`. Replaces the v1
    `writeFile(..., 'utf8')` (`backupService.ts:433`). This is 06's helper (01 owns the archive
    stream producer; 06 owns the create-path persistence sink) — attributed here so it is not an
    unowned symbol.
  - `uploadBackupArtifact` (`backupService.ts:382`) — the remote (s3/azure) path must upload a
    **binary stream** named `.cbk` (`backupArchiveFileName`) with `type:
    BACKUP_ARCHIVE_CONTENT_TYPE` (`application/octet-stream`), NOT a utf8 string named `.json`
    (`BACKUP_ARTIFACT_CONTENT_TYPE = application/json`) — otherwise remote backups upload a corrupt
    `.json`-named object.
  - `resolveBackupDownload` (`backupService.ts:769`) — for a v2 `.cbk` read the local artifact as
    **bytes** (`readFile(path)` without `'utf8'`, `backupService.ts:782`) and return them
    **base64-encoded** in `content` with `contentType: BACKUP_ARCHIVE_CONTENT_TYPE`
    (`application/octet-stream`) plus a new `encoding: "base64"` marker. **Why base64, not raw bytes
    (the HIGH transport fix):** the `/backups/:id/download` handler (`backupRoutes.ts:189`) returns the
    resolver result straight to the **JSON** serializer, and **JSON cannot carry raw bytes** — a
    `Uint8Array` serializes to a `{"0":..,"1":..}` object and corrupts the archive, breaking the
    download→Import restore path. base64 is JSON-safe and round-trips byte-exact. Legacy v1 `.json`
    artifacts keep the existing utf8 `content` string with **no** `encoding` marker (v1 download
    unchanged).
  - `BackupDownload.content` (`backupTypes.ts:68`) **stays `string`** (base64 for `.cbk`, utf8 for
    legacy `.json`) and gains a new optional `encoding?: "base64"` field. It is deliberately **not**
    widened to `string | Uint8Array`: that both breaks the JSON route (above) and would force a
    tsc-breaking widening of `readBackupArtifactContent`'s `Promise<string>` return
    (`backupService.ts:726-728`, `return dl.content`). base64-as-string avoids both — so
    `readBackupArtifactContent` (v1-only; v2 fails fast in `restoreBackup`, see below) keeps returning
    a `string` unchanged and needs no type guard.
  - **Client download surfaces — 06-owned (the HIGH client half; not owned by any earlier subtask).**
    `core/admin/services/backupsClient.ts` `BackupDownload` (`backupsClient.ts:78-84`) mirrors the
    `encoding?: "base64"` field (`content` stays `string`). `core/admin/ui/backups/BackupsPage.tsx`
    `downloadBackupContent` (`BackupsPage.tsx:54-71`) — today `new Blob([payload.content])`
    (`BackupsPage.tsx:61`) would Blob the raw base64 *text* (still corrupt) — must, when
    `payload.encoding === "base64"`, base64-decode `content` into a `Uint8Array`
    (`Uint8Array.from(atob(content), (c) => c.charCodeAt(0))`) and
    `new Blob([bytes], { type: payload.contentType })`; otherwise keep the existing utf8-string path
    for v1. These two frontend files are already 06-owned (Frontend extend list below); this bullet
    pins the download-surface edits so the v2 `.cbk` download is byte-exact and re-importable.
  - **Restore-from-stored supersession (fail-fast, not cryptic):** 06 does **not** teach the v1
    `restoreBackup(id)` / `readBackupArtifactContent` / `parseBackupArtifact` path to decrypt `.cbk`
    (no stored passphrase — parent §decision 3); v2 restore is the **download → Import dialog (05)
    re-upload** flow. But 06 must NOT leave the one-click Restore of a v2 row silently broken (today it
    would reach `parseBackupArtifact`, which hard-requires `version === 1`, and fail with a cryptic
    parse/`backup_restore_invalid_artifact` error). So **06 adds a fail-fast guard at the TOP of
    `restoreBackup(id)`** (`backupService.ts` — already in 06's artifact-format region alongside
    `resolveBackupArtifactPath`/`resolveBackupDownload`): if the stored artifact is a v2 `.cbk`
    (artifact path/filename ends in `BACKUP_ARCHIVE_EXTENSION` — 02, or content-type
    `BACKUP_ARCHIVE_CONTENT_TYPE`), throw a clear coded error **`backup_restore_superseded`** BEFORE
    reading/parsing any bytes. 06 owns the single `case backup_restore_superseded → 422` in
    `mapBackupError` (its own distinct region — 04/05 own other codes; 06 lands last). 06 leaves the v1
    parse body intact for legacy v1 `.json` rows. **UI:** `BackupsPage.handleRestore` maps
    `backup_restore_superseded` to a guided toast — "This is a Backup v2 archive. Download it, then use
    Import (with its passphrase) to restore." — and the one-click Restore control routes v2 rows to the
    Import dialog rather than calling restore-by-id. 07 documents the supersession + the new code.
- `core/server/validation/backupSchemas.ts` — add `include` to `scheduleUpdateSchema`; **add the
  `passphrase` property to `createBackupSchema`** (`additionalProperties: false` preserved; a
  round-trip / reject-unknown test). (02 explicitly leaves `backupSchemas.ts` untouched — 02 §"Not
  touched by 02"; the create-schema `passphrase` key is 06's, the import-schema `passphrase` key is
  05's.)
- `core/server/routes/backupRoutes.ts` — **06 owns the `POST /backups` handler region:** add
  `passphrase?: string` to `CreateBackupBody` (lines 53–56) and change the handler
  (`backupRoutes.ts:156`) from `createBackup({ kind, include })` to
  `createBackup({ kind, include, passphrase: body.passphrase })`. The passphrase is NEVER logged nor
  placed in the `backups.create` audit metadata (which stays `{ kind, include }`). 06 also adds the
  single `case backup_restore_superseded → 422` to `mapBackupError` (for the v2 restore-by-id guard;
  see the §A0 restore-from-stored callout). (Distinct regions from 05's `POST /backups/import` route +
  `mapBackupError` import codes and 04's users codes; sequential land — 04/05 merge before 06 — keeps
  region-level single-writer intact.)
- `core/server/jobs/backupScheduler.ts` — pass `include: schedule.include` + the resolved backend
  passphrase to `createBackup`; add `resolveScheduledPassphrase()`; fail-closed guard for
  encrypted-only includes.

**Frontend (extend):**
- `core/admin/services/backupsClient.ts` — extend `BackupIncludeOption`, `BackupCreatePayload`,
  `BackupScheduleUpdate`, `BackupSchedule`; add `encoding?: "base64"` to `BackupDownload`
  (`backupsClient.ts:78-84`, `content` stays `string`); add
  `importBackup(file, passphrase, { restoreUsers })` calling the 05 route (forwarding the opt-in
  `restoreUsers` multipart string, default off); keep cache/prefetch parity.
- `core/admin/ui/backups/BackupNowDialog.tsx` — add `users` checkbox + sensitivity warning +
  passphrase input.
- `core/admin/ui/backups/BackupScheduleCard.tsx` — add scheduled include-option checkboxes (+ users
  warning); include them in the `onSave` payload.
- `core/admin/ui/backups/BackupsPage.tsx` — mount the Import dialog + wire an import handler; teach
  `downloadBackupContent` (`BackupsPage.tsx:54-71`) to base64-decode a v2 `.cbk` download
  (`encoding === "base64"`) into a `Uint8Array` before `new Blob` (see §A0-persist download bullet).

**Frontend (create):**
- `core/admin/ui/backups/ImportBackupDialog.tsx` (**new**) — upload-to-import control + passphrase
  input + confirm.

**NOT owned here (do not edit):** the export engine internals (01), crypto module (02), media
streaming (03), users include (04), and the **import** service + route + schema
(`POST /backups/import`, `importBackupSchema`, `importBackupFromUpload`, the import `mapBackupError`
codes — all **05**). This subtask **consumes** those exports: the 05 route from the browser client,
`packBackupArchive` (01 §4.6a full orchestrator) + `encryptBackupArchive`/`normalizeBackupPassphrase`/
`.cbk` constants (02) from the create-path + scheduler.

> **Manual-create passphrase server wiring — OWNED BY 06 (the create-path owner).**
> The manual encrypted-backup path is end-to-end and 06 owns every piece except the crypto primitive:
> 06 adds the passphrase **input** in the Create dialog (§G), the **client** payload
> (`backupsClient.createBackup` JSON-stringifies `passphrase` into `POST /backups`, §F), the
> **`createBackupSchema.passphrase`** property (`backupSchemas.ts`), **`BackupCreateInput.passphrase`**
> (`backupTypes.ts`), **`CreateBackupBody.passphrase`** + the `POST /backups` handler forwarding
> (`backupRoutes.ts:156` → `createBackup({ kind, include, passphrase: body.passphrase })`), and the
> **`createBackupArtifact` rewiring** that actually `encryptBackupArchive`s with it. 02 provides only
> `normalizeBackupPassphrase` + the crypto/naming constants — 02 explicitly does **not** edit
> `backupSchemas.ts` / `backupTypes.ts` / `backupRoutes.ts` (02 §"Not touched by 02"), so those edits
> are 06's. 06 also ships the **Bun route test** (`tests/integration/routes/backups.test.ts`)
> asserting the request-body `passphrase` reaches `createBackup` (service spy/seam), triggers
> encryption, and never appears in any log/audit metadata. This is a distinct file **region** from
> 05's import route; the strictly-sequential land order (05 before 06) keeps region-level single-writer
> intact. Without this the manual encrypted-backup flow would silently no-op — hence 06, which owns the
> whole create surface, owns the wiring end-to-end.

---

## Security Contract (route-touching: `PATCH /backups/schedule` extension + scheduler + import client)

- **Routes stay internal + RBAC-gated.** `PATCH /backups/schedule` remains `requirePermission
  ("backups:write")`, CSRF-enforced (client sends `withCsrf: true` via `updateBackupSchedule`).
  The new `include` field is validated by the extended `scheduleUpdateSchema`
  (`additionalProperties: false`, enum-restricted items, `uniqueItems`, `minItems: 1`) — so an unknown
  key or an out-of-enum include is rejected 400 **before** any write. `POST /backups/import`
  (RBAC `backups:write`, CSRF, size ceiling, decrypt-before-write) is owned/validated by **05**;
  this subtask only calls it.
- **Passphrase never leaks.** The create/import passphrase travels in the request body over the
  authenticated admin API and is **never** persisted to a `backups` row, `backup_schedules` row,
  audit metadata, browser storage/cache, or any log. The `POST /backups` handler that forwards
  `body.passphrase` into the service is **owned + test-covered by 06** (the create-path owner; see the
  *Owning modules* note), using 02's `normalizeBackupPassphrase`. The `backups.create` audit metadata
  stays `{ kind, include }` — the passphrase value never enters it. The scheduler passphrase is read
  from a
  **server-owned env var only** (`process.env.BACKUP_ENCRYPTION_PASSPHRASE`, the 02 contract) — never
  from a request, never returned by any route. `sanitizeBackupError` already strips `cwd`/backup-dir;
  no new code path logs raw passphrases or KDF material.
- **`users`/RBAC include is fail-closed opt-in — enforced server-side in the create-path, not just
  the UI.** The UI defaults `users` **off** and disables submit until a passphrase is entered (§G
  `canSubmit` — a passphrase is required for **every** backup since all v2 archives are encrypted),
  but the authoritative guard is **backend**: `createBackup` (§A0) calls **04's named
  `assertUsersEncryptionAllowed(include, { enabled: input.passphrase != null })`** inside the create
  try/catch (after the `running` row insert), **before** the mandatory `normalizeBackupPassphrase` and
  **before any user/role row is read or `packBackupArchive` runs** (04 §4.2, single named call-site) —
  so a guard throw self-marks the row `failed` rather than propagating. A request that **bypasses the
  UI** — `POST /backups` with
  `include:[...,"users"]` and **no** `passphrase` — therefore throws `backup_users_requires_encryption`,
  which `createBackup`'s `try/catch` turns into `markBackupFailed(sanitizeBackupError)`: the `backups`
  row is `failed` with the sanitized `backup_users_requires_encryption` code (mapped 400 by 04 in
  `mapBackupError`), and **no unencrypted user export is ever produced**. The **scheduler** path
  flows through the same `createBackup` guard (it refuses a `users`-including run when no server
  passphrase is configured — §D), so both the manual and unattended paths share one enforcement
  point. Password hashes (`users.passwordHash`) are handled only inside the encrypted archive by 04 —
  this subtask never surfaces them.
- **Audit unchanged in shape.** `PATCH /backups/schedule` continues to `logAudit({ action:
  "backups.schedule.update", metadata: { keys: Object.keys(payload) } })` — metadata is key names
  only (never values), so an `include`/passphrase value never reaches the audit log. Scheduled create
  logs `logAudit({ actorId: null, action: "backups.create", metadata: { kind: "scheduled", source:
  "scheduler", result } })` where `result` is the **non-sensitive run status** `"succeeded"` /
  `"failed"` (matching §D and Bun Test 1 — the fail-closed path sets `result: "failed"`). The metadata
  carries only these fixed non-sensitive keys — never the passphrase, never the `include` values.
- **No privilege escalation via UI.** The include-option checkboxes only choose *what* is captured;
  they never alter RBAC. Import restore stays confirm-gated + transactional (05).

---

## Implementation Pseudocode

### A0. Create-path rewiring (backend) — `createBackup` / `createBackupArtifact` (**the load-bearing 06 change**)

The single most important 06 edit: replace the v1 **in-memory `JSON.stringify` `.json` artifact**
(`backupService.ts:405` `createBackupArtifact`, `backupService.ts:426`
`JSON.stringify(artifact,null,2)`, `backupService.ts:433` `writeFile(...,'utf8')` /
`backupService.ts:440` `uploadBackupArtifact`) with the **streaming compressed encrypted `.cbk`**
engine. `createBackup` (`backupService.ts:464`) currently calls
`createBackupArtifact(backup, include)` with **no** passphrase — 06 threads `input.passphrase`
through and injects 03/04's section exporters (so 01 never hard-imports them — 01 §4.6a
land-order-safe injection).

```ts
// backupService.ts — imports 06 adds (top of module; 01/02/03/04 have all landed by 06):
//   import { packBackupArchive } from "./backupArchive";              // 01 §4.6a full orchestrator
//   import { encryptBackupArchive } from "./backupCrypto";            // 02
//   import { normalizeBackupPassphrase } from "./backupCrypto";       // 02
//   import { BACKUP_ARCHIVE_EXTENSION, BACKUP_ARCHIVE_CONTENT_TYPE,   // 02 naming constants
//            backupArchiveFileName } from "./backupCrypto";
//   import { streamMediaIntoArchive } from "./mediaArchive";          // 03 mediaExporter
//   import { exportUsersSection, assertUsersEncryptionAllowed } from "./backupUsersSection"; // 04

export async function createBackup(input: BackupCreateInput = {}): Promise<BackupRecord> {
  const storageSettings = await getStorageSettings();
  const kind = input.kind === "scheduled" ? "scheduled" : "manual";
  const include = normalizeBackupInclude(input.include);

  // Insert the `running` row FIRST (mirrors the current v1 shape at backupService.ts:470-471), so
  // EVERY downstream throw — including the two fail-closed guards below — is caught by the try/catch
  // and self-marked `failed` via markBackupFailed. createBackup MUST NOT throw to its caller for a
  // guard failure: the scheduler (§D) and the route/service tests (Bun Test 1 + Bun Test 3
  // "mandatory-encryption / manual users fail-closed") and the Security Contract
  // ("markBackupFailed(sanitizeBackupError): the backups row is failed with the sanitized
  // backup_users_requires_encryption code") all require a PERSISTED `failed` row with the coded
  // error — not a throw with no row. The guards therefore live INSIDE the try (below); they still
  // run BEFORE any user/role read or packBackupArchive, so no unencrypted export is ever produced —
  // the run is simply marked failed instead of throwing recordlessly.
  const [row] = await db.insert(backups)
    .values({ status: "running", kind, storageDriver: storageSettings.driver })
    .returning();
  if (!row) throw new Error("backup_create_failed");
  const backup = mapBackup(row);

  try {
    // FAIL-CLOSED, PRE-READ (runs before any user/role row is read and before packBackupArchive):
    // users export is encrypted-only. 04's single named guard (04 §4.2) — its SOLE call-site lives
    // here (04 mandates 06 reference it BY NAME). Run it FIRST (before the general passphrase
    // requirement) so a `users`-including request with no passphrase yields the SPECIFIC
    // `backup_users_requires_encryption` rather than the generic passphrase code. A throw here is
    // CAUGHT below → markBackupFailed (persisted `failed` row), never propagated. Covers BOTH the
    // manual POST /backups path and the scheduled path (both flow through createBackup).
    assertUsersEncryptionAllowed(include, {
      enabled: input.passphrase != null && String(input.passphrase).length > 0,
    });
    // 02: EVERY v2 `.cbk` is ALWAYS encrypted — there is NO unencrypted archive variant. 02 owns the
    // `.cbk` format and its header/frame layout is intrinsically AES-256-GCM, and 05's import ALWAYS
    // decrypts (it cannot read a plaintext tar). So a passphrase is MANDATORY for every backup.
    // normalizeBackupPassphrase throws `backup_passphrase_required` when missing /
    // `backup_passphrase_invalid` on policy; the catch below turns any throw into
    // markBackupFailed(sanitizeBackupError). Never logged.
    const passphrase = normalizeBackupPassphrase(input.passphrase); // string (never null)

    const artifact = await createBackupArtifact(backup, include, passphrase);
    return markBackupComplete(backup.id, artifact.artifactPath, artifact.artifactKey, artifact.sizeBytes);
  } catch (error) {
    // sanitizeBackupError strips cwd/backup-dir AND never surfaces the passphrase/KDF material;
    // an unencrypted-users attempt lands here as `backup_users_requires_encryption`, a
    // passphrase-less attempt as `backup_passphrase_required`.
    return markBackupFailed(backup.id, sanitizeBackupError(error));
  }
}

// New signature: threads the normalized passphrase; produces a `.cbk` (never `.json`).
const createBackupArtifact = async (
  backup: BackupRecord,
  include: BackupIncludeOption[],
  passphrase: string, // never null — createBackup enforces mandatory encryption above
) => {
  // 01 §4.6a full orchestrator (DB + settings + media + users members), NOT the DB-only
  // packDatabaseArchive. 06 (landing last) INJECTS the section exporters so 01 stays
  // hard-import-free — a media-only closure and the users exporter passed as opts.
  // 01 returns `{ stream, manifest, cleanup }` and MANDATES the lifecycle (01 §4.5/§4.6a
  // lines 444-470, 662-663): the caller MUST fully consume/pipe `stream` and only THEN
  // `await cleanup()` — ALWAYS in a `finally`. `cleanup` removes the per-run temp spool dir
  // (`coderso-backup-<uuid>` under os.tmpdir/BACKUP_TMP_DIR). 02's encryptBackupArchive only
  // receives the byte stream and canNOT run cleanup — so 06 (the sole create-path composition
  // point) owns running it. Dropping `cleanup` here would LEAK a spool dir on every manual and
  // scheduled backup (daily runs accumulate them), contradicting TASK-511's no-OOM/scalability goal.
  const { stream, cleanup } = await packBackupArchive({
    include,
    mediaExporter: streamMediaIntoArchive, // 03 — invoked only when include.includes("media")
    usersExporter: exportUsersSection,     // 04 — invoked only when include.includes("users")
  });

  try {
    // 02: packBackupArchive (01) emits a PLAINTEXT `.tar` byte stream — 01 does NO compression and NO
    // encryption (01 §Scope "No compression, no encryption — 02 wraps the tar byte stream"). Streaming
    // gzip happens INSIDE encryptBackupArchive (02: `.cbk = AES-256-GCM(gzip(tar(...)))`, 02 §encrypt
    // `source.pipeThrough(new CompressionStream("gzip"))` then framed AES-256-GCM). So this single 02
    // call both gzips AND encrypts the 01 tar stream. EVERY v2 archive is encrypted — there is NO
    // unencrypted `.cbk` variant (02's format is intrinsically AEAD; 05's import always decrypts).
    // `passphrase` is guaranteed non-null by createBackup's mandatory normalizeBackupPassphrase above.
    const archiveStream = encryptBackupArchive(stream, passphrase);

    const fileName = backupArchiveFileName(backup.id); // 02: `coderso-backup-<id>.cbk`
    if (backup.storageDriver === "local") {
      const { baseDir, filePath } = resolveBackupArtifactPath(backup.id); // now .cbk (see §A0-persist)
      await mkdir(baseDir, { recursive: true });
      const sizeBytes = await writeStreamToFile(archiveStream, filePath); // BINARY sink, byte count
      return { artifactPath: filePath, artifactKey: null as string | null, sizeBytes };
    }
    return await uploadBackupArtifact(backup.id, archiveStream, fileName); // remote .cbk (see §A0-persist)
  } finally {
    // ALWAYS remove the temp spool dir — after the stream fully drains (both return branches) AND on
    // any encrypt/write/upload throw (the throw funnels up to createBackup's try/catch →
    // markBackupFailed, but the spool must still be reclaimed here). cleanup() is idempotent (01 §7.7).
    await cleanup();
  }
};
```

> **Note the `await` on the remote branch return.** `return await uploadBackupArtifact(...)` (not a
> bare `return uploadBackupArtifact(...)`) is required so the `finally` runs the spool `cleanup()`
> **after** the remote upload has drained the archive stream — a bare `return` of the promise would
> run `cleanup()` before the upload finished consuming `stream`, deleting the spool mid-upload. The
> local branch already `await`s `writeStreamToFile` before returning.

**Data flow:** `include` → insert `running` row → **(inside try/catch)** `assertUsersEncryptionAllowed`
(fail-closed) → `normalizeBackupPassphrase` (fail-closed `backup_passphrase_required` when absent) →
`packBackupArchive` streams **plaintext** NDJSON/tar (no gzip in 01) → **always**
`encryptBackupArchive` (02 gzips **then** AES-256-GCM-wraps that tar stream) → binary sink
(local file write / remote adapter upload) →
`markBackupComplete` (or `markBackupFailed(sanitizeBackupError)` on any throw). **On the LOCAL driver
the whole archive is never buffered in memory** — it streams from `packBackupArchive` straight to the
file via `writeStreamToFile`. The **remote (s3/azure)** branch buffers the archive into one
ArrayBuffer because the artifact path inherits v1's `adapter.put(UploadFile)` (`arrayBuffer()`-only).
**Note:** 03 adds a streaming keyed write `putAt` to the same adapter, so remote streaming IS possible
in principle — 06 buffers only because `putAt` needs a known `ContentLength` (the `.cbk` size isn't
known until the stream finishes) and mints no key. Per **Open Question 4 — RESOLVED** this is a
**decided, shipped constraint (not an open owner choice)**: the remote branch keeps v1 buffering and
the parent no-container-OOM guarantee is **formally SCOPED TO THE LOCAL DRIVER** (`writeStreamToFile`);
streaming remote via spool-to-temp + `putAt` is a recorded **03/06 follow-up**, out of scope for this
land. This is a documented limitation, not a silent claim — 07 documents no-OOM as **local-only** and
does NOT claim remote (s3/azure) streaming (07 §"Streaming / no-OOM scope", lines 105-113, already
carries this scoping).
**Error handling:** all failures (guard throw, pack/encrypt error, adapter error) funnel through
the single `try/catch` → `markBackupFailed`; the passphrase never enters a log, the `backups` row,
or the audit metadata. **Resource hygiene:** `createBackupArtifact` wraps encrypt+persist in a
`try { … } finally { await cleanup(); }` so the per-run temp spool dir (01's `PackedArchive.cleanup`,
`coderso-backup-<uuid>` under os.tmpdir/BACKUP_TMP_DIR) is reclaimed on **both** the success and the
throw path (idempotent per 01 §7.7) — no spool leak accrues across manual or scheduled runs. Bun Test 6
asserts the spool dir is gone after a create completes AND after a create that fails.

**§A0-persist — binary write + remote upload + download (same file, 06-owned; see *Owning modules*).**
The v1 helpers are hard-coded to `.json`/utf8 strings and must flip to binary `.cbk`:

```ts
// resolveBackupArtifactPath — swap the .json literals (backupService.ts:84-85) for 02's naming:
const resolveBackupArtifactPath = (id: string) => {
  const baseDir = getBackupStorageDir();
  const fileName = backupArchiveFileName(id); // `coderso-backup-<id>.cbk`
  return { baseDir, filePath: path.join(baseDir, fileName), fileName };
};

// uploadBackupArtifact — accept a BINARY stream (not a utf8 string), name it .cbk, octet-stream:
const uploadBackupArtifact = async (id: string, archiveStream: ReadableStream, fileName: string) => {
  // Build an UploadFile whose arrayBuffer() drains the archive stream, then adapter.put(file) with
  //   type: BACKUP_ARCHIVE_CONTENT_TYPE (application/octet-stream), name: fileName (.cbk).
  // Same adapter.put + `backup_upload_failed` swallow-and-log-server-side posture as today.
};
// ⚠ REMOTE (s3/azure) BUFFERING — SCOPED CONSTRAINT, RESOLVED (Open Question 4; verified against real
// source AND against the 03 contract landed before 06):
// `MediaStorageAdapter.put(file: UploadFile)` (core/services/media/storage/adapter.ts:14) accepts
// ONLY an `UploadFile` whose sole body accessor is `arrayBuffer(): Promise<ArrayBuffer>`
// (adapter.ts:5) — the artifact-upload path 06 inherits from v1 buffers because of this.
// HOWEVER — correction: 03 DOES add a streaming keyed write to this same interface:
// `putAt(key, body: AsyncIterable<Uint8Array>, size: number, contentType)` (03 §4.1), implemented
// per driver as a real stream (local `pipeline`, s3 `Readable.from(body)` + `ContentLength`, azure
// `uploadStream`) that never buffers the whole payload. So it is NOT true that "there is no streaming
// put" — there is (`putAt`). 06 still buffers the remote artifact for two concrete reasons, NOT
// because no streaming write exists:
//   1) `putAt` REQUIRES a known byte `size` upfront (s3 passes it as `ContentLength`), but the
//      encrypted `.cbk` stream's final size is only known AFTER packBackupArchive→gzip→GCM-framing
//      completes — 06 does not have it before the upload starts. (writeStreamToFile discovers the
//      local byte count by draining; a remote streaming putAt cannot pre-declare ContentLength.)
//   2) `putAt` writes at a CALLER-CHOSEN key and intentionally skips `buildKey()` (03 §4.1), whereas
//      the artifact path today relies on `put()` MINTING the `artifactKey` returned to
//      markBackupComplete — using putAt means 06 must generate + own the artifact key itself.
// `adapter.ts` is owned by the media module / 03 (NOT 06 — not in *Owning modules*), so 06 cannot
// re-shape putAt's signature here. RESOLVED (Open Question 4 — no longer an open owner choice, so it
// does not block land): 06 SHIPS option (b) — keep the v1 arrayBuffer buffering for the REMOTE
// artifact (matching v1's existing whole-JSON-string buffering via adapter.put(UploadFile)), with the
// parent no-container-OOM guarantee FORMALLY SCOPED TO THE LOCAL DRIVER (writeStreamToFile streams to
// disk; the remote branch buffers). Option (a) — 06 mints an artifact key and streams via 03's `putAt`
// (spool-to-temp to learn the ContentLength, or a follow-up size-optional/multipart putAt in 03) — is a
// recorded 03/06 FOLLOW-UP, out of scope for this land. 07 documents no-OOM as LOCAL-ONLY and MUST NOT
// claim remote streaming (07 §"Streaming / no-OOM scope", lines 105-113 — already carries this). The
// prior wording ("there is NO streaming put") was inaccurate given 03's putAt and is corrected here.

// resolveBackupDownload (backupService.ts:769) — read a v2 .cbk as BYTES then base64-encode for the
// JSON route (raw bytes cannot survive JSON.serialize — see §Owning modules download bullet):
//   const bytes = await readFile(artifactPath);              // NO 'utf8' -> Buffer/Uint8Array
//   return { url:null, path:null, fileName: path.basename(artifactPath),
//            contentType: BACKUP_ARCHIVE_CONTENT_TYPE,
//            content: bytes.toString("base64"), encoding: "base64" };
// BackupDownload.content (backupTypes.ts:68) STAYS `string` (base64 for .cbk, utf8 for legacy .json)
// + gains `encoding?: "base64"`. NOT widened to `string | Uint8Array` — that breaks the JSON route
// AND would force a tsc-breaking widening of readBackupArtifactContent's Promise<string> return.
// The /backups/:id/download route serializes the base64 string as-is; the client (BackupsPage
// downloadBackupContent) base64-decodes it to bytes before new Blob (§Owning modules client bullet).
// NOTE: this download path reads the whole stored artifact (bounded by artifact size — identical to
// v1's readFile). It is the convenience "download to browser" path, NOT the streaming export/import
// path; the parent no-OOM streaming guarantee applies to packBackupArchive/import, not this fetch.
// readBackupArtifactContent (backupService.ts:726) is v1-ONLY (v2 fails fast in restoreBackup) and
// keeps returning `string` unchanged (dl.content is a utf8 string for v1 .json) — no widening, no guard.
```

> **Restore-from-stored (`restoreBackup(id)`) vs the v2 `.cbk` download.** Today
> `readBackupArtifactContent` (`backupService.ts:726`, `res.text()`) + `parseBackupArtifact`
> (`backupService.ts:686`) drive the TASK-484 restore-from-stored path, which only understands the
> v1 utf8 JSON artifact and **cannot decrypt a `.cbk`** (no stored passphrase — parent §decision 3
> keeps the passphrase client/env-only). For v2 archives the restore path is the **download → Import
> dialog (05) re-upload** flow (operator supplies the passphrase): 06 serves the raw `.cbk` bytes
> (above) and the Import dialog (§H) decrypts+restores via 05's pipeline. 06 leaves the v1
> `restoreBackup(id)`/`parseBackupArtifact` body intact for pre-existing v1 rows but does **not**
> extend it to `.cbk`. To keep the one-click Restore of a v2 row from failing cryptically (it would
> otherwise reach `parseBackupArtifact`, which hard-requires `version === 1`), **06 adds a fail-fast
> guard at the TOP of `restoreBackup(id)`**: if the stored artifact is a v2 `.cbk` (path/filename ends
> in `BACKUP_ARCHIVE_EXTENSION` or content-type `BACKUP_ARCHIVE_CONTENT_TYPE`), throw
> `backup_restore_superseded` (06's own `mapBackupError` case → **422**) **before** reading/parsing
> any bytes. The UI (`BackupsPage.handleRestore`) maps that code to a guided toast ("This is a Backup
> v2 archive — Download it, then use Import with its passphrase to restore.") and routes v2 rows'
> Restore action to the Import dialog. A Bun route test asserts a v2-artifact restore-by-id returns
> `backup_restore_superseded`/422 (no parse of the binary). This supersession + guard/code are called
> out in *Owning modules* and 07's docs.

### A. Schema + migration (backend)

`core/db/tables/operations.ts` — extend `backupSchedules`:

```ts
export const backupSchedules = pgTable("backup_schedules", {
  // ...existing columns (id, enabled, frequency, retentionDays, storageDriver,
  //    nextRunAt, lastRunAt, createdAt, updatedAt)...
  // NEW: which sections scheduled/full backups capture. Default = full minus the
  // sensitive users/RBAC matrix (opt-in only). jsonb string[] validated app-side.
  include: jsonb("include").notNull().default(["database", "settings", "media"]),
}, (t) => ({ /* existing indexes unchanged */ }));
```

`core/db/migrations/0072_backup_schedule_include.sql`:

```sql
ALTER TABLE "backup_schedules" ADD COLUMN "include" jsonb DEFAULT '["database","settings","media"]'::jsonb NOT NULL;
```

Regenerate the snapshot with the drizzle toolchain (`core/db/drizzle.config.ts`) so
`0072_snapshot.json` + the `_journal.json` `idx: 72` entry match the hand-written SQL (do not
hand-edit the snapshot). Migration must be idempotent-safe under the shared remote test DB
(additive column with a default; existing rows backfill to the full default set).
**Reconcile the index at land time** (mirrors the changelog pin): `0072` is correct only relative to
this pre-branch worktree (verified: last migration `0071_seed_admin_role`, journal idx 0–71). A
parallel stream (480 / 482-484 / 512-516) could land a migration into `feature/tasks` first and claim
`0072` — so at 06's land time re-check the last migration on the merge target and renumber (SQL file
name + `idx`) if needed, regenerating the snapshot/journal via drizzle rather than committing a
hard-coded index.

### B. Types (backend)

`core/services/backups/backupTypes.ts`:

```ts
// backupIncludeOptions already extended to include "users" in 04:
//   export const backupIncludeOptions = ["database", "media", "settings", "users"] as const;

export type BackupSchedule = {
  // ...existing fields...
  include: BackupIncludeOption[]; // scheduled/full backup scope
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
  include?: BackupIncludeOption[]; // NEW
};
```

### C. Service (backend) — schedule include persistence

`core/services/backups/backupService.ts`:

```ts
// Full-backup default for schedules: everything EXCEPT the sensitive users matrix.
const DEFAULT_SCHEDULE_INCLUDE: BackupIncludeOption[] = ["database", "settings", "media"];

const mapSchedule = (row): BackupSchedule => ({
  // ...existing mapping...
  include: normalizeScheduleInclude(row.include), // defensive: coerce/validate stored jsonb
});

// getBackupSchedule seed branch: add `include: DEFAULT_SCHEDULE_INCLUDE` to the insert values.

export async function setBackupSchedule(update: BackupScheduleUpdate): Promise<BackupSchedule> {
  const current = await getBackupSchedule();
  // ...existing retention/frequency/enabled/storageDriver + nextRunAt logic unchanged...
  const include =
    update.include === undefined
      ? current.include
      : normalizeBackupInclude(update.include); // reuse the canonical helper; throws
                                                // backup_include_required / backup_include_invalid
  const [row] = await db.update(backupSchedules)
    .set({ /* ...existing set... */, include, updatedAt: new Date() })
    .where(eq(backupSchedules.id, current.id))
    .returning();
  if (!row) throw new Error("backup_schedule_update_failed");
  return mapSchedule(row);
}
```

`normalizeScheduleInclude(raw)`: if `raw` is not a valid `BackupIncludeOption[]`, fall back to
`DEFAULT_SCHEDULE_INCLUDE` (defensive read of legacy/NULL jsonb) — but `setBackupSchedule` uses the
strict `normalizeBackupInclude` on **input** so bad writes are rejected at the boundary.

### D. Scheduler (backend) — full-backup wiring

`core/server/jobs/backupScheduler.ts`, inside `runDueScheduledBackups` (after the post-lock
`getBackupSchedule()` re-check `fresh`), replace the current
`await createBackup({ kind: "scheduled" })`:

```ts
const include = fresh.include; // operator-chosen scheduled scope
// EVERY v2 backup is encrypted, so an unattended run needs the server passphrase for ANY include
// (not only "users"). Resolve backend-only.
const passphrase = resolveScheduledPassphrase(); // string | null
if (!passphrase) {
  // Fail closed: with no server passphrase NO v2 archive can be produced (encryption is mandatory) —
  // never emit an unencrypted archive from an unattended run.
  const failed = await createBackup({ kind: "scheduled", include, passphrase: undefined });
  // createBackup self-marks failed via sanitizeBackupError: with no passphrase it throws
  // `backup_passphrase_required` (or, if include has "users", 04's named guard
  // `assertUsersEncryptionAllowed` yields `backup_users_requires_encryption` first — §A0, single
  // call-site inside createBackup). Still advance the schedule + audit.
  await markScheduleRun(fresh.id, now);
  await logAudit({ actorId: null, action: "backups.create", targetType: "backup",
    targetId: failed.id, metadata: { kind: "scheduled", source: "scheduler", result: "failed" } });
  await pruneIfAvailable(fresh.retentionDays, now);
  return failed.id;
}
const backup = await createBackup({ kind: "scheduled", include, passphrase });
// ...existing markScheduleRun + pruneIfAvailable + return backup.id unchanged...
// logAudit metadata is { kind: "scheduled", source: "scheduler", result: "succeeded" } — the same
// fixed non-sensitive key set as the failed path above (Security Contract "Audit unchanged in shape"),
// never the passphrase/include values.
```

`resolveScheduledPassphrase`:

```ts
// Backend-only. Reuse the 02 passphrase env contract (confirm the exact name against 02).
function resolveScheduledPassphrase(): string | null {
  const raw = process.env.BACKUP_ENCRYPTION_PASSPHRASE;
  return raw && raw.trim() !== "" ? raw : null;
}
```

**Data flow:** schedule due → advisory lock (existing) → read `fresh.include` + resolve server
passphrase → `createBackup` (02/03/04 do the streamed compressed encrypted archive) → self-marks
complete/failed → `markScheduleRun` advances `nextRunAt` → audit → prune. **Error handling:**
`createBackup` never throws (self-marks failed); the scheduler tick wrapper already logs only
`sanitizeBackupError(error)`; no raw passphrase can reach a log.

> **Failed-row noise guard (no-passphrase state).** The missing-passphrase branch above persists a
> NEW `failed` `backups` row + audit entry on every due tick, which is correct fail-closed behavior
> but would accumulate rows and log noise on a misconfigured server (no `BACKUP_ENCRYPTION_PASSPHRASE`)
> with a frequent schedule. 06 must therefore **throttle the no-passphrase branch to once per
> schedule period / configuration state** (e.g. a `lastNoPassphraseLoggedAt` in-memory guard, or skip
> the extra `createBackup`+audit when the previous tick already recorded the identical
> `backup_passphrase_required` failure for the same schedule): still advance `nextRunAt` and still
> fail closed, but do NOT emit a fresh failed row + audit entry on every single tick. The retention
> pruner bounds the *stored* row count but not the per-tick write amplification, so the guard lives
> here rather than relying on prune. Extend the scheduler Bun test (item 1,
> `backupScheduler.test.ts`) to cover "two consecutive no-passphrase ticks produce at most one new
> failed row".

### E. Validation (backend)

`core/server/validation/backupSchemas.ts` — extend `scheduleUpdateSchema` (below); the `users` enum
member on `createBackupSchema` is 04's, while the **create-schema `passphrase` property is 06's**. Add
it as `passphrase: { type: "string", minLength: 1 }` (real length policy enforced by 02's
`normalizeBackupPassphrase`) and — because every v2 backup is encrypted — add `"passphrase"` to
`createBackupSchema.required` so a create with no passphrase is rejected **400 at validation**, with
`additionalProperties: false` preserved + a reject-unknown/round-trip test. (Manual clients that skip
the schema still fail closed at the service via `normalizeBackupPassphrase`.) The import-schema
`passphrase` is 05's:

```ts
export const scheduleUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
    retentionDays: { type: "integer", minimum: 1, maximum: 3650 },
    storageDriver: { type: "string", enum: ["local", "s3", "azure"] },
    include: {
      type: "array", minItems: 1, maxItems: 4, uniqueItems: true,
      items: { type: "string", enum: ["database", "media", "settings", "users"] },
    },
  },
};
```

### F. Admin client (frontend)

`core/admin/services/backupsClient.ts`:

```ts
export type BackupIncludeOption = "database" | "media" | "settings" | "users";

export type BackupCreatePayload = {
  kind?: BackupKind;
  include?: BackupIncludeOption[];
  passphrase?: string; // NEVER cached; forwarded straight to POST /backups
};

export type BackupScheduleUpdate = {
  enabled?: boolean; frequency?: BackupFrequency; retentionDays?: number;
  storageDriver?: BackupStorageDriver; include?: BackupIncludeOption[]; // NEW
};
export type BackupSchedule = { /* ...existing... */ include: BackupIncludeOption[] }; // NEW

// createBackup: unchanged body plumbing — `input` (incl. passphrase) is JSON.stringified into the
// POST body with withCsrf:true. Do NOT add passphrase to any cache key or patchBackupCreated input.

// NEW: upload-to-import. Multipart body (mirrors mediaRoutes UploadFile + requestBody.parseForm).
// The 05 route returns an import summary (status/counts), NOT a `BackupItem`/backups row (import is a
// restore-from-upload, not a new snapshot — 05 Open Q #3).
// ⚠ SHAPE OWNERSHIP — 05, NOT 06. The import-result field set is 05's canonical contract; 06 MUST
// NOT re-declare a divergent copy (drift risk). If 05's client surface exports the result type, 06
// IMPORTS/re-exports it:
//   import type { BackupImportResult } from "./…05-import-client-surface…"; // canonical shape from 05
// If 05 only exports it server-side, 06 aliases the exact shape 05 documents (verify against 05's
// landed contract at land time — 05 merges before 06) rather than inventing fields here. The
// illustrative fields below (status/artifactVersion/*Restored counts) are 05's to define; treat them
// as a placeholder to be reconciled to 05's final type, not an authoritative 06 declaration.
export async function importBackup(
  file: File,
  passphrase: string,
  opts: { restoreUsers?: boolean } = {}, // opt-in users/RBAC restore (default OFF) — parent decision 5
) {
  const form = new FormData();
  form.append("file", file);
  form.append("passphrase", passphrase); // consumed backend-only by the 05 route; not persisted
  form.append("confirm", "true");        // 05 importBackupSchema requires confirm==="true" (multipart string)
  // 05's importBackupSchema (TASK-511-05:665-673) has an OPTIONAL `restoreUsers` string enum
  // ["true","false"], and the 05 pipeline gates the users/RBAC restore on
  // `input.restoreUsers === true` (TASK-511-05:419/702, defaults false). Forward it as a multipart
  // STRING so an imported `.cbk` that carries the users/RBAC matrix is actually restorable from the
  // admin UI (without this the users section is silently skipped on every import — the parent's
  // headline opt-in users/RBAC import would be unreachable). Always sent (default "false") so the
  // flag is explicit; keep default OFF.
  form.append("restoreUsers", opts.restoreUsers === true ? "true" : "false");
  const result = await apiRequest<BackupImportResult>(
    "/backups/import",
    { method: "POST", body: form }, // no manual Content-Type: browser sets multipart boundary
    { withCsrf: true }
  );
  if (result) {
    invalidateBackupListCaches(); // import restores content → list + schedule may change
  }
  return result;
}
```

Caches: reuse existing `invalidateBackupListCaches` / `clearBackupScheduleCache`. `passphrase` is a
transient field — it is **never** written into `backupListCaches`, `backupScheduleCache`, or any
`sanitize*ForBrowserCache` output (those functions operate on `BackupItem`/`BackupSchedule`, neither
of which carries a passphrase).

### G. Create dialog (frontend)

`core/admin/ui/backups/BackupNowDialog.tsx`:

```ts
const includeOptions = [
  { id: "database", label: "Database snapshot", defaultChecked: true },
  { id: "media", label: "Media assets (file bytes)", defaultChecked: true },
  { id: "settings", label: "Settings & tokens", defaultChecked: false },
  { id: "users", label: "Users & roles (RBAC matrix)", defaultChecked: false, sensitive: true },
];

// Local state only — controlled inputs, NO set-state-in-effect:
//   const [selected, setSelected] = useState<BackupIncludeOption[]>(defaultInclude);
//   const [passphrase, setPassphrase] = useState("");
// Derived (compute in render, not effect):
// Every v2 backup is encrypted (02) — a passphrase is ALWAYS required, not only for `users`.
const requiresPassphrase = true;
const canSubmit = selected.length > 0 && passphrase.length > 0;

// A short always-visible note above the passphrase input:
//   "Every backup is encrypted. You must supply a passphrase, and the SAME passphrase is required to
//    import/restore it. Store it securely — it is never saved."
// When `users` is selected, ALSO render a destructive/warning Alert:
//   "Includes user accounts, roles, and password hashes. Store the passphrase securely — it is never
//    saved and cannot be recovered."
// Passphrase <Input type="password"> is ALWAYS shown (required); on submit -> onCreate(selected,
// passphrase). Reset selected+passphrase on close (existing handleOpenChange reset pattern — extend
// to also clear passphrase).
```

`onCreate` prop signature is `(include: BackupIncludeOption[], passphrase: string) =>
Promise<boolean>` (passphrase **required** — every v2 backup is encrypted);
`BackupsPage.handleCreateBackup` forwards `passphrase` into the **client**
`createBackup({ kind: "manual", include, passphrase })` (which JSON-stringifies it into the
`POST /backups` body, §F). **Do not** log or toast the passphrase.

> **Server-side link (owned by 06):** the passphrase only takes effect once the `POST /backups`
> route handler forwards `body.passphrase` into the **service** `createBackup` AND the create-path
> `encryptBackupArchive`s with it. Today `backupRoutes.ts:156` is `createBackup({ kind, include })`
> (passphrase dropped), `CreateBackupBody` lacks a `passphrase` field, `BackupCreateInput` has none
> (`backupTypes.ts:24`), and `createBackupSchema` has no `passphrase` property. Per the *Owning
> modules* note, **06 owns** the `CreateBackupBody`/handler edit, the `BackupCreateInput.passphrase` +
> `createBackupSchema.passphrase` additions, the `createBackupArtifact` `.cbk`/encrypt rewiring, and
> the Bun route test proving the passphrase reaches the service, triggers encryption, and never leaks
> to logs/audit. 02 supplies only `normalizeBackupPassphrase` + crypto/naming constants.

### H. Import dialog (frontend, new file)

`core/admin/ui/backups/ImportBackupDialog.tsx` — mirror `BackupNowDialog` structure (shared
`Dialog`/`Button`/`Input`/`Alert` primitives):

```ts
// Controlled state: file (File|null), passphrase (string), restoreUsers (boolean, default false).
//   NO effects for state.
// <input type="file" accept=".cbk"> -> setFile(e.target.files?.[0] ?? null)
// Passphrase <Input type="password"> required (import always decrypts).
// Client-side guard: reject file.size > IMPORT_MAX_BYTES with an inline error (server enforces the
//   authoritative ceiling in 05).
// Opt-in users/RBAC restore (parent decision 5) — a confirm-gated `restoreUsers` checkbox, default
//   OFF, mirroring the create-side users opt-in (§G). When checked, render the SAME destructive
//   sensitivity warning Alert as the create dialog:
//   "Restores user accounts, roles, and password hashes from the archive, overwriting existing users
//    and RBAC. This cannot be undone." — the users section of the .cbk is only restored when this is
//   ticked (05 gates on restoreUsers === true; unchecked leaves users untouched).
// Confirm-gated: a warning Alert — "Importing replaces existing content and cannot be undone."
// On confirm: onImport(file, passphrase, { restoreUsers }) -> backupsClient.importBackup(file,
//   passphrase, { restoreUsers }); success toast + refresh({ force: true }); failure -> map ApiError
//   message (e.g. backup_decrypt_failed -> "Wrong passphrase or corrupt archive.") to a toast, keep
//   dialog open. Reset file+passphrase+restoreUsers on close.
// `onImport` prop signature: (file: File, passphrase: string, opts: { restoreUsers: boolean }) =>
//   Promise<boolean>.
```

### I. Schedule card (frontend)

`core/admin/ui/backups/BackupScheduleCard.tsx` — add a checkbox group for the scheduled include set,
initialized from `schedule.include`; include it in the `onSave` payload alongside the existing
`frequency`/`storageDriver`. Show the same `users` sensitivity warning and note that scheduled
`users` backups require the server passphrase to be configured (env). State is local + controlled;
initialize from props via `useState(() => schedule?.include ?? [...])` with the existing
`key={schedule?.id}` remount pattern in `BackupsPage` — **no set-state-in-effect**.

### J. Page wiring (frontend)

`core/admin/ui/backups/BackupsPage.tsx`:
- Add `const [importOpen, setImportOpen] = useState(false)` + an "Import" button next to "Create" in
  the `PageHeader` actions.
- Change `handleCreateBackup(include, passphrase)` (passphrase **required** — every backup is
  encrypted) to forward the passphrase to the client `createBackup`.
- Add `handleImport(file, passphrase, { restoreUsers })` mirroring `handleRestore` (setIsSaving,
  try/catch with `isApiClientError`, `refresh({ force: true })`, toast) — forward `restoreUsers` into
  `backupsClient.importBackup(file, passphrase, { restoreUsers })`; then close the import dialog on
  success.
- Extend `handleRestore` (restore-by-id) to map a `backup_restore_superseded` ApiError to a guided
  toast — "This is a Backup v2 archive. Download it, then use Import (with its passphrase) to
  restore." — and route the Restore action of a v2 `.cbk` row to the Import dialog (see the §A0
  restore-from-stored callout).
- Mount `<ImportBackupDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport}
  isSubmitting={isSaving} />`.

---

## Testing Requirements

**Lane rule (AGENTS.md):** Bun for scheduler/route/DB/crypto/streaming paths; Vitest (happy-dom) for
Bun-free UI. Shared **remote** test DB — every DB test uses uniquely scoped fixtures and cleans up
only its own rows; **never** truncate shared tables; restore/import assertions run through a
rollback-scoped seam (mirror `restoreArtifactTx`/`replaceSnapshotTables` usage in the existing
`tests/integration/routes/backups.test.ts` and `tests/unit/backups/backupService.test.ts`).

**0. Pre-existing green-assertion MIGRATION (06-owned, MANDATORY — not merely additive).** The §A0
create-path flip is a **breaking change to every pre-existing test that today creates/downloads/
restores a v1 `.json` artifact with no passphrase**. The extend-bullets below add *new* coverage; this
bullet pins the equally-required **rewrite of the currently-green assertions** so the gate does not
regress on tests 01–05 leave untouched. 06 owns both bun:test files and must migrate (not just append
to) these specific cases at land time:
- `tests/unit/backups/backupService.test.ts`:
  - `createBackup adds backup and listBackups returns it` (`:63`, `createBackup({ include:
    ["database","settings"] })`, asserts `status === "complete"` `:71`, `artifactPath === "local"`
    `:73`) — thread a valid `passphrase` so it still reaches `complete`, OR split into a
    fail-closed case asserting `status: "failed"` + `error: "backup_passphrase_required"` for the
    no-passphrase call. Either way it can no longer assert `complete` from a passphrase-less create.
  - `completed backups download CMS-managed artifacts…` (`:101`) — the three passphrase-less
    `createBackup` calls (`:102-104`) plus the download assertions `localDownload.contentType).toBe
    ("application/json")` (`:114`) and `content).toContain(localArtifact.id)` (`:115`) must move to
    the v2 shape: pass a passphrase, expect `contentType: BACKUP_ARCHIVE_CONTENT_TYPE`
    (`application/octet-stream`) + `encoding: "base64"`, and assert byte-exactness via
    `Buffer.from(content, "base64")` (the plaintext id is no longer substring-visible inside an
    encrypted `.cbk`). Keep ONE explicit legacy path: seed a v1 `.json` row directly (bypass
    `createBackup`) to preserve the `application/json` / no-`encoding` / `content.contains(id)`
    back-compat assertion.
  - `artifactFilePath` helper (`:363-367`, `coderso-backup-${id}.json`) and the `parseBackupArtifact`
    v1 cases (`:407-424`) stay for the legacy path, but any test that fed a **freshly created** row
    into them must switch to a hand-seeded v1 row (new creates now emit `.cbk`).
- `tests/integration/routes/backups.test.ts`:
  - `POST /backups/:id/restore restores (no-op media artifact)…` (`:421`) — its
    `createBackup({ include: ["media"] })` (`:424`, no passphrase) then restore-by-id asserting
    `status === "complete"` (`:446`) is doubly broken: the create now fails closed AND restore-by-id
    of a `.cbk` returns `backup_restore_superseded`/422 (§A0 restore-from-stored). Migrate to either
    (a) a hand-seeded **v1 `.json`** row to keep exercising the legacy restore-by-id → `complete`
    path, or (b) a v2 create-with-passphrase asserting restore-by-id now yields
    `backup_restore_superseded`/422 (covered again in Bun Test 3). Do not leave it asserting a
    passphrase-less v2 create restores to `complete`.
  - Any other `POST /backups` / create-then-assert-`complete` cases in this file must add a passphrase
    (v2 happy path) or assert the fail-closed `failed` status — none may keep asserting a
    passphrase-less create reaches `complete`.
- **Gate hygiene (memory'd gotchas).** After these prop/return-shape changes (`BackupDownload.encoding`,
  `createBackupArtifact`/`resolveBackupDownload` signatures, `onCreate` widening) run the **root**
  `tsc -p tsconfig.json --noEmit` in addition to `bun --cwd core lint:types` — core-only lint does NOT
  cover `tests/`, and a migrated test's excess-prop/return-shape error there would block the owner's
  commit (typecheck-scope gotcha). Re-run the **named** migrated files rather than the full vitest/bun
  glob to avoid the known spurious full-glob timeout flakes (full-vitest-flake gotcha).

**Bun (`bun test`):**
1. `tests/integration/runtime/backupScheduler.test.ts` (extend) — a due schedule with
   `include: ["database","settings","media"]` **and `BACKUP_ENCRYPTION_PASSPHRASE` set** calls
   `createBackup` with that include + the resolved passphrase (spy/seam). With **no**
   `BACKUP_ENCRYPTION_PASSPHRASE`, the run fails closed for **any** include (mandatory encryption):
   a `["database","settings","media"]` run fails with `backup_passphrase_required` and a
   `["...,"users"]` run fails with `backup_users_requires_encryption` (guard runs first) — in both
   cases the created row is `failed`, `backups.create` audit has `result: "failed"`, `nextRunAt`
   still advances via `markScheduleRun`, and no unencrypted archive/users export is emitted. Assert no
   passphrase value appears in any captured log/audit metadata.
2. `tests/unit/backups/backupService.test.ts` (extend) — `setBackupSchedule({ include })` round-trips
   through `mapSchedule` (persist → read); `include: []` throws `backup_include_required`; an
   out-of-enum include throws `backup_include_invalid`; `getBackupSchedule` seed produces the full
   default set; the stored jsonb reads back as a `BackupIncludeOption[]`.
3. `tests/integration/routes/backups.test.ts` (extend) — `PATCH /backups/schedule` accepts
   `{ include }`, rejects an unknown key / bad-enum item with 400 (reject-unknown), and audit
   metadata carries **key names only** (no passphrase/include values). Confirm the route table still
   wires the canonical endpoints and the schedule route stays `backups:write`.
   **Create-passphrase forwarding (06-owned):** `POST /backups` with a body `passphrase` reaches the
   service `createBackup` (via a service spy/seam), triggers the encrypt path, and the passphrase value
   **never** appears in any log or in the `backups.create` audit metadata (which stays `{ kind,
   include }`); `createBackupSchema` accepts the `passphrase` property, **requires** it (a create body
   with no `passphrase` is rejected 400 `validation_error`), and rejects an unknown field.
   **Mandatory-encryption fail-closed (06-owned):** a UI-bypassing `POST /backups` with a valid
   `include` (e.g. `["database"]`) but **no `passphrase`** that reaches the service (schema-skipping
   client) → the created `backups` row ends `status: "failed"` with
   `error === "backup_passphrase_required"` (02's `normalizeBackupPassphrase` via `createBackup`'s
   self-fail); no `.cbk` bytes are written.
   **Manual users fail-closed (06-owned):** `POST /backups` with `include:[...,"users"]` and **no
   `passphrase`** (a UI-bypassing request) → the created `backups` row ends `status: "failed"` with
   `error === "backup_users_requires_encryption"` (04's guard runs FIRST via `createBackup`'s
   self-fail — the users-specific code, not the generic passphrase one), and
   **no** `packBackupArchive`/`exportUsersSection`/encrypt call runs and **no** unencrypted user
   output (artifact bytes / log line) is produced — assert the guard fires before any read. This is
   the server-side counterpart to the UI `canSubmit` gate (§G), so the fail-closed rule holds even
   without the browser.
   **v2 `.cbk` download transport (06-owned — the HIGH fix):** `resolveBackupDownload` on a completed
   v2 `.cbk` row returns `contentType: BACKUP_ARCHIVE_CONTENT_TYPE`, `encoding: "base64"`, and a
   `content` **base64 string** that decodes **byte-for-byte** to the stored `.cbk` file bytes (assert
   `Buffer.from(dl.content, "base64")` equals `readFile(artifactPath)` — proving the download is
   re-importable, not corrupt); and that `GET /backups/:id/download` returns that base64 string
   intact through JSON serialization (no `{"0":..}` byte-object mangling). A legacy v1 `.json` row
   still returns a utf8 `content` string with **no** `encoding` marker (back-compat) and
   `readBackupArtifactContent`/`restoreBackup` still parse it. A v2 row's restore-by-id returns
   `backup_restore_superseded`/422 before any parse (the fail-fast guard).
   *(The `POST /backups/import` route test belongs to 05; do not duplicate the import pipeline test here.)*
6. `tests/unit/backups/backupService.test.ts` (extend) — **spool cleanup / no-leak (06-owned).** A
   successful `createBackup({ include: ["database"], passphrase })` leaves **no** temp spool dir behind:
   snapshot the tmp root (os.tmpdir/`BACKUP_TMP_DIR`) before/after and assert no residual
   `coderso-backup-*` spool dir survives (01's `PackedArchive.cleanup` ran in the `finally`). Then force
   a failing create — stub `encryptBackupArchive`/`writeStreamToFile` to throw (or seed an unwritable
   artifact dir) — and assert (a) the row is `status: "failed"` and (b) the spool dir is **still** gone
   (the `finally` reclaims it on the throw path too). Proves the create path does not leak spool dirs on
   either outcome, upholding the no-OOM/scalability goal.

**Vitest (happy-dom, `@vitest-environment happy-dom`):**
4. `tests/vitest/ui/backups.test.tsx` (extend) + `tests/vitest/admin/backupsClient.test.ts` (extend)
   — Create dialog: selecting `users` reveals the sensitivity warning and requires a passphrase
   (submit disabled until entered); the passphrase is forwarded to `createBackup` but **never**
   written to any cache (assert `getCachedBackups`/`getCachedBackupSchedule` payloads contain no
   passphrase). Import dialog: file + passphrase → `importBackup` posts multipart to
   `/backups/import` with `withCsrf: true`, and a `backup_decrypt_failed` ApiError surfaces a
   friendly message without leaking internals. **Users opt-in forwarding (06-owned):** ticking the
   import dialog's `restoreUsers` checkbox reveals the sensitivity warning and makes
   `importBackup(file, passphrase, { restoreUsers: true })` append the multipart field
   `restoreUsers === "true"` (assert on the captured `FormData`); left unticked it appends `"false"`
   (default OFF). Proves the parent's opt-in users/RBAC import has a reachable UI entry point and that
   05's `restoreUsers === true` gate can actually be triggered from the admin UI. Schedule card:
   include checkboxes initialize from
   `schedule.include` and are sent in `onSave`. **v2 download decode (06-owned):** `handleDownload`
   /`downloadBackupContent` given a `BackupDownload` with `encoding: "base64"` builds a `Blob` from the
   **decoded bytes** (`Uint8Array.from(atob(content), …)`), not the raw base64 text — assert the Blob
   size equals the decoded byte length (spy on `URL.createObjectURL`/`Blob`), and that a v1 download
   (no `encoding`) still Blobs the utf8 string path.
5. Round-trip allowlist test: every newly validated key (`schedule.include`, and its enum member
   `"users"`) is asserted to be accepted end-to-end by `scheduleUpdateSchema` and rejected when
   unknown — the "new validated key joins its allowlist + ships a round-trip test" rule.

**Typecheck:** after prop-signature changes (`onCreate` widening, new dialog props) run the root
`tsc -p tsconfig.json --noEmit` in addition to `bun --cwd core lint:types`, per the memory'd
typecheck-scope gotcha (core-only lint misses `tests/` excess-prop errors).

---

## Coordination

- **Land order:** strictly sequential — 06 lands **only after** 01→02→03→04→05 have merged (it
  depends on their exports: `packBackupArchive` (01 §4.6a), `encryptBackupArchive` /
  `normalizeBackupPassphrase` / `.cbk` constants (02), `backupIncludeOptions` incl. `"users"` + the
  encrypted-only guard + `mapBackupError` codes (02/04), and the `POST /backups/import` route (05)).
  07 (docs, gates & closure) lands last.
- **Region single-writer on shared files:** 06's create-path edits to `backupRoutes.ts`
  (`POST /backups` handler), `backupSchemas.ts` (`createBackupSchema.passphrase`), `backupTypes.ts`
  (`BackupCreateInput.passphrase` + schedule types), and `backupService.ts` (create rewiring +
  schedule) are **distinct regions** from 05's import route / 04's users enum / 02's crypto module.
  Because 06 lands last, it edits on top of every prior merge — region-level single-writer holds under
  the sequential order (see parent §Coordination).
- **Single-writer:** at 06's land time it is the sole writer of every file listed under *Owning
  modules*; do not pre-touch files still owned by an unlanded earlier subtask.
- **Changelog:** do **not** add a changelog entry here. The pinned free number is **1281** — this is
  the orchestrator pin, NOT the value in a stale worktree `_docs/_CHANGELOG/README.md` (which can lag
  because it was branched before later numbers were consumed). The journal now runs through `1273`,
  `1274` is owned by TASK-559, and `1275-1279` are reserved by the small-feature stream, so 1281 is
  authoritative for 511. Do NOT default to an older README number — it would collide. **Only the
  closure subtask 511-07** writes `_docs/_CHANGELOG/1281-*.md` and edits `_docs/_TASKS/*` status.
- **New env/config:** the scheduler passphrase env (`BACKUP_ENCRYPTION_PASSPHRASE`, reused from 02)
  must be documented in `.env.example` + `docs/develop/getting-started.md` — that documentation is
  performed by **511-07** (docs & closure), consistent with the parent Coordination note. This
  subtask only *reads* the env server-side and must confirm the exact name matches 02's contract.
- **Shared remote DB safety:** the seeded `backup_schedules` singleton defaults `enabled: true`;
  keep the scheduler `BACKUP_SCHEDULER_ENABLED` opt-in-outside-production behavior untouched so dev
  instances on the shared render.com DB do not fire real full backups.

---

## Open Questions (for the orchestrator)

1. **Per-schedule `include` column vs fixed full scheduled backup.** This contract adds a
   `backup_schedules.include` jsonb column so operators choose the scheduled scope (default
   `["database","settings","media"]`). The parent line "Extend the schedule + createBackup include"
   is also readable as "scheduled backups are always full". Confirm the column approach (chosen here
   for operator control + UI checkboxes on the schedule card) vs a fixed full scheduled scope with no
   new column/migration.
2. **Scheduled passphrase env name — RESOLVED.** 02 §"Coordination → Passphrase source policy"
   now names the sole backend-only scheduled-passphrase env var **`BACKUP_ENCRYPTION_PASSPHRASE`**
   (the "default backup-encryption key" hinted in the parent Coordination), read only by 06's
   `resolveScheduledPassphrase()` for unattended runs and normalized through 02's
   `normalizeBackupPassphrase`; 07 documents it. Names match across 02/06/07.
3. **Scheduled run with no server passphrase — fail closed (mandatory encryption).** Because every
   v2 `.cbk` is encrypted (02 format has no unencrypted variant; 05 always decrypts), a scheduled run
   with no `BACKUP_ENCRYPTION_PASSPHRASE` fails the run closed (marks the created row failed) for
   **any** include — not only `users` — rather than silently producing an unencrypted or scope-narrowed
   backup. Confirm fail-closed is desired (recommended: yes) AND confirm the operational consequence:
   scheduled backups do not run until `BACKUP_ENCRYPTION_PASSPHRASE` is configured (07 documents this
   in `.env.example` + getting-started).
4. **Remote (s3/azure) artifact upload — RESOLVED: keep buffering, no-OOM scoped to the LOCAL
   driver.** 03 adds a streaming keyed write `putAt(key, body, size, contentType)` (03 §4.1) to
   `MediaStorageAdapter`, so remote streaming is technically available — but two concrete blockers make
   it a poor fit for the create-path at 06's land: (i) the encrypted `.cbk` stream's final byte size is
   unknown until packBackupArchive→gzip→GCM completes, while s3's `putAt` needs it upfront as
   `ContentLength`; and (ii) `putAt` skips `buildKey()`, so 06 would have to mint + own the artifact key
   itself. **Decision (resolves the finding — this is no longer an open owner choice and does not block
   land): ship option (b)** — the remote branch keeps the v1 `arrayBuffer` buffering
   (`uploadBackupArtifact` → `adapter.put(UploadFile)`, the same whole-object buffering v1 already does
   for the JSON artifact string), and the parent's **no-container-OOM guarantee is formally SCOPED TO
   THE LOCAL DRIVER** (`writeStreamToFile`, which streams straight to disk). This is a deliberate,
   documented constraint, not a silent regression: it matches v1's existing remote behavior and adds no
   new OOM surface. **Option (a)** — stream remote via spool-to-temp (reuse `writeStreamToFile` to a
   temp path to learn the exact byte size, then `putAt(mintedKey, fileStream(tempPath), size,
   BACKUP_ARCHIVE_CONTENT_TYPE)` and clean up the temp) — is recorded as an explicit **03/06 follow-up**
   (needs 03 to expose a size-optional/multipart `putAt`, or 06 to own the spool + minted key) and is
   out of scope for this land. **07 MUST document the no-OOM guarantee as local-only and MUST NOT claim
   remote (s3/azure) streaming or remote no-OOM** — 07 already carries this scoping (07 §"Streaming /
   no-OOM scope", lines 105-113); this decision confirms it. (§A0-persist.)
