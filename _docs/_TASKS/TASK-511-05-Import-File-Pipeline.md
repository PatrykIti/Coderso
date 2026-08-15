# TASK-511-05: Import-file pipeline (upload → decrypt → validate → batched transactional restore)

# FileName: TASK-511-05-Import-File-Pipeline.md

**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Priority:** High
**Category:** Backups / Data / Security / Streaming / Admin
**Estimated Effort:** Large
**Depends On:** TASK-511-01 (streaming export engine + tar archive/manifest + `ARCHIVE_TABLE_DESCRIPTORS` + version/section-name constants), TASK-511-02 (compression + AES-256-GCM/scrypt `decryptBackupArchive` + `normalizeBackupPassphrase` + `.cbk` header codec + error codes), TASK-511-03 (media-file restore helper `restoreMediaFromArchive`), TASK-511-04 (users/RBAC restore helper `restoreUsersSectionTx` + `"users"` include enum)
**Blocks:** TASK-511-06 (Admin Import dialog + `backupsClient.importBackup` call the `POST /backups/import` route defined here)
**Status:** ✅ Done
**Completed:** 2026-08-15
**Land order:** strictly sequential — lands **5th** (after 01→02→03→04 have merged, before 06→07). 05 imports 01's tar/manifest + `ARCHIVE_TABLE_DESCRIPTORS` + section-name constants, 02's `decryptBackupArchive`/`normalizeBackupPassphrase`, 03's `restoreMediaFromArchive`, and 04's `restoreUsersSectionTx`; therefore all four must be landed first.

---

## 1. Overview / Goal

TASK-484 can *restore a backup the CMS itself created and still holds*
(`restoreBackup(id)` reads a stored `coderso-backup-<id>.json` artifact by id —
`backupService.ts:737`), but it **cannot import an uploaded file**: there is no route
that accepts a byte upload, no decrypt step, and the v1 parser only understands the
in-memory JSON artifact (`parseBackupArtifact`, `backupService.ts:686`). The parent
Overview calls this out: *"It also cannot import an uploaded backup file."*

This subtask builds the **reverse of the Backup-v2 export pipeline** as an uploadable
import route:

```
upload (.cbk multipart) → REQUIRE maintenance mode ON (else 409 backup_maintenance_required)
  → size-guard → decryptBackupArchive (02, AES-256-GCM/scrypt)
  → gunzip (inside 02) → tar byte stream → spool to a bounded temp file (O(1) memory)
  → PASS 1 (validate, NO writes): manifest.json (reject-unknown + version handshake),
     verify every tables/*.ndjson member's SHA-256 + rowCount vs manifest
     (GCM auth is implicit — a clean decrypt means every frame authenticated)
  → PASS 2 (ONE DB transaction, all-or-nothing): FK-safe reverse-delete + batched
     NDJSON re-insert of the content tables (reuse 484's ordering knowledge via 01's
     ARCHIVE_TABLE_DESCRIPTORS), settings via 484's importConfigTx, opt-in users/RBAC
     via 04's restoreUsersSectionTx — all inside ONE outer tx
  → AFTER commit, OUTSIDE the tx: restore media file bytes via 03's restoreMediaFromArchive
  → cleanup temp spool (always, finally).
```

The whole thing is **streaming + batched + fail-closed**: a multi-GB archive is never
fully buffered in application memory (decrypt streams, the tar is spooled to disk with
O(1) memory, restore inserts in batches), and a wrong-passphrase / tampered / truncated
/ version-mismatched / checksum-mismatched archive is rejected **before any DB write**,
while the destructive restore stays **confirmation-gated + transactional** exactly as
TASK-484 established.

### Maintenance-mode gate (owner-confirmed 2026-07-06 — disaster-restore safety)

A full/disaster import delete-replaces the content snapshot tables, so it MUST run with
no concurrent front-end registrations / content writes racing it. This subtask introduces
a **maintenance mode** and gates the import on it:
- **Setting (single-writer: `settingsService.ts`).** Add `site.maintenanceMode` boolean
  to `DEFAULT_SETTINGS` (`core/services/settings/settingsService.ts:51`) with value
  `false`; because `ALLOWED_KEYS` (`settingsService.ts:98`) is derived from
  `Object.keys(DEFAULT_SETTINGS)`, the new key joins the reject-unknown allowlist
  automatically — add the explicit round-trip persistence test the contract requires.
  Toggled via the existing `PATCH /settings` write path (`settings:write` + CSRF). No
  sibling 511 subtask writes this key.
- **Public 503 middleware (single-writer: `publicSite.tsx`).** Insert the guard at the
  top of `handlePublicRequest` (`core/server/publicSite.tsx:672`) so BOTH the public
  pages AND the non-admin public API dispatchers it hosts
  (`handlePublicBookingApi` `:678`, `handlePublicFormsApi` `:686`,
  `handlePublicPopupsApi` `:694`, `handlePublicAnalyticsApi` `:707`, `/api/search`
  `:718`) return `503 Service Unavailable` with a small "under maintenance" body while
  `site.maintenanceMode === true`. `handlePublicRequest` is dispatched at
  `core/server/httpServer.ts:562`, AFTER the admin branch at `:560`
  (`handleAdmin`) — so admin SPA, `/auth/*`, and `/admin/api/*` (incl. this import
  route) stay reachable and the admin can drive the restore + flip the flag back.
- **Import gate (single-writer: 05's `backupRoutes.ts`).** `POST /backups/import` fails
  closed with `backup_maintenance_required` (409, mapped via `mapBackupError`) when
  maintenance mode is OFF — the admin must enable it first. Users-section restore inside
  the import stays **MERGE** (04's UPSERT, never delete-all) — maintenance mode just
  guarantees no races during the destructive content replace.
- Regression tests: import refused (409) when maintenance OFF; import proceeds when ON;
  public request → 503 while ON; admin/import routes reachable while ON; `site.maintenanceMode`
  round-trips through settings. (Bun lane for the route/middleware; scoped fixtures; restore
  itself stays rollback-scoped per the shared-DB safety rule.)

### Non-goals (owned elsewhere — do NOT re-implement)
- Crypto/framing/decrypt (`decryptBackupArchive`, `normalizeBackupPassphrase`, header
  codec, decrypt error codes) — **02** owns it; 05 calls it.
- Tar *writer*, manifest *builder*, version constants, `ARCHIVE_TABLE_DESCRIPTORS`,
  pinned section-member names — **01** owns them; 05 imports the exported symbols and
  mirrors the ustar layout for the *reader*.
- Media byte restore (`restoreMediaFromArchive`, `putAt`, `assertSafeMediaKey`, per-file
  ceiling) — **03** owns it; 05 calls it after the DB commit.
- Users/RBAC restore (`restoreUsersSectionTx`, opaque-hash upsert, lockout guard,
  permission re-validation) — **04** owns it; 05 calls it inside the tx.
- The Admin Import dialog + `backupsClient.importBackup` + scheduler wiring — **06** owns
  them; 06 *consumes* the `POST /backups/import` route this subtask defines.
- Settings **export** as an archive member — produced by 01/06's create/engine path. 05
  only *consumes* a `settings.json` member on import (§7 Q1, RESOLVED).

---

## 2. Verified current-state anchors (re-checked against source in this worktree)

Re-checked against `/home/coder/project/Coderso-task-511` (`grep -an`/Read, per the
rg-binary trap):

**Restore internals to reuse the *knowledge* of (do NOT edit — TASK-484):**
- `restoreBackup(id, { confirm })` — `backupService.ts:737`: fail-closed confirm gate
  (`input.confirm !== true` → `backup_restore_confirmation_required`, `:747`),
  strict-parse **before** any write (`:752`), single outer `db.transaction` wrapping
  `restoreArtifactTx` (`:757-759`). 05 preserves this posture but sources bytes from the
  **upload**, not a stored id.
- `restoreArtifactTx(tx, artifact)` — `backupService.ts:627`: `if (artifact.database)
  replaceSnapshotTables(tx, …)` (`:631`) then `if (artifact.settings) importConfigTx(tx, …)`
  (`:634`) inside the caller's tx. 05's streaming successor mirrors both the
  `database`-guard and the settings step but never loads the whole DB section into memory.
- `replaceSnapshotTables(tx, database)` — `backupService.ts:608`: reverse-delete
  (children→parents) then insert (parents→children). **In-memory** (takes a whole
  `BackupArtifactDatabase`); 05 does the same *ordering* but **batched from the tar
  spool**, not from an in-memory object. Its delete loop is
  `for (const { table } of [...snapshotTableOrder].reverse()) await tx.delete(table)`
  (`:613`) — 05 mirrors this over `ARCHIVE_TABLE_DESCRIPTORS`.
- `reviveRowsForInsert(table, rows)` — `backupService.ts:588`: revives `date`-dataType
  columns (`typeof value === "string" && column.dataType === "date"` → `new Date`)
  using `getTableColumns(table)` (`:592`). Private const; 05 re-implements the identical
  tiny helper (documented lock-step) to avoid editing 484's file (single-writer).
- `DbTransaction` type — `backupService.ts:62`
  (`Parameters<Parameters<typeof db.transaction>[0]>[0]`) — 05 declares the same local
  alias (it is not exported).
- `importConfigTx(tx, bundle)` — **exported** from
  `services/tools/importExportService.ts:404`
  (`(tx: DbTransaction, bundle: ExportBundle) => Promise<ImportResult>`; runs
  `validateBundle(bundle)` first — `:408`), already imported by `backupService.ts:38`.
  05 imports it directly for the `settings.json` member.
- `sanitizeBackupError(error)` — `backupService.ts:272`: strips `cwd` + backup-dir; 05
  surfaces every uncoded error either through `mapBackupError` or, at the service edge,
  through this (it is already exported).

**Route/validation surface (05 extends — single-writer at land time):**
- `mapBackupError(error)` — `backupRoutes.ts:80`: the coded-error → `ApiError` allowlist
  switch (e.g. `backup_restore_invalid_artifact` → 422 at `:94`;
  `backup_restore_confirmation_required` → 400 at `:88`). 05 adds the import/decrypt
  codes here (§3), on distinct `case` lines — 04's users codes and 06's schedule codes
  are added by their owners (no per-line collision; region-level ownership per parent
  §Coordination).
- `registerBackupRoutes(router, { requirePermission, validate })` — `backupRoutes.ts:135`.
  Every write route is `requirePermission("backups:write")` (create `:150`, restore
  `:170`, delete `:192`, prune `:210`). 05 adds
  `router.post("/backups/import", requirePermission("backups:write"), …)`.
- The **route-file local `RouteContext`** (`backupRoutes.ts:30-37`) currently declares
  `params`, `query`, `body`, `user?`, `ip?`, `userAgent?` — **it has no `headers`**.
  The framework DOES populate `ctx.headers` (`httpServer.ts:340`, `headers: headersObj`)
  and the canonical `router.ts` `RouteContext` (`router.ts:5`) has `headers?:
  Record<string, string | undefined>`. **Corrected assumption:** to read
  `ctx.headers["content-length"]` (§5.6) 05 MUST add `headers?: Record<string, string |
  undefined>;` to `backupRoutes.ts`'s local `RouteContext` — a small additive edit in a
  file 05 already owns at land time (it is adding the import route there). Without it the
  handler would not typecheck (`bun --cwd core lint:types` / root `tsc`).
- `validate(schema, ctx.body)` + reject-unknown schemas — `backupSchemas.ts` (every
  schema `additionalProperties: false`). 05 adds `importBackupSchema`.

**Framework request handling (grounded — matters for the upload):**
- `parseRequestBody(req)` — `server/requestBody.ts:47`: `multipart/form-data` bodies are
  parsed by `req.formData()` (`parseForm`, `requestBody.ts:20-31`); **each scalar field
  becomes a string, each file field a Web `File`/`Blob`** (`payload[key] = value`).
  A malformed multipart body throws `ApiError("invalid_form", …, 400)`.
- `ctx.body = await parseRequestBody(req)` is populated when the `RouteContext` is built
  (`httpServer.ts:339`), and `ctx.headers = headersObj` at `:340` — **before** the
  handler's rate-limit (`checkRateLimit`, `httpServer.ts:368`) and CSRF (`enforceCsrf`,
  `httpServer.ts:379`), which run in the handler try-block (`:365-379`).
  **Corrected assumption (honest scope — see §7 Q5):** because `parseRequestBody`
  materializes the whole multipart body via `req.formData()` *before* the handler runs,
  the handler-level `content-length` ceiling cannot prevent that initial parse. Bun backs
  large multipart uploads with a temp file (not resident memory), so `formData()` itself
  does not OOM; 05's ceiling therefore guards the **decrypt+restore path** (the expensive
  work) and rejects an oversized declared/actual file size before decrypt. A true
  *pre-parse* streaming ceiling would live in `parseRequestBody`/`httpServer` (framework,
  484-owned) — out of 05's single-writer scope; flagged in §7 Q5. 05 still streams from
  `file.stream()` for decrypt/spool so it never makes a second full in-memory copy.
- **Multipart route precedent 05 mirrors:** `POST /media` (`mediaRoutes.ts:111-133`)
  does `validate(mediaUploadSchema, ctx.body)` then a runtime `isUploadFile(body.file)`
  guard (`mediaRoutes.ts:54-63,119`). `mediaUploadSchema` (`mediaSchemas.ts:1-11`) types
  the file as `file: { type: "object" }`, `required: ["file"]`, `additionalProperties:
  false`. **Corrected assumption:** the media `isUploadFile` guard checks
  `name/type/size/arrayBuffer` — but 05 streams via `.stream()`, so 05 defines its OWN
  local `isImportUploadFile` guard that requires `typeof file.stream === "function"`
  (a Web `File` exposes `.stream()`, `.arrayBuffer()`, `.name`, `.type`, `.size`); it
  does NOT reuse the media guard verbatim.
- **Content-length guard precedent:** `publicAnalyticsApi.ts` `readCappedJson` (`:67-75`)
  checks the declared `content-length` header first (413), then the actual byte count
  (chunked bodies omit content-length). 05 reuses this two-tier ceiling shape (plus a
  streaming spool counter, since 05's payload is bytes not JSON).
- `logAudit(event)` — `auditService.ts:199`; `AuditEvent` (`auditService.ts:22`) has
  `actorId?: string | null` and **`targetId: string`** (required, **non-nullable**,
  `auditService.ts:26`). An upload-restore has no stored `backups` row id (§7 Q3), so
  05 uses a stable synthetic `targetId: "import"` (matching the non-null convention:
  `backupRoutes.ts:179` `targetId: backup.id`, `:219` `targetId: "retention"`). A `null`
  would fail root `tsc`.

**01 exports 05 consumes** (`core/services/backups/backupArchive.ts`): `ARCHIVE_TABLE_DESCRIPTORS`
(22 entries — key + table + cursor, mirrors `snapshotTableOrder` `backupService.ts:553-583`),
`ARCHIVE_ARTIFACT_VERSION` (=2), `ARCHIVE_SCHEMA_VERSION`, `ARCHIVE_ENGINE_VERSION`,
`MANIFEST_MEMBER_NAME` (`"manifest.json"`), `TABLE_MEMBER_DIR` (`"tables"`), the pinned
section-member names `SETTINGS_MEMBER_NAME` (`"settings.json"`), `USERS_MEMBER_NAME`
(`"users.ndjson"`), `ROLES_MEMBER_NAME` (`"roles.ndjson"`), `USER_ROLES_MEMBER_NAME`
(`"user_roles.ndjson"`), and the `ArchiveManifest`/`ArchiveTableManifest`/`TarMember`
types. The ustar layout is fixed by 01 §4.4 (512-byte header, name @0 (<100B), octal size
@124, typeflag `'0'` @156, body NUL-padded to 512, EOF = two zero blocks); 05's reader
parses that same layout. 01 §4.6a guarantees **emit order**: `manifest.json` →
`tables/<key>.ndjson` (in `ARCHIVE_TABLE_DESCRIPTORS` order) → `settings.json` → `media/*`
→ users members.

**02 exports 05 consumes** (`core/services/backups/backupCrypto.ts`):
`decryptBackupArchive(source: ByteStream, passphrase: string) => ByteStream` (returns the
**gunzipped tar** byte stream — 02 pipes through `DecompressionStream("gzip")`
internally), `normalizeBackupPassphrase(input) => string`, `BACKUP_ARCHIVE_EXTENSION`
(`.cbk`), and the coded errors `backup_decrypt_failed` / `backup_archive_unsupported` /
`backup_passphrase_required` / `backup_passphrase_invalid`.

**03 exports 05 consumes** (`core/services/backups/mediaArchive.ts`):
`restoreMediaFromArchive(reader, deps?)` where `reader` is a local structural
`{ entries(): AsyncIterable<{ name: string; size: number; body: AsyncIterable<Uint8Array> }> }`
(03 §4.3) — 05 owns the concrete `readTarMembers` that satisfies it (§4.2 + §7 Q2). 03
throws `backup_media_key_unsafe` / `backup_media_write_failed`.

**04 exports 05 consumes** (`core/services/backups/backupUsersSection.ts`):
`restoreUsersSectionTx(tx, section, { restoreUsers, confirm })` taking already-`normalize*`
-parsed `{ users; roles; userRoles }` arrays; throws `backup_users_restore_no_admin`
(409) / reuses `backup_restore_invalid_artifact` (422) /
`backup_restore_confirmation_required` (400).

---

## 3. Security Contract (route-touching: `POST /backups/import`)

This subtask **adds a new write route**, so it restates and extends the parent Security
Contract and TASK-484's fail-closed posture:

- **RBAC + CSRF + rate-limit.** `POST /backups/import` is registered with
  `requirePermission("backups:write")` — the same gate as create/restore
  (`backupRoutes.ts:150,170`). CSRF is enforced by the framework for the authenticated
  write (`enforceCsrf(req, ctx, security.csrf)`, `httpServer.ts:379`; 06's client sends
  the CSRF header). Rate-limiting applies via the existing admin bucket
  (`checkRateLimit`, `httpServer.ts:368`). No new permission is introduced.
- **Reject-unknown validation.** `importBackupSchema` is `additionalProperties: false`
  with `required: ["file","passphrase","confirm"]`; unknown fields → 400
  `validation_error` before any processing (mirrors every other backup schema). Because
  multipart scalars arrive as **strings** (`requestBody.ts:24`), `confirm`/`restoreUsers`
  are validated as **string enums** (`confirm` enum `["true"]`; `restoreUsers` enum
  `["true","false"]`) and coerced in the handler — a `type: "boolean"` schema (as
  `restoreBackupSchema` uses for JSON) would REJECT a valid multipart submission. The
  file is `{ type: "object" }` + a runtime `isImportUploadFile` guard.
- **Confirm is a strict schema enum, faithful to 484 (the route returns `validation_error`;
  the coded gate is defense-in-depth).** `confirm: { enum: ["true"] }` is the deliberate
  string-multipart mirror of 484's `restoreBackupSchema.confirm: { type: "boolean", enum:
  [true] }` + `required: ["confirm"]` (`backupSchemas.ts:19,21`). **Grounded in real
  source:** via the ROUTE this means an absent or `"false"` `confirm` is rejected by
  `validate(importBackupSchema, …)` as **`validation_error` (400)** — exactly as 484's own
  route rejects `body: { confirm: false }` with `validation_error` (verified:
  `tests/integration/routes/backups.test.ts:244-245`), NOT with
  `backup_restore_confirmation_required`. The handler/orchestrator gate `if (input.confirm
  !== true) throw "backup_restore_confirmation_required"` (§5.1) is therefore
  **defense-in-depth**: it is unreachable on the coerced route path (a passing schema forces
  `confirm === "true"`, so `body.confirm === "true"` is always `true`), but it fires when
  `importBackupFromUpload({ confirm: false, … })` is invoked **directly** — mirroring 484's
  own service-level gate at `backupService.ts:747`, which is likewise schema-shadowed on
  the route and exercised only by direct `restoreBackup({ confirm: false })` calls
  (`tests/unit/backups/backupService.test.ts:433-435`). Keeping the strict enum (NOT
  broadening it to `["true","false"]`) is what preserves true 484 parity; §5.7 and tests
  7/12 document BOTH the route path (`validation_error`) and the direct-call gate
  (`backup_restore_confirmation_required`).
- **Upload size ceiling (DoS guard) before the expensive decrypt/restore path.** The
  handler enforces `BACKUP_IMPORT_MAX_BYTES` (server-owned env, sane default 2 GiB,
  parsed by 05's own 2-arg local `parsePositiveIntEnv(value, fallback): number` — NOT the
  private 1-arg one in `backupService.ts:963`, see §5) **three ways** (mirroring
  `readCappedJson`, `publicAnalyticsApi.ts:67-75`): (a) reject when the declared
  `content-length` header exceeds `BACKUP_IMPORT_MAX_BYTES` (413 `backup_import_too_large`);
  (b) reject when `file.size` (the COMPRESSED upload) exceeds `BACKUP_IMPORT_MAX_BYTES`;
  (c) a streaming byte-counter in `spoolWithCeiling` aborts the decrypt/spool if the actual
  DECRYPTED+gunzipped tar bytes exceed the SEPARATE, higher
  `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` (chunked bodies omit content-length; this bounds a
  compression bomb that inflates past the decompressed ceiling **without** rejecting a
  legitimately large, system-produced backup that compresses under the upload ceiling — see
  §7 Q5, the scalability rationale). (a)/(b) cap the compressed upload; (c) caps the
  decompressed spool — three semantically distinct limits, two env vars, NOT one constant
  reused for compressed and decompressed sizes. Per-media-file ceiling stays 03's concern
  (`BACKUP_MEDIA_MAX_FILE_BYTES`). See §7 Q5 for the honest limitation on the *pre-parse*
  body size.
- **Decrypt + validate BEFORE any DB write (fail-closed, no partial restore).** PASS 1
  fully consumes the decrypt stream and validates manifest + every `tables/*` checksum +
  version handshake **before** PASS 2 opens the transaction. A wrong passphrase / tamper
  / truncation surfaces `backup_decrypt_failed` (02); a malformed/incompatible archive
  surfaces `backup_archive_unsupported` (02, or manifest version mismatch) or
  `backup_manifest_invalid` / `backup_checksum_mismatch` (05) or
  `backup_restore_invalid_artifact` (NDJSON reject-unknown) — in every case **zero rows
  are written**. This preserves TASK-484's "malformed artifact never opens the
  transaction" (`backupService.ts:752`).
- **Confirmation-gated, transactional, all-or-nothing.** Restore runs only when
  `confirm === true`. On the route, an absent/`"false"` `confirm` is rejected by the strict
  schema enum as `validation_error` (400) exactly as 484's route
  (`tests/integration/routes/backups.test.ts:244-245`); the coded
  `backup_restore_confirmation_required` (400) is the defense-in-depth orchestrator gate
  reachable via a direct `importBackupFromUpload` call, mirroring 484's service gate
  (`backupService.ts:747`). Either way, restore never proceeds without an explicit
  confirmation (see the dedicated confirm bullet above). Content tables + settings +
  (opt-in) users all run inside **one** outer
  `db.transaction`; any failure rolls the whole restore back. Media bytes are the only
  non-transactional step (object storage is not transactional — 03 §4.3's documented
  behavior) and run **after** the DB commit.
- **Non-database archive never wipes content (484 `database`-guard).** The content
  delete-all + re-insert runs ONLY when `manifest.include.includes("database")` (mirrors
  `if (artifact.database)` at `backupService.ts:631`). A settings-only / media-only /
  users-only `.cbk` (independently opt-in includes, parent decision 5) with `confirm:true`
  MUST NOT delete the 22 content tables. This is a HIGH-severity data-loss guard (§6 test
  15).
- **`"database"` include implies a COMPLETE table set (empty/partial manifest never wipes
  then re-inserts nothing).** §5.5 step 0 deletes ALL 22 content tables unconditionally when
  `include` contains `"database"` — BEFORE reading any member — so a crafted-but-authenticated
  `.cbk` with `include:["database"]` and an empty or partial `manifest.tables` would commit a
  transaction that wipes content and re-inserts nothing = silent full data loss. `validateManifest`
  (§5.3) therefore asserts exact round-trip completeness (manifest.tables' key set == the full
  `ARCHIVE_TABLE_DESCRIPTORS` key set, no missing/extra/dup) whenever `"database"` is declared,
  and PASS 1 (§5.4) rejects any extra physical `tables/*` member and any `tables/*`/`media/*`
  member present WITHOUT its include flag — all `backup_manifest_invalid`, all BEFORE the tx
  opens. This closes the symmetric fail-closed reconcile for the content/media sections (parity
  with the settings/users reconcile). Another HIGH-severity data-loss guard (§6 test 15b).
- **Secrets are backend-only.** The `passphrase` (and 02's derived key/salt/IV) exist
  only for the lifetime of the request; never logged (no `console.*` of the value), never
  persisted (no `backups` row, no audit metadata, no cache), never returned to the client,
  never placed in a thrown message. Audit metadata records **counts/booleans only**.
  `sanitizeBackupError` strips cwd/backup-dir from any surfaced error.
- **Users import is opt-in + no privilege escalation.** `restoreUsers` defaults `false`;
  even when the archive *contains* a users section, 05 restores it only when the caller
  explicitly opts in AND `confirm === true`, delegating to 04's `restoreUsersSectionTx`
  (permission re-validation against the catalog, upsert-by-pk — never delete-all, and the
  `no_admin` lockout guard → rollback). 05 adds no grants of its own.
- **Path/spool safety.** The decrypted tar is spooled under `os.tmpdir()` (overridable via
  backend-only `BACKUP_TMP_DIR`, same as 01), a `randomUUID()` directory + fixed
  `archive.tar` leaf (no archive-controlled name enters the FS path — no traversal),
  created `mode 0o700`, files `mode 0o600`, removed with `rm(dir, { recursive: true,
  force: true })` in a `finally` on every path. Media member key traversal is guarded by
  03 (`assertSafeMediaKey`); 05 never derives an FS path from an archive-controlled name.
- **Audit.** After a successful import:
  `logAudit({ actorId: ctx.user?.id ?? null, action: "backups.restore", targetType:
  "backup", targetId: "import", metadata: { source: "import", tablesRestored,
  rowsRestored, mediaRestored, usersRestored }, ip: ctx.ip, userAgent: ctx.userAgent })`
  — counts/booleans only, never a passphrase / email / hash / row value. `targetId` is
  the synthetic `"import"` (required non-null string, `auditService.ts:26`).
- **`mapBackupError` additions (05 is the sole writer of these `case`s):**
  - `backup_decrypt_failed` → **422** ("Wrong passphrase or the backup file is corrupt.")
  - `backup_archive_unsupported` → **422** ("Not a Coderso backup or an unsupported version.")
  - `backup_passphrase_required` → **400** ; `backup_passphrase_invalid` → **400**
  - `backup_import_too_large` → **413** ; `backup_import_invalid_file` → **400**
  - `backup_manifest_invalid` → **422** ; `backup_checksum_mismatch` → **422**
  - `backup_restore_fk_violation` → **422** — a residual Postgres 23503 remapped by §5.5 step 1's
    `isFkViolation` guard: a content row references a parent (e.g. a `users.id` author/creator)
    absent from BOTH the target DB and the archive — the cross-env / DR case of a
    `database`-including import WITHOUT `restoreUsers`. Without this `case`, `mapBackupError`'s
    `default:` returns `null` and `withBackupErrors` re-throws it as an unowned generic 500; 05 is
    the sole writer of this `case`. The whole tx still rolls back (no partial restore).
  - `backup_media_key_unsafe` → **422** ; `backup_media_write_failed` → **500** — 03 is
    the *thrower* (media restore helper) but adds **no route**, so 05 (sole writer of the
    import route + these `case`s) MUST map them, else `mapBackupError`'s `default:`
    returns `null` and `withBackupErrors` re-throws a raw error into a generic 500 with an
    unowned code (`backupRoutes.ts:120-131`). `backup_media_key_unsafe` (a crafted member
    key failing 03's `assertSafeMediaKey`) is bad **archive content** → 422;
    `backup_media_write_failed` (storage write error *after* the DB tx has committed — 03
    §4.3 / §5.7 explicitly does NOT roll back) is a server-side failure → 500. Both 03
    codes are already credential-free (03 §5.3).
  - `backup_restore_invalid_artifact` (→ **422**, NDJSON reject-unknown) and
    `backup_restore_confirmation_required` (→ **400**) already exist
    (`backupRoutes.ts:94,88`) — 05 REUSES them, does NOT re-add them (duplicate `switch`
    case would break region ownership).
  - 04's `backup_users_requires_encryption` / `_restore_no_admin` and 06's schedule codes
    are added by their owners; 05 does not duplicate those `case`s.

---

## 4. Owning module(s) — single-writer

**Create (owned solely by 05):**
- `core/services/backups/backupImport.ts` — the whole import pipeline:
  - `readTarMembers(stream): BackupArchiveReader` — the ustar **reader** seam
    (async-iterates `{ name, size, body }` members from the post-decrypt tar byte stream),
    matching 01's writer layout (01 §4.4). This is the concrete reader 03's
    `restoreMediaFromArchive` is wired against at integration time (§7 Q2).
  - `validateManifest(raw): ArchiveManifest` — strict reject-unknown + version handshake
    (§4.3).
  - per-table NDJSON `normalizeContentRow` reject-unknown parser + `reviveForInsert` (the
    tiny date-reviver, lock-step with `reviveRowsForInsert`, `backupService.ts:588`).
  - `validateArchive(tarPath): ArchiveManifest` — PASS 1 (§4.4).
  - `restoreArchiveStreamTx(tx, tarPath, manifest, opts)` — the streaming, batched,
    FK-safe transactional restore body (successor of `restoreArtifactTx`), reusing 01's
    `ARCHIVE_TABLE_DESCRIPTORS` for the table set/order, 484's `importConfigTx` for
    settings, and 04's `restoreUsersSectionTx` for users (§4.5). **Exported** so tests can
    drive it inside a rolled-back tx (§6 shared-DB seam).
  - `importBackupFromUpload(input): Promise<ImportResult>` — the orchestrator (guard →
    decrypt (02) → spool → PASS 1 validate → PASS 2 tx restore → media (03) → cleanup).
- `tests/unit/backups/backupImport.test.ts` — Bun lane (§6).

**Extend (05 is the sole writer of the added lines/region at land time):**
- `core/server/routes/backupRoutes.ts` — the `POST /backups/import` route, the §3
  `mapBackupError` `case` additions, and the local `RouteContext` `headers?` field (§2).
- `core/server/validation/backupSchemas.ts` — `importBackupSchema`.

**Do NOT touch:** `backupArchive.ts` (01), `backupCrypto.ts` (02), `mediaArchive.ts` +
storage adapters (03), `backupUsersSection.ts` (04), the existing restore internals in
`backupService.ts` (484), the admin UI/client/scheduler (06), `_docs/_TASKS/*` /
`_docs/_CHANGELOG/*` (07 only).

---

## 5. Implementation Pseudocode (execution-ready)

All in `core/services/backups/backupImport.ts` unless noted. Imports from siblings:

```ts
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { db } from "../../db/client";
import {
  ARCHIVE_TABLE_DESCRIPTORS, ARCHIVE_ARTIFACT_VERSION, ARCHIVE_SCHEMA_VERSION,
  MANIFEST_MEMBER_NAME, TABLE_MEMBER_DIR,
  SETTINGS_MEMBER_NAME, USERS_MEMBER_NAME, ROLES_MEMBER_NAME, USER_ROLES_MEMBER_NAME,
  type ArchiveManifest,
} from "./backupArchive";                                     // 01 (pinned names + descriptors)
import { decryptBackupArchive, normalizeBackupPassphrase } from "./backupCrypto"; // 02
import { restoreMediaFromArchive } from "./mediaArchive";     // 03
import {
  restoreUsersSectionTx,
  normalizeUserRow, normalizeRoleRow, normalizeUserRoleRow,
  type UserRow, type RoleRow, type UserRoleRow,
} from "./backupUsersSection";                                // 04 (tx helper + normalize*/row types)
import { importConfigTx } from "../tools/importExportService"; // 484 (exported :402)

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]; // = backupService.ts:62

const IMPORT_BATCH_SIZE = 5_000; // parent §decision 4 (5–10k window); insert batch on restore

// 05 defines its OWN local env parser. `parsePositiveIntEnv` in backupService.ts:963 is a
// PRIVATE const (not exported), 1-arg, returns `number | null` (no default). 05 must not
// edit backupService.ts (single-writer) and cannot import it. This 2-arg variant always
// returns a number:
const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const BACKUP_IMPORT_MAX_BYTES = parsePositiveIntEnv(process.env.BACKUP_IMPORT_MAX_BYTES, 2 * 1024 ** 3);

// Decrypted+gunzipped tar bytes get a SEPARATE, higher ceiling than the compressed
// upload (§7 Q5). BACKUP_IMPORT_MAX_BYTES caps the COMPRESSED .cbk (content-length +
// file.size); reusing it for the DECOMPRESSED spool would reject a legitimately large,
// system-produced backup that compresses under the upload ceiling but inflates past it on
// gunzip — which is the whole point of 511's gzip and directly conflicts with the parent's
// "scalable / multi-GB" mandate. The decompressed ceiling is its own env (default = 4× the
// upload ceiling) so it still bounds a compression bomb while admitting valid large backups.
const BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES = parsePositiveIntEnv(
  process.env.BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES, BACKUP_IMPORT_MAX_BYTES * 4);
```

### 5.1 Upload guard + orchestrator

```ts
export type ImportUploadFile = {
  name: string; type: string; size: number;
  stream(): ReadableStream<Uint8Array>;            // Web File shape from req.formData()
};

export type ImportBackupInput = {
  file: ImportUploadFile;
  passphrase: unknown;                             // normalized by 02
  confirm: boolean;
  restoreUsers?: boolean;                          // opt-in (default false)
  declaredContentLength?: number;                  // from the content-length header
};

export type ImportResult = {
  status: "restored";
  artifactVersion: number;
  tablesRestored: number;
  rowsRestored: number;
  usersRestored: number;
  mediaRestored: number;
  skippedMedia: number;
};

export async function importBackupFromUpload(input: ImportBackupInput): Promise<ImportResult> {
  // (a) Fail-closed gates BEFORE the expensive path.
  if (input.confirm !== true) throw new Error("backup_restore_confirmation_required");
  const passphrase = normalizeBackupPassphrase(input.passphrase); // 02: required/invalid codes
  if (!input.file || typeof input.file.stream !== "function") throw new Error("backup_import_invalid_file");
  if ((input.declaredContentLength ?? 0) > BACKUP_IMPORT_MAX_BYTES) throw new Error("backup_import_too_large");
  if (input.file.size > BACKUP_IMPORT_MAX_BYTES) throw new Error("backup_import_too_large");

  const tmpDir = path.join(process.env.BACKUP_TMP_DIR ?? os.tmpdir(), `coderso-import-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  const tarPath = path.join(tmpDir, "archive.tar");
  const cleanup = async () => { await rm(tmpDir, { recursive: true, force: true }); };

  try {
    // (b) DECRYPT (02): verifies every GCM frame + gunzips, yielding the plaintext tar
    //     byte stream. Spool it to disk O(1) memory with a hard byte ceiling.
    const plainTar = decryptBackupArchive(input.file.stream(), passphrase); // throws backup_decrypt_failed / backup_archive_unsupported
    await spoolWithCeiling(plainTar, tarPath, BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES); // decompressed ceiling (§7 Q5); throws backup_import_too_large

    // (c) PASS 1 — VALIDATE (no writes): manifest + version handshake + every
    //     tables/*.ndjson member checksum + rowCount. One sequential spool read.
    const manifest = await validateArchive(tarPath);

    // (d) PASS 2 — RESTORE in ONE tx (all-or-nothing). One sequential spool read.
    const dbResult = await db.transaction(async (tx) =>
      restoreArchiveStreamTx(tx, tarPath, manifest, { restoreUsers: input.restoreUsers === true, confirm: true }),
    );

    // (e) AFTER commit, OUTSIDE the tx — media bytes via 03 (non-transactional). One read.
    let media = { restored: 0, totalBytes: 0 };
    if (manifest.include.includes("media")) {
      media = await restoreMediaFromArchive(readTarMembers(fileStream(tarPath)));
    }
    return {
      status: "restored", artifactVersion: manifest.artifactVersion,
      tablesRestored: dbResult.tables, rowsRestored: dbResult.rows,
      usersRestored: dbResult.usersRestored, mediaRestored: media.restored, skippedMedia: 0,
    };
  } finally {
    await cleanup(); // always — success, throw, or abort
  }
}

// fileStream(tarPath): `createReadStream(tarPath)` adapted to AsyncIterable<Uint8Array>
// (a Node Readable is already async-iterable). Used by readTarMembers.
function fileStream(tarPath: string): AsyncIterable<Uint8Array> {
  return createReadStream(tarPath) as unknown as AsyncIterable<Uint8Array>;
}
```

`spoolWithCeiling(stream, filePath, maxBytes)`: open `open(filePath,"w",0o600)`, pull the
Web `ReadableStream` reader, `fh.write` each chunk, sum bytes; if the running total
exceeds `maxBytes`, `reader.cancel()` + `throw new Error("backup_import_too_large")`; on a
decrypt error the reader rejects and it propagates (→ `backup_decrypt_failed` /
`backup_archive_unsupported`). Never buffers the whole archive.

### 5.2 The ustar reader seam (reverse of 01 §4.4)

```ts
export type ArchiveMemberEntry = { name: string; size: number; body: AsyncIterable<Uint8Array> };
export type BackupArchiveReader = { entries(): AsyncIterable<ArchiveMemberEntry> };

// Parse the tar byte stream member-by-member using 01's fixed ustar layout:
// 512-byte header, name @0 (<100B, NUL-terminated), octal size @124 (11B), typeflag @156
// ('0' or '\0' = regular file), body NUL-padded up to a 512 boundary, EOF = two zero
// blocks. Bodies STREAM (each `body` yields exactly `size` bytes, never buffered whole).
// Validate the header checksum (offset 148) + typeflag; a bad header on an otherwise
// decryptable tar => throw backup_manifest_invalid (fail closed). The consumer MUST fully
// drain each member's body before advancing (documented; validateArchive/restore do).
export function readTarMembers(stream: AsyncIterable<Uint8Array>): BackupArchiveReader {
  return { async *entries() {
    // rolling buffer over the byte stream; per member: read 512 header → parse name+size
    // → verify checksum/typeflag → yield { name, size, body: <exactly size bytes> } →
    // consume padding to the next 512 boundary. Stop on two consecutive zero blocks.
  } };
}
```

The `ArchiveMemberEntry` shape (`{ name; size; body: AsyncIterable<Uint8Array> }`) is
byte-for-byte the structural type 03's `restoreMediaFromArchive` reader expects (03 §4.3);
05's concrete `readTarMembers` satisfies it with no cross-import (§7 Q2).

### 5.3 Manifest validator (strict reject-unknown + version handshake)

```ts
const MANIFEST_TOP_KEYS = new Set(["artifactVersion","schemaVersion","engineVersion",
  "createdAt","include","tables","media","users"]);              // media/users optional (03/04)
const MANIFEST_TABLE_KEYS = new Set(["key","member","rowCount","byteSize","sha256"]);
const INCLUDE_ALLOWLIST = new Set(["database","media","settings","users"]); // matches 04's enum

function validateManifest(raw: string): ArchiveManifest {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new Error("backup_manifest_invalid"); }
  if (!isPlainObject(json)) throw new Error("backup_manifest_invalid");
  for (const k of Object.keys(json)) if (!MANIFEST_TOP_KEYS.has(k)) throw new Error("backup_manifest_invalid");
  // Version handshake: a v1 .json artifact (version 1) or a future v3 → unsupported, NOT
  // "invalid" (distinct so import UX can say "unsupported version" vs "corrupt file").
  if (json.artifactVersion !== ARCHIVE_ARTIFACT_VERSION) throw new Error("backup_archive_unsupported");
  if (json.schemaVersion !== ARCHIVE_SCHEMA_VERSION) throw new Error("backup_archive_unsupported");
  if (!Array.isArray(json.tables)) throw new Error("backup_manifest_invalid");
  for (const t of json.tables) {
    if (!isPlainObject(t)) throw new Error("backup_manifest_invalid");
    for (const k of Object.keys(t)) if (!MANIFEST_TABLE_KEYS.has(k)) throw new Error("backup_manifest_invalid");
    if (typeof t.key !== "string") throw new Error("backup_manifest_invalid");
  }
  if (!Array.isArray(json.include) || json.include.some((x) => !INCLUDE_ALLOWLIST.has(x)))
    throw new Error("backup_manifest_invalid");

  // DATABASE-SECTION COMPLETENESS (fail-closed data-loss guard, §3 test 15b). §5.5 step 0
  // deletes ALL 22 content tables unconditionally when include contains "database" — BEFORE
  // reading any table member — so a crafted-but-authenticated .cbk with include:["database"]
  // and an empty/partial manifest.tables would commit a tx that wipes content and re-inserts
  // nothing = silent full data loss. Assert exact round-trip completeness: when "database"
  // is declared, manifest.tables' key set MUST equal ARCHIVE_TABLE_DESCRIPTORS' key set
  // (no missing, no extra); when "database" is NOT declared, manifest.tables MUST be empty
  // (a content table listed without the flag is a mismatch). Symmetric with the settings/
  // users/media include<->member reconciles (§5.5, §5.4) — NEVER silently partial.
  const includeDb = json.include.includes("database");
  const manifestTableKeys = new Set(json.tables.map((t) => t.key as string));
  const descriptorKeys = new Set(ARCHIVE_TABLE_DESCRIPTORS.map((d) => d.key));
  if (includeDb) {
    if (manifestTableKeys.size !== json.tables.length) throw new Error("backup_manifest_invalid"); // dup key
    if (manifestTableKeys.size !== descriptorKeys.size
      || [...descriptorKeys].some((k) => !manifestTableKeys.has(k)))
      throw new Error("backup_manifest_invalid"); // incomplete / extra content table
  } else if (json.tables.length > 0) {
    throw new Error("backup_manifest_invalid"); // content tables listed without "database"
  }
  return json as ArchiveManifest;
}
```

### 5.4 PASS 1 — validate every content member against the manifest (no writes)

```ts
// One sequential spool read. manifest.json MUST be the FIRST member (01 §4.6a guarantee).
// For each tables/<key>.ndjson member recompute SHA-256 + line count and assert they equal
// manifest.tables[].{ sha256, rowCount }. Mismatch => backup_checksum_mismatch.
async function validateArchive(tarPath: string): Promise<ArchiveManifest> {
  const reader = readTarMembers(fileStream(tarPath));
  let manifest: ArchiveManifest | null = null;
  const seen = new Map<string, { sha256: string; rowCount: number }>();
  let sawContentMember = false;
  let sawMediaMember = false;
  for await (const entry of reader.entries()) {
    if (entry.name === MANIFEST_MEMBER_NAME) {
      if (manifest || seen.size > 0) throw new Error("backup_manifest_invalid"); // dup / not first
      manifest = validateManifest(await collectText(entry.body));
      continue;
    }
    if (!manifest) throw new Error("backup_manifest_invalid");                    // member before manifest
    if (entry.name.startsWith(`${TABLE_MEMBER_DIR}/`)) {
      sawContentMember = true;
      const hash = createHash("sha256"); let rows = 0;
      for await (const chunk of entry.body) { hash.update(chunk); rows += countNewlines(chunk); }
      seen.set(entry.name, { sha256: hash.digest("hex"), rowCount: rows });
    } else {
      if (entry.name.startsWith("media/")) sawMediaMember = true; // 01/03 media dir prefix
      // Section members (settings.json, users/roles/user_roles.ndjson, media/*) are NOT
      // sha256-listed in the manifest (it carries per-member sha256 ONLY for the content
      // `tables/` set; users/media carry COUNTS). Their byte integrity is fully covered by
      // 02's per-frame GCM auth (a clean decrypt = every byte authenticated). Drain the
      // body to advance the tar cursor; no checksum step here.
      for await (const _ of entry.body) { /* drain */ }
    }
  }
  if (!manifest) throw new Error("backup_manifest_invalid");

  // Content member <-> include reconcile (fail-closed, §3 data-loss guard, symmetric with
  // the settings/users reconcile in §5.5). A tables/* member present WITHOUT "database" in
  // include would otherwise be silently ignored (its rows never restored, yet §5.5's
  // delete-all does not run) — reject it. When "database" IS declared, validateManifest
  // already forced manifest.tables to equal the full descriptor set; here also assert no
  // EXTRA physical content member exists beyond that set (seen.size === manifest.tables
  // length), so an attacker cannot smuggle an unlisted tables/* member.
  const includeDb = manifest.include.includes("database");
  if (!includeDb && sawContentMember) throw new Error("backup_manifest_invalid");
  if (includeDb && seen.size !== manifest.tables.length) throw new Error("backup_manifest_invalid");

  // Media member <-> include reconcile: a media/* member present WITHOUT "media" in include
  // would be silently dropped (step e only restores when include has "media") — reject it.
  if (!manifest.include.includes("media") && sawMediaMember) throw new Error("backup_manifest_invalid");

  for (const t of manifest.tables) {
    const got = seen.get(t.member);
    if (!got || got.sha256 !== t.sha256 || got.rowCount !== t.rowCount)
      throw new Error("backup_checksum_mismatch");
  }
  return manifest;
}
```

### 5.5 PASS 2 — batched, FK-safe, transactional restore (single sequential spool pass)

```ts
export async function restoreArchiveStreamTx(
  tx: DbTransaction, tarPath: string, manifest: ArchiveManifest,
  opts: { restoreUsers: boolean; confirm: boolean },
): Promise<{ tables: number; rows: number; usersRestored: number }> {
  const includeDb = manifest.include.includes("database");
  const memberByKey = new Map(manifest.tables.map((t) => [t.member, t.key]));
  const descByKey = new Map(ARCHIVE_TABLE_DESCRIPTORS.map((d) => [d.key, d]));

  // 0) 484 DATABASE-GUARD (HIGH data-loss guard, §3): the reverse-delete of the 22 content
  //    tables runs ONLY when this archive carries a database section — mirrors
  //    `if (artifact.database)` (backupService.ts:631). A settings-/media-/users-only .cbk
  //    must NEVER wipe content (test 15).
  if (includeDb) {
    // FK-safe reverse-delete (children -> parents), reusing 01's ARCHIVE_TABLE_DESCRIPTORS
    // (mirrors snapshotTableOrder / replaceSnapshotTables:574). Runs FIRST — no member read.
    for (const desc of [...ARCHIVE_TABLE_DESCRIPTORS].reverse()) await tx.delete(desc.table);
  }

  const includeUsers = manifest.include.includes("users");
  let usersRestored = 0;

  // 0.5) FK-SAFE USERS PRE-RESTORE (upsert users BEFORE any content insert) — *** HIGH FK-ordering
  //   fix (cross-env / DR restore). *** The 22 content tables carry NOT-relaxable FK references to
  //   `users.id` that Postgres checks AT INSERT: pages.author_id (pages.ts:29), posts.author_id
  //   (posts.ts:27), media.created_by (media.ts:63), page_revisions.created_by (pages.ts:73),
  //   content_entries.author_id (content.ts:39) — among others. An `onDelete: "set null"` does NOT
  //   relax the INSERT check, and NO
  //   constraint is DEFERRABLE, so a content row whose author/creator user is ABSENT fails Postgres
  //   23503 at insert time. In a SAME-env restore the referenced users are never deleted (step 0
  //   deletes content, NOT users) so they still exist and content inserts succeed — which MASKS the
  //   bug. In the CROSS-ENV / DR case 04 targets (a `database`+`users` archive restored into an env
  //   that lacks those users), restoring users AFTER content (as the earlier single-pass draft did,
  //   at function end) makes every content insert 23503 FIRST and the whole tx roll back with an
  //   otherwise-unmapped 500. Fix: upsert the users section HERE — after content-delete (step 0),
  //   before content insert (step 1) — so parent rows always exist for the FK. 01 emits the users
  //   members LAST (§4.6a), so they are unreachable in the forward content pass before the inserts;
  //   we therefore do a DEDICATED spool scan (ONE extra sequential read, ONLY on the opt-in
  //   includeUsers && restoreUsers path) to collect the three members, cross-check counts, and call
  //   04's UPSERT-by-pk restoreUsersSectionTx (never delete-all → upserting before content is safe)
  //   inside the SAME outer tx. Reconcile (§7 Q6): 01 emit order is UNCHANGED (this pre-scan absorbs
  //   the "users last" layout — no need to make 01 emit users first); 04's restoreUsersSectionTx is
  //   upsert-by-pk + admin-lockout-guarded, hence order-independent and safe to run before content.
  if (includeUsers && opts.restoreUsers) {
    const pre = { users: [] as UserRow[], roles: [] as RoleRow[], userRoles: [] as UserRoleRow[] };
    let sawUsersPre = false;
    for await (const entry of readTarMembers(fileStream(tarPath)).entries()) {
      if (entry.name === USERS_MEMBER_NAME || entry.name === ROLES_MEMBER_NAME || entry.name === USER_ROLES_MEMBER_NAME) {
        sawUsersPre = true;
        const lines = await collectLines(entry.body); // bounded owner-scoped exception (parent §decision 4)
        if (entry.name === USERS_MEMBER_NAME) pre.users = lines.map(normalizeUserRow);
        else if (entry.name === ROLES_MEMBER_NAME) pre.roles = lines.map(normalizeRoleRow);
        else pre.userRoles = lines.map(normalizeUserRoleRow);
      } else {
        for await (const _ of entry.body) { /* drain to advance the tar cursor */ }
      }
    }
    // Declared users but NO member, or a member-name drift yielding the wrong count => fail-closed
    // BEFORE the upsert (this is the count cross-check that used to live at function end, moved here
    // so it still runs pre-write in the FK-safe ordering).
    if (!sawUsersPre) throw new Error("backup_manifest_invalid");
    const mu = manifest.users;
    if (mu && (mu.users !== pre.users.length || mu.roles !== pre.roles.length
      || mu.userRoles !== pre.userRoles.length)) throw new Error("backup_manifest_invalid");
    const r = await restoreUsersSectionTx(tx, pre, { restoreUsers: true, confirm: opts.confirm });
    usersRestored = r.usersRestored;
  }

  // SINGLE sequential pass over the spool (scalability directive): dispatch each member to
  // its handler in the order 01 emits them (§4.6a: manifest → tables (FK-safe order) →
  // settings → media → users). This equals the FK-safe INSERT order, so parent refs always
  // resolve. Locating a named member in an un-indexed tar is O(scan); calling one helper
  // per table (24×) would re-scan ~24× — O(tables × archiveSize). One pass keeps it O(size),
  // memory O(IMPORT_BATCH_SIZE). Total spool reads across the import = PASS 1 + PASS 2 +
  // one media pass (step e) = 3 (plus ONE extra users pre-scan only on the opt-in restoreUsers
  // path — step 0.5), not ~26.
  let rows = 0, tables = 0;
  let sawUsersMember = false;
  let sawSettingsMember = false;

  for await (const entry of readTarMembers(fileStream(tarPath)).entries()) {
    if (entry.name === MANIFEST_MEMBER_NAME) { for await (const _ of entry.body) {} continue; }

    // (1) content tables/<key>.ndjson — batched insert into the FK-safe descriptor.
    if (includeDb && entry.name.startsWith(`${TABLE_MEMBER_DIR}/`)) {
      const key = memberByKey.get(entry.name);
      const desc = key ? descByKey.get(key) : undefined;
      if (!desc) { for await (const _ of entry.body) {} continue; } // unknown member: skip body
      tables += 1;
      for await (const batch of ndjsonLineBatches(entry.body, IMPORT_BATCH_SIZE)) {
        const revived = reviveForInsert(desc.table, batch.map((l) => normalizeContentRow(desc.key, l)));
        if (revived.length) {
          try {
            await tx.insert(desc.table).values(revived as never);
          } catch (error) {
            // Residual FK violation (Postgres 23503): a content row references a parent — e.g. a
            // `users.id` author/creator — absent from BOTH the target DB and this archive. The
            // includeUsers && restoreUsers path avoids this via the step 0.5 pre-restore; the
            // residual case is a cross-env `database`-including import WITHOUT restoreUsers (or a
            // non-users parent gap). Map it to a coded error so it surfaces as a clear 422, not an
            // unmapped generic 500 — the whole tx still rolls back (all-or-nothing).
            if (isFkViolation(error)) throw new Error("backup_restore_fk_violation");
            throw error;
          }
        }
        rows += revived.length;
      }
      continue;
    }

    // (2) settings.json — 484's tx-aware importer inside the SAME tx (validateBundle + setSettingsTx).
    if (entry.name === SETTINGS_MEMBER_NAME) {
      sawSettingsMember = true;
      if (manifest.include.includes("settings")) {
        const bundle = JSON.parse(await collectText(entry.body)); // importConfigTx runs validateBundle
        await importConfigTx(tx, bundle);
      } else { for await (const _ of entry.body) {} }             // present-but-not-declared -> fail-closed mismatch below
      continue;
    }

    // (3) users/roles/user_roles.ndjson — the ACTUAL users upsert already ran in the FK-safe
    //     pre-restore (step 0.5) BEFORE any content insert; here we only DRAIN the member to
    //     advance the tar cursor and record its presence (sawUsersMember) for the include↔member
    //     consistency check below. Detection runs for BOTH restoreUsers=true and =false so a
    //     present-but-undeclared (or declared-but-absent) users member is always caught by the
    //     fail-closed check after the loop. BOUNDED OWNER-SCOPED MEMORY EXCEPTION (parent
    //     §"Confirmed design decisions" 4, lines 118–123): the three users members are fully
    //     materialized (in step 0.5) via `collectLines` into `UserRow[]/RoleRow[]/UserRoleRow[]`
    //     because 04's `restoreUsersSectionTx` needs the WHOLE archived set before any write for
    //     its fail-closed guards — natural-key (email/role-name) collision detection (04 §4.3
    //     step 0), user_roles reconcile + FK-missing-roleId guard (step 3/3a), and the global
    //     admin-lockout guard (step 4) — none of which is evaluable over a bounded window inside
    //     the single poison-on-error outer tx. This is the parent-sanctioned exception (owned +
    //     justified in 04 §4.3, re-stated at closure in 07 §4), NOT a silent OOM regression: it is
    //     scoped to the OPT-IN, encrypted-only users section only; export still keyset-streams
    //     these members (04 §4.2).
    if (entry.name === USERS_MEMBER_NAME || entry.name === ROLES_MEMBER_NAME || entry.name === USER_ROLES_MEMBER_NAME) {
      sawUsersMember = true;
      for await (const _ of entry.body) { /* drain — upsert happened in step 0.5 (FK-safe) */ }
      continue;
    }

    // media/* handled post-commit (step e); manifest/settings mismatch checks below. Drain.
    for await (const _ of entry.body) {}
  }

  // Include ↔ member consistency (fail-closed, §7 Q1): a section member present without its
  // include flag, OR an include flag with no matching member, is a manifest/content
  // mismatch → backup_manifest_invalid. NEVER silently drained/ignored. FULLY SYMMETRIC
  // across ALL four sections: the database/content set (round-trip completeness in §5.3
  // validateManifest + no tables/* member without "database" in §5.4 PASS 1) and media
  // (no media/* member without "media" in §5.4 PASS 1) are reconciled BEFORE the tx opens;
  // settings and users are reconciled HERE (the settings branch above drained a present-
  // but-undeclared member; the users branch buffered one — both reconciled BEFORE any
  // upsert/commit). No section can be silently wiped, dropped, or drained.
  const includeSettings = manifest.include.includes("settings");
  if (includeSettings !== sawSettingsMember) throw new Error("backup_manifest_invalid");
  // `includeUsers` was defined at the top (step 0.5). The users UPSERT + its count cross-check
  // already ran there (FK-safe, BEFORE content insert); here we only reconcile member presence.
  // When restoreUsers=false the users member (if any) was drained in the loop and this check still
  // validates its presence — so a mismatch is caught even when no upsert happened.
  if (includeUsers !== sawUsersMember) throw new Error("backup_manifest_invalid");

  return { tables, rows, usersRestored };
}
```

Helpers (all local to `backupImport.ts`):
- `normalizeContentRow(key, rawLine)`: `JSON.parse` the NDJSON line, assert
  `isPlainObject`, reject-unknown against that table's column keys
  (`Object.keys(getTableColumns(desc.table))`), throw `backup_restore_invalid_artifact`
  on any violation (mirrors `parseBackupArtifact`'s fail-closed posture,
  `backupService.ts:686`).
- `reviveForInsert(table, rows)`: identical to `reviveRowsForInsert`
  (`backupService.ts:588`) — a `date`-dataType string → `new Date` via
  `getTableColumns(table)` (`:592`); jsonb/uuid/text/numeric round-trip verbatim.
- `isFkViolation(error)`: narrow a thrown DB error to a Postgres foreign-key violation
  (SQLSTATE `23503`) so §5.5 step 1 can remap it to the coded `backup_restore_fk_violation`
  (→ 422) instead of leaking a raw 500. The postgres-js driver surfaces the SQLSTATE on
  `error.code` (and drizzle re-wraps it on `error.cause`), so the guard is
  `(e): boolean => typeof e === "object" && e !== null && (('code' in e && (e as { code?: unknown }).code === "23503") || ('cause' in e && (e as { cause?: { code?: unknown } }).cause?.code === "23503"))`.
  It never surfaces the underlying message (no row value / email / hash leaks — the coded
  error is credential-free).
- `ndjsonLineBatches(body, n)`: stream the member body, split on `\n`, yield arrays of ≤ n
  **raw string lines (NOT JSON-parsed)** (bounded memory) — `normalizeContentRow` remains the
  single `JSON.parse` + reject-unknown seam over each raw line (parallel to
  `collectLines`→strings→`normalizeUserRow`); `collectLines(body)` fully materializes the users NDJSON
  members per the §5.5 bounded owner-scoped exception (NOT because they are "small"), and
  `collectText(body)` reads the single settings bundle. `countNewlines(chunk)` for PASS 1
  row counts.
- `normalizeUserRow` / `normalizeRoleRow` / `normalizeUserRoleRow`: **04's exported
  parsers** if 04 exports them; otherwise 05 parses the raw lines and hands typed arrays to
  04's `restoreUsersSectionTx` (see §7 Q4). `UserRow`/`RoleRow`/`UserRoleRow` types come
  from 04.

### 5.6 Route + schema (05 extends)

`core/server/validation/backupSchemas.ts` (append; keep every existing schema byte-identical):

```ts
export const importBackupSchema = {
  type: "object",
  additionalProperties: false,
  required: ["file", "passphrase", "confirm"],
  properties: {
    file: { type: "object" },                          // Web File/Blob (multipart) — mirrors mediaUploadSchema
    passphrase: { type: "string", minLength: 1 },      // policy enforced by 02's normalizeBackupPassphrase
    confirm: { type: "string", enum: ["true"] },       // multipart scalar => STRING, not boolean
    restoreUsers: { type: "string", enum: ["true", "false"] },
  },
};
```

`core/server/routes/backupRoutes.ts` — add `headers?` to the local `RouteContext` (§2),
add the import imports, register the route inside `registerBackupRoutes`, add the §3
`mapBackupError` cases, and a local `isImportUploadFile` guard:

```ts
// local guard — checks the STREAMING shape (Web File.stream), not the media arrayBuffer shape
const isImportUploadFile = (v: unknown): v is ImportUploadFile =>
  !!v && typeof v === "object" &&
  typeof (v as ImportUploadFile).name === "string" &&
  typeof (v as ImportUploadFile).type === "string" &&
  typeof (v as ImportUploadFile).size === "number" &&
  typeof (v as ImportUploadFile).stream === "function";

router.post("/backups/import", requirePermission("backups:write"), async (ctx) => {
  return withBackupErrors(async () => {
    validate(importBackupSchema, ctx.body ?? {});
    const body = (ctx.body ?? {}) as { file?: unknown; passphrase?: unknown;
      confirm?: string; restoreUsers?: string };
    if (!isImportUploadFile(body.file)) throw new Error("backup_import_invalid_file");
    const declared = Number(ctx.headers?.["content-length"]);
    const result = await importBackupFromUpload({
      file: body.file,
      passphrase: body.passphrase,
      confirm: body.confirm === "true",
      restoreUsers: body.restoreUsers === "true",
      declaredContentLength: Number.isFinite(declared) ? declared : undefined,
    });
    await logAudit({
      actorId: ctx.user?.id ?? null, action: "backups.restore", targetType: "backup",
      targetId: "import", // AuditEvent.targetId is a required non-null string (auditService.ts:26)
      metadata: { source: "import", tablesRestored: result.tablesRestored,
        rowsRestored: result.rowsRestored, mediaRestored: result.mediaRestored,
        usersRestored: result.usersRestored }, // counts only — never passphrase/PII
      ip: ctx.ip, userAgent: ctx.userAgent,
    });
    return result;
  });
});
```

`withBackupErrors` (`backupRoutes.ts:125`) already funnels uncoded throws through
`mapBackupError` → `ApiError`; the §3 `case` additions complete the allowlist.

### 5.7 Error handling summary

| Situation | Code | Status |
|-----------|------|--------|
| confirm absent/`"false"` **on the route** (strict schema enum, mirrors 484 :19,21) | `validation_error` (schema) | 400 |
| `confirm !== true` on a **direct** `importBackupFromUpload` call (defense-in-depth gate) | `backup_restore_confirmation_required` (existing :88) | 400 |
| missing/invalid file part | `backup_import_invalid_file` | 400 |
| declared `content-length` / `file.size` over `BACKUP_IMPORT_MAX_BYTES` (compressed) OR decrypted spool bytes over `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` | `backup_import_too_large` | 413 |
| empty/short/too-long passphrase | `backup_passphrase_required` / `_invalid` (02) | 400 |
| wrong passphrase / tamper / truncation / reorder | `backup_decrypt_failed` (02) | 422 |
| not a `.cbk` / bad header / unsupported artifact|schema version | `backup_archive_unsupported` (02 / manifest) | 422 |
| malformed manifest / member order / bad tar header | `backup_manifest_invalid` | 422 |
| member checksum or rowCount mismatch | `backup_checksum_mismatch` | 422 |
| NDJSON row unknown-key / missing-notNull / bad-type | `backup_restore_invalid_artifact` (existing :94) | 422 |
| users restore leaves zero admins | `backup_users_restore_no_admin` (04) | 409 |
| crafted media member key fails traversal guard | `backup_media_key_unsafe` (03) | 422 |
| media byte write fails (post-commit, no rollback) | `backup_media_write_failed` (03) | 500 |
| content row FK parent (e.g. `users.id`) absent in target + archive (cross-env `database` import, no `restoreUsers`) | `backup_restore_fk_violation` (23503 remapped, §5.5 step 1) | 422 |
| any DB error mid-restore | rolls back (tx); surfaced sanitized | 500 |

No error message ever contains the passphrase, key, salt, a row value, an email, or a
hash. Every path runs `cleanup()` in `finally`.

---

## 6. Testing Requirements

**Lane: Bun** (`bun test tests/unit/backups/backupImport.test.ts`). Rationale (AGENTS.md
lane rules + MEMORY "Typecheck scope gotcha"): decrypt/streaming, `node:fs` spool,
`node:crypto` checksums, tar parsing, DB writes, and tx rollback are all runtime/Bun paths
— **not** Vitest (Vitest is only for genuinely Bun-free pure logic). Mirror the existing
Bun harness in `tests/unit/backups/backupService.test.ts` (`import … from "bun:test"`,
`db` from `../../../core/db/client`). Also run root `tsc -p tsconfig.json --noEmit` after
the new route/schema signatures (core-only `lint:types` misses `tests/` excess-prop
errors). A route-integration case may extend `tests/integration/routes/backups.test.ts`.

**Shared REMOTE test-DB safety (parent §Coordination — render.com `DATABASE_URL`):** NEVER
truncate shared tables, never commit a destructive restore. Every restore assertion that
mutates shared DB rows runs inside a **deliberately rolled-back transaction** —
`restoreArchiveStreamTx(tx, …)` is exported precisely so a test drives it inside
`db.transaction` and `throw`s to roll back.

**Critical: `importBackupFromUpload` COMMITS its inner `db.transaction`, so its
`database`- or `settings`-including path is DESTRUCTIVE to shared state and MUST NEVER be
committed against the shared DB.** §5.5 step 0 performs an **unscoped delete-all** of all
22 content tables (`if (includeDb) { for (const desc of [...ARCHIVE_TABLE_DESCRIPTORS]
.reverse()) await tx.delete(desc.table); }` — no `.where()`, mirroring
`replaceSnapshotTables`, `backupService.ts:608`) whenever `include` contains `"database"`,
and `importConfigTx` overwrites global settings via `setSettingsTx` and deletes menus
absent from the bundle (`importExportService.ts:410,424`) whenever `include` contains
`"settings"`. A committed round-trip of either therefore does **NOT** "touch only owned
rows" — it wipes/overwrites shared rows. Accordingly:
- **Every `database`-including AND every `settings`-including round-trip is driven
  EXCLUSIVELY through the exported `restoreArchiveStreamTx(tx, …)` seam inside a
  deliberately rolled-back `db.transaction`** (scenario 1's posture) — never through the
  committing `importBackupFromUpload`.
- **The committing `importBackupFromUpload` is exercised only where it cannot wipe or
  overwrite shared state:** (a) its zero-write guard/error paths — confirm-gate,
  wrong-passphrase, oversize/ceiling, bad manifest/checksum/version — which reject BEFORE
  the transaction opens (scenarios 2, 3, 4, 5, 7, 8); (b) a **media-only** `.cbk` (object
  storage, non-transactional, no content-table or settings write; the written keys are a
  uniquely-scoped `t511-05-<uuid>` prefix cleaned in `finally`); and (c) a **users-only**
  `.cbk` built from uniquely-scoped seeded rows (`04`'s `restoreUsersSectionTx` is
  **upsert-by-pk, never delete-all** — a committed round-trip over `t511-05-<uuid>`-scoped
  user/role/userRole ids touches only those owned rows, deleted in `finally`).
- Seeded fixtures use `t511-05-<uuid>` markers; FK-leaf tables (`redirects`, `pages`,
  `postPreviewTokens`) + one composite junction (`postTermAssignments`) seed the rolled-back
  `restoreArchiveStreamTx` round-trip. Crypto/tar/manifest cases are hermetic (no DB).

**Regression-test shapes (each a distinct real-flow scenario, per MEMORY "Smoke: five
scenarios per area"):**

1. **Full round-trip (encrypt → import restore, rolled-back tx).** Seed scoped rows across
   ≥3 content tables incl. one composite-PK junction → `packDatabaseArchive` (01) →
   `encryptBackupArchive` (02) → feed the `.cbk` bytes as an `ImportUploadFile` (a
   `File`/`Blob` over the buffer) → drive `restoreArchiveStreamTx` inside a rolled-back tx
   after `validateArchive` → assert every seeded row is re-inserted field-equal (Date→ISO
   tolerated), PASS 1 accepted the manifest + checksums.
2. **Wrong passphrase fails closed, zero writes.** Encrypt with pass A, import with pass B
   → rejects `backup_decrypt_failed`; assert a spy on `tx.insert`/`tx.delete` was **never**
   called (no transaction opened).
3. **Tampered / truncated archive.** Flip one ciphertext byte / drop the final frame →
   `backup_decrypt_failed`; no write.
4. **Version/format handshake.** A v1 `.json` artifact (`artifactVersion: 1`) or
   `artifactVersion: 3`, or a non-`.cbk` blob → `backup_archive_unsupported`.
5. **Checksum mismatch.** Corrupt one `tables/*.ndjson` byte inside an otherwise valid
   (re-encrypted) tar → PASS 1 throws `backup_checksum_mismatch` **before** PASS 2; no write.
6. **Reject-unknown manifest + NDJSON + include↔member mismatch (fail-closed, §7 Q1).**
   Manifest with an extra top-level key → `backup_manifest_invalid`; an NDJSON row with an
   unknown column / missing notNull → `backup_restore_invalid_artifact`; a `settings.json`
   member present with `"settings"` **absent** from `include` (and the reverse: `"settings"`
   in `include` with no member) → `backup_manifest_invalid`; symmetrically a users member
   present with `"users"` absent from `include` (or vice-versa) → `backup_manifest_invalid`
   — all before any write (assert no `tx.insert`/`importConfigTx`/`restoreUsersSectionTx`).
7. **Confirm gate (two layers — both asserted).** (a) **Direct-call defense-in-depth:**
   `importBackupFromUpload({ confirm: false, … })` (the orchestrator, bypassing the schema)
   → `backup_restore_confirmation_required` with **no decrypt or DB writes** (spy on
   `tx.insert`/`tx.delete` never called; `decryptBackupArchive` not invoked). (b)
   **Route/schema layer:** the strict `confirm: { enum: ["true"] }` means an absent/`"false"`
   `confirm` on the route is rejected by `validate(importBackupSchema, …)` as
   `validation_error` (400) BEFORE the handler runs — mirroring 484's route
   (`tests/integration/routes/backups.test.ts:244-245`); this route-path assertion is
   covered by test 12. Both layers guarantee restore never proceeds unconfirmed.
8. **Size ceiling (two distinct limits).** `declaredContentLength`/`file.size` (COMPRESSED)
   over `BACKUP_IMPORT_MAX_BYTES` → `backup_import_too_large` before decrypt; a decrypted tar
   whose gunzipped bytes exceed the SEPARATE `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` aborts in
   `spoolWithCeiling` (compression-bomb guard); AND a valid backup whose decompressed size is
   between the two ceilings (compresses under the upload cap, inflates over it) is ACCEPTED —
   proving the compressed/decompressed limits are not conflated (§7 Q5 scalability).
9. **Opt-in users hand-off.** Archive containing a users section: `restoreUsers:false` ⇒
   04's helper is not invoked (users untouched); `restoreUsers:true, confirm:true` ⇒
   `restoreUsersSectionTx` is called inside the SAME tx; a no-admin users archive ⇒
   `backup_users_restore_no_admin` rolls the WHOLE import back (content too). Assert the
   three PINNED member names (`USERS_MEMBER_NAME`/`ROLES_MEMBER_NAME`/`USER_ROLES_MEMBER_NAME`)
   are read (round-trip from 04's writer names) AND that a `manifest.users` count
   disagreeing with the parsed member rows (renamed/absent member yielding 0 rows) throws
   `backup_manifest_invalid` BEFORE any upsert.
10. **Media hand-off ordering.** With `include` containing `media`, `restoreMediaFromArchive`
    is called **after** the DB tx commits and **outside** it (assert call order via spies);
    a media write failure surfaces `backup_media_write_failed` (03) without rolling back the
    committed DB restore; a crafted `media/../..` member key → `backup_media_key_unsafe`.
11. **Tar reader ↔ writer round-trip (drift guard).** `readTarMembers(tarPack(...))` (01's
    writer) yields the same members/names/sizes/bytes; `manifest.json` is the FIRST member;
    a bad ustar header/checksum → `backup_manifest_invalid`.
12. **Allowlist round-trip (contract-bar).** `importBackupSchema` accepts a valid multipart
    payload (strings for `confirm`/`restoreUsers`) and rejects an unknown field / a
    `confirm` other than `"true"` (absent or `"false"`) — each surfacing `validation_error`
    (400) at the schema, mirroring 484's `restoreBackupSchema` route rejection
    (`tests/integration/routes/backups.test.ts:244-245`); every `mapBackupError` code added
    here maps to the documented status.
13. **No-secret-leakage.** Assert no thrown `.message`, audit metadata, or (spied)
    `console.*` contains the passphrase, an email, or a hash; the route response
    (`ImportResult`) carries only counts/status.
14. **Cleanup.** The temp spool dir is removed on success, on decrypt failure, and on a
    mid-restore throw (`finally`), and the FS path never contains an archive-controlled name.
15. **Non-database archive never wipes content (484 guard, HIGH).** For a **settings-only**
    and a **users-only** `.cbk` (`include` without `"database"`) with `confirm:true`, drive
    the exported `restoreArchiveStreamTx(tx, …)` inside a deliberately rolled-back tx: assert
    **zero** `tx.delete` calls on any `ARCHIVE_TABLE_DESCRIPTORS` table (spy), while the
    present section still applies **inside that tx** (settings via `importConfigTx`, §5.5 step
    2; users via the step 0.5 upsert). The **media-only** case is exercised through the
    **committing `importBackupFromUpload`** path instead (per §6 test-DB safety (b)): media
    restore is non-transactional and runs POST-commit OUTSIDE the tx (step e), so
    `restoreArchiveStreamTx` only DRAINS `media/*` members (§5.5) and would NOT apply media
    inside a rolled-back tx. Because `include` lacks `"database"`, step 0's delete-all never
    runs — assert `restoreArchiveStreamTx` performs **zero** content `tx.delete` (spy) — while
    `restoreMediaFromArchive` (03) DOES write the media bytes under the uniquely-scoped
    `t511-05-<uuid>` key prefix (cleaned in `finally`, so no shared object-storage pollution).
    Complements scenario 1 (a `database`-including archive DOES delete+re-insert).
15b. **`"database"` completeness + symmetric member reconcile (HIGH data-loss guard).** A
    `.cbk` whose manifest has `include:["database"]` but an EMPTY or PARTIAL `manifest.tables`
    (fewer than the 22 descriptor keys, or a duplicate/extra key) → `validateManifest`/PASS 1
    throws `backup_manifest_invalid` **before** §5.5 step 0's delete-all opens the tx (assert
    **zero** `tx.delete`/`tx.insert`); this is the crafted empty-manifest full-wipe attack.
    Symmetrically: a physical `tables/*` member present with `"database"` ABSENT from
    `include`, an EXTRA `tables/*` member beyond the descriptor set with `"database"` present,
    and a `media/*` member present with `"media"` ABSENT from `include` each → PASS 1
    `backup_manifest_invalid` with no write. Complements test 6 (settings/users mismatch) —
    together they prove all four sections fail closed, none silently wiped/dropped/drained.
16. **Cross-env / DR `database`+`users` restore is FK-safe (HIGH FK-ordering fix, §5.5 step 0.5).**
    Seed a scoped user (`t511-05-<uuid>`) plus content rows that reference it via a `users.id` FK
    (e.g. `pages.author_id` / `posts.author_id`), `packBackupArchive` a `database`+`users` archive,
    then simulate the CROSS-ENV target by DELETING that user before the restore (so the referenced
    user is absent), and drive `restoreArchiveStreamTx` inside a rolled-back tx with
    `restoreUsers:true`: assert the users pre-restore (step 0.5) upserts the user **before** any
    content `tx.insert` (spy call order: `restoreUsersSectionTx` precedes the first content insert)
    and every content row inserts without a 23503. **Residual-FK coded mapping:** run the SAME
    cross-env archive with `restoreUsers:false` (users deliberately not restored) → the content
    insert hits Postgres 23503 and `isFkViolation` remaps it to `backup_restore_fk_violation`
    (→ 422 via `mapBackupError`), NOT an unmapped generic 500, and the whole tx rolls back (assert
    no partial rows persist). Proves the ordering fix + the coded residual, and that a SAME-env
    restore (user still present) succeeds regardless of `restoreUsers`.

---

## 7. Open questions / cross-subtask reconcile (for the orchestrator)

1. **Settings archive member producer — RESOLVED.** 01 §4.6a owns emitting the
   `settings.json` member (name = 01's pinned `SETTINGS_MEMBER_NAME`) from
   `exportConfig({ target: "settings" })` (`importExportService.ts:287`) whenever `include`
   contains `"settings"`. 05 stays the consumer: reads the member → `JSON.parse` →
   `importConfigTx(tx, bundle)` (484's `validateBundle` + `setSettingsTx`,
   `importExportService.ts:402`) inside the outer tx (§5.5 step 2). No manifest metadata key
   for settings (tracked via the `include` array); a settings member present without
   `"settings"` in `include` (or vice-versa) is a `backup_manifest_invalid` mismatch.
2. **Tar reader ownership (01 vs 03 vs 05) — RESOLVED.** 01 §4.4 says "Reader side (05)
   uses the same primitives" and 01's scope *excludes* restore; 03 §4.3 declares a local
   structural reader interface. 05 OWNS the concrete `readTarMembers`/`BackupArchiveReader`
   in `backupImport.ts` and wires 03's `restoreMediaFromArchive(reader)` against it at
   integration (05 lands after 03; 03's own tests use in-memory reader doubles → no
   land-time break). 03's reader param is structurally typed, so 05's concrete reader
   satisfies it without either subtask importing the other's type.
3. **Import response shape — RESOLVED.** 05 returns an `ImportResult` summary and does
   **not** persist a `backups` artifact row (import is a restore-from-upload, not a new
   snapshot; a `status:"complete"` row with no `artifactPath` would violate the
   `restoreBackup` invariant at `backupService.ts:704`). 06's `backupsClient.importBackup`
   types the response as the client-side mirror of this shape and still invalidates the
   backup-list caches since content changed.
4. **04 parser exports for the users members — RESOLVED.** 05 needs to turn the three users
   NDJSON members into 04's `{ users; roles; userRoles }` typed arrays before calling
   `restoreUsersSectionTx`. 04 §4.1 now **exports** `normalizeUserRow`/`normalizeRoleRow`/
   `normalizeUserRoleRow` plus the `UserRow`/`RoleRow`/`UserRoleRow` row types (single source of
   truth for the reject-unknown parse); 05 imports and reuses them directly — no re-implementation,
   no lock-step drift risk.
5. **Compressed vs decompressed ceilings + pre-parse upload streaming ceiling
   (framework-owned).** The upload ceiling `BACKUP_IMPORT_MAX_BYTES` caps the COMPRESSED
   `.cbk` (declared content-length + `file.size`); the DECRYPTED+gunzipped tar spool is
   counted against the SEPARATE, higher `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` (default 4×)
   so `spoolWithCeiling` still bounds a compression bomb but does NOT reject a legitimately
   large system-produced backup that compresses under the upload cap yet inflates past it on
   gunzip (the parent's scalable/multi-GB mandate). The pre-parse limitation below is
   orthogonal to those two limits. `parseRequestBody`
   (`requestBody.ts:47`) materializes the whole multipart body via `req.formData()` at
   `httpServer.ts:339`, **before** the handler runs — so 05's `content-length` ceiling
   guards the decrypt/restore path and rejects oversized declared/actual sizes, but cannot
   prevent that initial parse. Bun backs large uploads with a temp file (no resident-memory
   OOM), so this is acceptable for the scale target; a true *pre-parse* streaming ceiling
   would require a body-size guard in `parseRequestBody`/`httpServer` (framework, 484-owned)
   — **out of 05's single-writer scope.** Flag for the orchestrator: is a framework-level
   `maxRequestBodySize` (a `Bun.serve` option, `httpServer.ts:209,550`) or a
   pre-`formData` content-length reject desired? If so it is a separate, framework-owned
   change (not 05).
6. **Content↔users FK restore ordering (01 / 04 / 05) — RESOLVED (HIGH).** The 22 content tables
   FK `users.id` at INSERT (pages.author_id `pages.ts:29`, posts.author_id `posts.ts:27`,
   media.created_by `media.ts:63`, page_revisions.created_by `pages.ts:73`,
   content_entries.author_id `content.ts:39`),
   `onDelete` does NOT relax the INSERT and no constraint is DEFERRABLE, so a cross-env / DR restore
   of a `database`+`users` archive whose users are absent from the target must upsert **users before
   content** or every content insert 23503s. **Resolution owned wholly by 05** (no 01 or 04 edit
   needed): §5.5 adds a dedicated FK-safe users PRE-RESTORE (step 0.5) that scans the spool for the
   three users members and calls 04's UPSERT-by-pk `restoreUsersSectionTx` after content-delete and
   before content insert, all in the SAME outer tx. **01 emit order stays unchanged** (users members
   remain last — the pre-scan absorbs the layout; we deliberately do NOT ask 01 to re-order or add a
   DEFERRABLE-constraint migration, keeping 05 migration-free per the parent). **04 is unaffected**
   (`restoreUsersSectionTx` is upsert-by-pk + admin-lockout-guarded → order-independent). The
   residual case (a `database`-including import WITHOUT `restoreUsers` whose content references
   absent users) is mapped to the new coded `backup_restore_fk_violation` (→ 422, §3/§5.5/§5.7)
   instead of an unmapped 500. Covered by regression test 16.

---

## 8. Coordination

- **Changelog:** do NOT create `_docs/_CHANGELOG/1281-*.md` or edit `_docs/_TASKS/*` here —
  only the closure subtask **TASK-511-07** writes the single `1281` changelog and flips
  statuses (parent §Coordination; `1281` is the orchestrator-**PINNED** number — the journal
  now runs through `1273`, `1274` is claimed by TASK-559, and `1275-1279` are reserved by the
  small-feature stream, so 511 closure is pinned to `1281`; a stale worktree
  `_docs/_CHANGELOG/README.md` must be re-read fresh at closure, not "corrected" downward).
  05 ships code + tests only, and touches no `Status:` field outside this file.
- **Land order:** strictly sequential **01 → 02 → 03 → 04 → 05 → 06 → 07**. 05 lands only
  after 01/02/03/04 are merged (it imports `ARCHIVE_TABLE_DESCRIPTORS`/version/section-name
  constants from 01, `decryptBackupArchive`/`normalizeBackupPassphrase` from 02,
  `restoreMediaFromArchive` from 03, `restoreUsersSectionTx` from 04) and before 06 (which
  calls the `POST /backups/import` route).
- **Single-writer / region ownership:** 05 exclusively authors `backupImport.ts` + its
  test, and is the sole writer of the added `POST /backups/import` route + its
  `mapBackupError` `case` additions + the local `RouteContext` `headers?` field
  (`backupRoutes.ts`) and `importBackupSchema` (`backupSchemas.ts`). It does NOT edit
  01/02/03/04's modules or 484's restore internals — it composes against their exports. Per
  parent §Coordination, `backupRoutes.ts` / `backupSchemas.ts` are region-level-shared;
  05's regions (import route/codes/schema) are distinct from 04's (users codes/enum) and
  06's (create passphrase/schedule) and are enforced by the strictly-sequential land order.
- **New env/config:** `BACKUP_IMPORT_MAX_BYTES` (COMPRESSED upload ceiling — content-length
  + `file.size`; server-owned, parsed by 05's own 2-arg `parsePositiveIntEnv` with a 2 GiB
  default), `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` (DECRYPTED+gunzipped tar spool ceiling /
  compression-bomb guard; default = 4× the upload ceiling so a valid large system backup
  that compresses under the upload cap is not rejected on decompression — §7 Q5), and the
  shared `BACKUP_TMP_DIR` (reused from 01) are documented in `.env.example` +
  `docs/develop/getting-started.md` by **07** (05 only reads them defensively).
- **Shared REMOTE test DB:** see §6 — rollback-scoped restore seam, uniquely-scoped
  fixtures, never truncate shared tables, never commit a destructive import in a test.
