# TASK-511-07: Docs, Gates & Closure

# FileName: TASK-511-07-Docs-Gates-And-Closure.md

**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Parent Contract:** TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md
**Priority:** Medium
**Category:** Backups / Data / Security / Docs / Testing / Task Board
**Estimated Effort:** Medium
**Depends On:** TASK-511-01 → 06 (all must be landed first — this is the terminal subtask)
**Blocks:** none — terminal subtask.
**Status:** ⏳ To Do
**Started:** 2026-07-05
**Land order:** strictly sequential — lands **7th and last**, only after 01→02→03→04→05→06 have all merged and their gates are green. This is the ONLY subtask permitted to edit `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`.

---

## 1. Overview

Terminal subtask of TASK-511 (Backup v2 — scalable, compressed, encrypted, importable). Subtasks
01–06 ship the code (streaming/batched NDJSON export engine + `.cbk` tar/manifest, gzip +
AES-256-GCM/scrypt encryption, media-file streaming, opt-in users/RBAC include,
upload→decrypt→validate→transactional restore import pipeline + `POST /backups/import`, scheduler
full-backup wiring + Admin UI + create-path `.cbk` rewiring + migration `0066`). 511-07 makes the
release real and closes the tree: it registers the standing test matrix, syncs every spec/doc the
code touched, documents every backup env var, writes the changelog, updates the task-board rows +
statistics, and flips statuses to Done.

This subtask **writes NO product code and adds NO routes.** It is the ONLY subtask in the tree
permitted to edit `_docs/_TASKS/*` and `_docs/_CHANGELOG/*` (single-writer ownership of the board +
changelog, per the parent §Coordination). Because it touches no routes, no route-level Security
Contract applies; instead it carries a **Security Documentation Contract** (§4) that asserts the
security posture the docs must accurately describe.

> **⚠ CHANGELOG NUMBER — use `1229`. READ FIRST.** The closure changelog is **`1229`** by
> orchestrator PIN. GROUNDING (true on-disk state — do NOT restate the README as saying 1229):
> `_docs/_CHANGELOG/README.md:32` currently reads *"Use 1223 for the next changelog entry"* and the
> highest entry on disk is **`1222`** (`1222-2026-07-05-task-484-backups-…md`; TASK-484 also claims
> 1222 on the board). `1229` is NOT the README's stated next-free number — it is pinned by the
> orchestrator because `1220–1228` are reserved by parallel streams (482–484 / 512–516) and TASK-480
> owns `1223` in the merge target `feature/tasks`. This contract therefore uses **`1229`** across the
> parent + all subtasks (01–06). At closure, 07 VERIFIES the whole 511 tree references `1229` (this
> is a check of the 511 files, NOT of README:32, which legitimately still reads 1223 until land) and
> creates `_docs/_CHANGELOG/1229-*.md`. **Do NOT create any other number and do NOT edit README:32 to
> say 1229.**

## 2. Goal

- Every backup-v2 behaviour that changed the DB, an API surface, media handling, or the security
  posture is reflected in the canonical specs, WITH anchors matching the real shipped code.
- The standing CI test matrix runs every new backup-v2 test file: they already execute under the
  `package.json` `test:bun` glob, and the curated coverage-lane arrays in `scripts/run-bun-lane.ts`
  are extended to list them (TASK-483 closure precedent — board README line 158).
- `.env.example` + `docs/develop/getting-started.md` document every backup env var (the pre-existing
  undocumented v1 set PLUS the new ones 02/03/05/06 introduced).
- Changelog `1229` exists and is indexed; the task board reflects TASK-511 (+ all subtasks) as Done;
  Statistics counters are adjusted; every 511 **Status:** is `✅ Done`.

## 3. Owning Modules / Files (single-writer for this subtask)

Docs + standing-CI registration only. No other 511 subtask edits these.

**Create:**
- `_docs/_CHANGELOG/1229-2026-07-05-task-511-backup-v2-scalable-compressed-encrypted-importable.md`

**Edit — task board / changelog (07 is the sole 511 writer):**
- `_docs/_TASKS/README.md` — board rows (511 is absent at HEAD, so ADD to `## Done`) + Statistics
  (increment Done only; see §5.9).
- `_docs/_TASKS/TASK-511_Backup_V2_*.md` — flip parent `**Status:**` (`:9`) + the `## Sub-Tasks`
  table statuses (table body `:151–157`; heading `## Sub-Tasks` at `:147`) to `✅ Done`. The changelog number at `:49`,`:50` already reads
  `1229` (reconciled) — verify, do not renumber.
- `_docs/_TASKS/TASK-511-01…06-*.md` — flip each `**Status:**` to `✅ Done`. All six already
  reference `1229` (reconciled tree-wide) — verify none carries a stale number.
- `_docs/_CHANGELOG/README.md` — add the `1229` Index row (top of the table, `:35`). `README:32`
  currently reads *"Use 1223…"*; after creating `1229`, set the pointer to the next genuinely-free
  number at land time (**≥ 1230**), verified against the LIVE merge-target README — never `1224`
  (claimed by a parallel stream) and never below `1229`.

**Edit — specs (edit under existing headings; anchors must match real code):**
- `_docs/DATA_MODEL.md` — `## Backups` (`:434`): new `backup_schedules.include jsonb` column +
  migration `0066_backup_schedule_include`; v2 `.cbk` artifact note; import creates no `backups` row.
- `_docs/CMS_API.md` — `## Backups (v1)` (`:3060`): retitle to v2; document `POST /backups/import`,
  create-body `passphrase`, schedule `include`, `.cbk` base64 download `encoding`,
  `backup_restore_superseded`, and the new error codes.
- `_docs/SECURITY_SPEC.md` — `## Backups (v1)` (`:625`, Polish prose): retitle to v2; encryption
  (AES-256-GCM + scrypt KDF), passphrase handling (never logged/cached/returned), users encrypted-only
  posture (opaque hashes), import validate-before-write + confirm-gated transactional restore.
- `_docs/MEDIA_SPEC.md` — `Backup artefakty` (`:47`): correct the now-false `:56` "metadata + URLs
  only" claim — media file **bytes** are now streamed into/out of the `.cbk` archive.
- `docs/develop/security.md` — operator-facing security note mirroring the SECURITY_SPEC deltas
  (passphrase is the only way to decrypt; a lost passphrase makes the archive unrecoverable).
- `docs/develop/getting-started.md` — a short "Backups (v2)" env/ops note (no `backup` mention today).
- `.env.example` — new `# Backups` section (the file currently has **no** `BACKUP_*` var at all).
- `docs/guide/screens/backups.md` — operator guide: import, passphrase, users include, scheduled
  full backup + the `BACKUP_ENCRYPTION_PASSPHRASE` requirement.
- `docs/guide/screens/import-export.md` — a one-line cross-link clarifying that backup-file import
  (`.cbk`, full restore) is distinct from config import/export.

**Standing-CI registration (07 is the sole writer of these edits at land time):**
- `scripts/run-bun-lane.ts` — append the new Backup-v2 Bun suites to `routeSuites` / `baselineSuites`.

If a needed section does not yet exist verbatim, create it under the existing heading structure of
the target file; do not restructure unrelated content.

**Streaming / no-OOM scope — do NOT overclaim remote (06 Open Question #4, deferred).** The parent's
"never hold the full archive in memory / no container OOM" guarantee is upheld end-to-end for the
**local** storage driver (create writes the `.cbk` via `writeStreamToFile`; import streams). For the
**s3/azure** create-path, 06 still buffers the encrypted archive into one ArrayBuffer via v1's
`adapter.put(UploadFile)` (`arrayBuffer()`-only) — remote streaming via 03's `putAt` is technically
possible but blocked on the deferred owner decision (unknown upfront `ContentLength` + caller-minted
key). Therefore CMS_API / SECURITY_SPEC / getting-started / changelog MUST scope the no-OOM/streaming
guarantee to the local driver (or state "remote upload currently buffers the archive; streaming remote
is a follow-up") and MUST NOT claim remote (s3/azure) streaming or remote no-OOM until 06 Open
Question #4 resolves in favor of streaming. 07 corrects any doc that overclaims to match this scope.

**Do NOT touch:** any `core/**` product code, `tests/**` suite bodies (07 only *registers* their
paths), or the migration artifacts (06 owns `0066`). If a doc claim cannot be grounded against the
landed 01–06 code, 07 corrects the doc to match the code — it never edits code to match a doc.

## 4. Security Documentation Contract

07 adds no routes and no code, so there is nothing new to authorize. Its obligation is that the
security-relevant docs it edits are **truthful** about the posture 01–06 shipped. The docs MUST
state — and 07 MUST verify against the real code before writing:

- All admin backup/import routes are internal (`/admin/api/*`), RBAC `backups:read`
  (list/usage/download/schedule-read) / `backups:write` (create/import/restore/prune/schedule-write),
  CSRF-enforced on writes, rate-limited (`admin_write` bucket), strict reject-unknown validation.
  Anchor: `core/server/routes/backupRoutes.ts` (`requirePermission`, `validate`, `mapBackupError`
  `:80`) + `registerBackupRoutes` (`:135`).
- Encryption is AES-256-GCM; the key is `scrypt(passphrase, per-archive salt)`; wrong passphrase
  fails closed (GCM auth failure → `backup_decrypt_failed`, 422) with NO partial restore. Passphrase,
  derived key, salt/IV/KDF params are backend-only — never logged, cached, or returned to clients.
- **Every v2 `.cbk` is encrypted — there is NO unencrypted archive variant.** A passphrase is
  mandatory for every backup: interactive create requires it (server fails closed
  `backup_passphrase_required` when absent), and unattended scheduled runs require
  `BACKUP_ENCRYPTION_PASSPHRASE` or **fail closed** (never emit an unencrypted archive). Stored v2
  backups are restored via download→Import (with the passphrase); the legacy one-click restore-by-id
  fails fast with `backup_restore_superseded` (422) for a `.cbk` artifact (v1 `.json` rows still
  restore in place).
- The `users` include is opt-in, permitted ONLY into an encrypted archive (which is every v2
  archive); an unencrypted user export is rejected pre-read by `assertUsersEncryptionAllowed`
  (`backup_users_requires_encryption`, 400); password hashes (`users.password_hash`,
  `core/db/schema.ts:20`) travel as opaque values inside the encrypted archive, never emitted to
  logs/unencrypted output/clients; import of users is confirmation-gated (opt-in `restoreUsers`) with
  a lockout guard (`backup_users_restore_no_admin`, 409 → rollback) and must not escalate privileges.
- Import upload is a size-ceilinged (`BACKUP_IMPORT_MAX_BYTES`) streamed multipart body; the file is
  decrypted + manifest/checksum/GCM-auth validated BEFORE any DB write; restore is confirmation-gated
  and transactional (all-or-nothing), reusing TASK-484's FK-safe reverse-delete cascade-complete
  table set. Media byte writes are the only non-transactional step (post-commit; object storage is
  not transactional).
- **Streaming / no-OOM symmetry + the one recorded users-restore exception (parent §"Confirmed
  design decisions" 4, lines 111–123 — re-stated at closure per the parent mandate).** The no-OOM
  guarantee holds symmetrically for the content `tables/*` and media members on BOTH export and
  import (batch-streamed / bounded window, never a whole table resident). Export of the `users` /
  `roles` / `user_roles` RBAC members ALSO keyset-streams (04 §4.2). The single sanctioned
  deviation is the **users-section RESTORE**: 05 §5.5 `collectLines` those three members into full
  `UserRow[]/RoleRow[]/UserRoleRow[]` arrays for 04's `restoreUsersSectionTx`, because its
  fail-closed correctness guards (natural-key email/role-name collision detection, `user_roles`
  reconcile + FK-missing-roleId guard, global admin-lockout guard) must observe the WHOLE archived
  set before any write inside the single poison-on-error outer tx. This is the parent's explicit,
  bounded, owner-scoped exception — owned + justified in **04 §4.3** and mirrored in **05 §5.5** —
  scoped to the opt-in, encrypted-only users section only, NOT a silent violation. Docs that
  describe the streaming/no-OOM posture MUST carry this exception (07 verifies the exception note is
  present in both 04 and 05 at land time and does not overclaim symmetric users-restore streaming).

**Docs-security invariant:** no doc, changelog, env-example comment, or getting-started note may
contain a real passphrase, key, salt, IV, password hash, email, or any archive-content value.
`.env.example` ships the new vars **empty** (e.g. `BACKUP_ENCRYPTION_PASSPHRASE=`) exactly like the
existing `PII_ENC_KEY=` / `ANALYTICS_IP_HASH_SECRET=`. If any posture above does NOT match the
shipped code, 07 does not "fix" the code (out of scope) — it documents the true behaviour and records
the discrepancy as an Open Question, so the docs never overstate security.

## 5. Implementation Pseudocode (docs/closure procedure)

Executed strictly AFTER 01–06 are landed (sequential land order 01→02→03→04→05→06→07).

### 5.1 Reconcile shipped surface vs. the parent contract (read-only ground-truth sweep)

```
grep/Read the shipped 511 code to capture the GROUND TRUTH for docs. At authoring HEAD (6f1dee36)
the v1 baseline is:
  - BACKUP_ARTIFACT_VERSION = 1 (backupService.ts:69); BACKUP_ARTIFACT_CONTENT_TYPE =
    "application/json" (:70); artifact file coderso-backup-<id>.json (:82-83).
  - BackupIncludeOption v1 = ["database","media","settings"] (backupTypes.ts).
  - No backup_schedules.include column; last migration idx 65 = 0065_backup_run_metadata.
Confirm the v2 deltas 01–06 actually shipped (document ONLY what is real):
  - v2 archive: .cbk extension + AES-256-GCM/scrypt envelope; the artifact/manifest version bump
    (`ARCHIVE_ARTIFACT_VERSION = 2`, owned + exported by 01 in `backupArchive.ts` and consumed by 05 —
    DISTINCT from 02's `.cbk` crypto-header `BACKUP_ARCHIVE_FORMAT_VERSION = 1`); binary octet-stream content-type.
  - BackupIncludeOption += "users" (04): confirm createBackupSchema enum + normalizeBackupInclude
    allowlist BOTH include it (the "new validated key joins its allowlist" rule).
  - New route: POST /backups/import (05) — path/verb/schema + its mapBackupError codes; verify the
    exact code→status map in backupRoutes.ts (:80 mapBackupError) — the doc mirrors the code.
  - Migration: backup_schedules.include jsonb (06) — use the NEXT-FREE index at implement time, NOT `0066`:
    in the merge target `feature/tasks`, `0066` = `0066_dashboard_layouts` (TASK-480) and `0067`–`0069` are
    reserved by TASK-512/513/514, so 511 takes the next free after those (grep the migrations dir + journal at land).
  - Env vars introduced: BACKUP_ENCRYPTION_PASSPHRASE (02/06 unattended passphrase),
    BACKUP_IMPORT_MAX_BYTES (05, default 2 GiB) + BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES (05,
    compression-bomb ceiling, default 4× the upload ceiling), BACKUP_MEDIA_MAX_FILE_BYTES (03),
    BACKUP_TMP_DIR (01/05 spool). (BACKUP_SCRYPT_LOGN is OPTIONAL — document ONLY if 02 actually ships a
    `process.env.BACKUP_SCRYPT_LOGN` read; baseline 02 uses fixed DEFAULT_KDF with no env.) Plus the pre-existing undocumented v1 set —
    AUTHORITATIVE INSTRUCTION: this list is NOT hardcoded; run
    `grep -rn 'process.env.BACKUP' core/services/backups core/server/jobs/backupScheduler.ts` at
    land time and document EVERY read it returns. At authoring HEAD 6f1dee36 that sweep returns FOUR
    pre-existing v1 reads, ALL of which must be documented:
      - BACKUP_DIR — local artifact directory (backupService.ts:73; default ./storage/backups).
      - BACKUP_SCHEDULER_ENABLED — in-process scheduler opt-in flag (backupScheduler.ts:32; default
        off outside production, on in production).
      - BACKUP_SCHEDULER_TICK_MS — scheduler tick/poll interval in ms (backupScheduler.ts:11;
        default 60000).
      - BACKUP_MAX_TOTAL_BYTES — storage-usage quota ceiling in bytes (backupService.ts:943 via
        parsePositiveIntEnv; unset ⇒ no quota / overQuota never trips).
    (CMS_API currently documents only BACKUP_DIR/BACKUP_SCHEDULER_ENABLED at :3067,:3074 — the two
    tick/quota vars are undocumented today; 07 must document all four.)
Produce an internal delta list; EVERY doc edit below must cite a real anchor. If a planned symbol
is absent from the landed code, document the true state and flag it (do not invent).
```

### 5.2 Test-matrix registration — `scripts/run-bun-lane.ts`

The `package.json` `test:bun` already globs `tests/unit tests/integration/routes
tests/integration/runtime …` (`:26`), so any 511 suite under those dirs already RUNS. `run-bun-lane.ts`
is the curated coverage-lane runner (`test:bun:lane`, `:35`); its `routeSuites` array (`:6`) already
lists `tests/integration/routes/backups.test.ts` (`:22`). Register the rest:

```ts
// routeSuites — add the extended runtime scheduler suite (place it with other
// tests/integration/runtime/* entries; verify which array run-bun-lane uses for runtime suites):
//   "tests/integration/runtime/backupScheduler.test.ts",
// baselineSuites (or the unit array run-bun-lane uses for tests/unit/*) — add the 01–05 unit suites
// + the extended service suite:
//   "tests/unit/backups/backupArchive.test.ts",        // 01
//   "tests/unit/backups/backupCrypto.test.ts",         // 02
//   "tests/unit/backups/backupMediaArchive.test.ts",   // 03
//   "tests/unit/backups/backupUsersSection.test.ts",   // 04
//   "tests/unit/backups/backupImport.test.ts",         // 05
//   "tests/unit/backups/backupService.test.ts",        // 06 (add only if not already present)
```

**Correctness:** at land time `ls tests/unit/backups/` + `tests/integration/{routes,runtime}/` and
register EXACTLY the files that exist — a phantom path breaks the lane. Preserve the array's existing
grouping. Vitest pure-logic suites (`tests/vitest/ui/backups.test.tsx`,
`tests/vitest/admin/backupsClient.test.ts` — 06) run via `test:vitest` (`vitest.config.ts`) and need
no glob edit. Proof: `bun run test:bun:lane` completes with the new suites listed and green.

### 5.3 DATA_MODEL sync — `_docs/DATA_MODEL.md` `## Backups` (:434)

Under `backup_schedules (singleton)` (`:450`), add:

```md
- `include jsonb NOT NULL DEFAULT '["database","settings","media"]'` — which sections a scheduled
  full backup captures (`database` | `settings` | `media` file bytes | opt-in `users` RBAC matrix);
  app-validated as a `BackupIncludeOption[]`; sensitive `users` is off by default. Added by migration
  `0066_backup_schedule_include` (idx 66, gapless after TASK-484's `0065_backup_run_metadata`).
```

Add a one-line note that the v2 artifact is a compressed+encrypted `.cbk` (not a `version:1` JSON
blob) and that **import does not create a `backups` row** (restore-from-upload). The ONLY new
backups-domain column in TASK-511 is `backup_schedules.include`; `backups`/`users`/`roles`/
`user_roles` are unchanged — do not invent columns.

### 5.4 CMS_API sync — `_docs/CMS_API.md` `## Backups` (:3060)

- Retitle `## Backups (v1)` → `## Backups (v2)` (keep v1 back-compat notes where legacy `.json` rows
  still download/restore).
- Endpoint list (`:3089–3097`) — add `POST /backups/import` (`backups:write`, CSRF, multipart `.cbk`
  upload; scalars `passphrase` + `confirm:"true"` + optional `restoreUsers:"true"|"false"`; streamed
  ceiling `BACKUP_IMPORT_MAX_BYTES`; decrypt+validate before any write; confirm-gated transactional
  restore; returns an `ImportResult` summary `{ status, artifactVersion, tablesRestored, rowsRestored,
  mediaRestored, usersRestored, skippedMedia }` — NOT a `backups` row).
- `POST /backups` create — document the `passphrase` body field (required at service; every v2
  archive is encrypted; a create with no passphrase → `validation_error`/`backup_passphrase_required`)
  and that it is never logged/audited/returned (audit metadata stays `{ kind, include }`).
- `PATCH /backups/schedule` (`:3159`) — add the `include` field (`array`, `minItems:1`, `maxItems:4`,
  `uniqueItems`, enum `["database","media","settings","users"]`, `additionalProperties:false`).
- Download (`:3181`) — a v2 `.cbk` download returns `contentType: application/octet-stream`,
  `encoding: "base64"`, and a base64 `content` string (JSON-safe, byte-exact re-importable); legacy
  v1 `.json` keeps the utf8 `content` string with no `encoding`.
- Restore — one-click restore-by-id of a v2 `.cbk` row returns `backup_restore_superseded` (422) with
  the guided "download, then Import with its passphrase" flow; restore-from-stored still works for v1.
- Error codes — list new codes+statuses (from 05 §3 / 06): `backup_decrypt_failed` 422,
  `backup_archive_unsupported` 422, `backup_passphrase_required` 400, `backup_passphrase_invalid` 400,
  `backup_import_too_large` 413, `backup_import_invalid_file` 400, `backup_manifest_invalid` 422,
  `backup_checksum_mismatch` 422, `backup_users_requires_encryption` 400,
  `backup_users_restore_no_admin` 409, `backup_media_key_unsafe` 422, `backup_media_write_failed` 500,
  `backup_restore_superseded` 422. **Verify each against the landed `mapBackupError`
  (`backupRoutes.ts`) — the doc must match the code, not this list.**

### 5.5 SECURITY_SPEC sync — `_docs/SECURITY_SPEC.md` `## Backups` (:625, Polish prose)

Retitle `(v1)`→`(v2)` and extend in the section's language/voice with: v2 archives always encrypted
(AES-256-GCM, scrypt KDF, per-archive salt/IV/params in the header; wrong passphrase →
`backup_decrypt_failed`, zero writes); passphrase/key/salt/IV backend-only (never logged/cached/
persisted to a `backups`/`backup_schedules` row/audit/client); create/import take the request-body
passphrase, the unattended scheduler reads only `BACKUP_ENCRYPTION_PASSPHRASE` and fails closed if
unset; `users` include (users+roles+user_roles, opaque `password_hash`) is opt-in + encrypted-only,
enforced server-side by `assertUsersEncryptionAllowed` (`backup_users_requires_encryption`); import
(`POST /backups/import`, `backups:write`, CSRF, size ceiling, decrypt+validate BEFORE any write) is
confirm-gated + transactional (all-or-nothing) with the users-restore lockout guard
(`backup_users_restore_no_admin` → rollback). Keep the v1 notes where still true.

### 5.6 MEDIA_SPEC sync — `_docs/MEDIA_SPEC.md` `Backup artefakty` (:47)

Correct the now-false `:56` claim: v2 `.cbk` **streams media file bytes** into a `media/<storageKey>`
member (03), read from the active storage adapter; import writes them back via `putAt(...)` **after**
the DB tx commits (object storage is not transactional). Per-file ceiling `BACKUP_MEDIA_MAX_FILE_BYTES`;
member keys are traversal-guarded (`assertSafeMediaKey` → `backup_media_key_unsafe`, 422). Keep the v1
note (v1 held metadata/URLs only) as a historical/back-compat line.

### 5.7 Operator + developer guides

- `docs/guide/screens/backups.md` — extend the `# Basic` "current UI" list (`:24–33`) and `# Medium`
  usage list with: an **Import** action (upload a `.cbk` + passphrase to restore), the **passphrase**
  requirement on Create (every backup encrypted; same passphrase required to import; never saved), the
  **Users & roles (RBAC matrix)** opt-in + sensitivity warning, and the scheduled-backup note that
  unattended runs require `BACKUP_ENCRYPTION_PASSPHRASE` (else fail closed). Keep front-matter +
  Basic/Medium/(Advanced) structure.
- `docs/guide/screens/import-export.md` — add a one-line cross-link: backup-file import (`.cbk`, full
  encrypted restore via the Backups screen) is separate from config import/export.
- `docs/develop/security.md` — operator note mirroring §5.5 (passphrase is the only decryption key; a
  lost passphrase makes the archive unrecoverable; users-include is encrypted-only + opt-in).

### 5.8 Env docs — `.env.example` + `docs/develop/getting-started.md`

Add a `# Backups` section to `.env.example` (after `# Email`, before `# Themes`), every var **empty**
+ commented (mirror the `# Security` block; NEVER a real secret):

```sh
# Backups
# Local artifact directory (default: ./storage/backups)
BACKUP_DIR=
# Enable the in-process backup scheduler outside production (default: off outside prod)
BACKUP_SCHEDULER_ENABLED=
# Backup scheduler tick / poll interval in milliseconds (default: 60000)
BACKUP_SCHEDULER_TICK_MS=
# Storage-usage quota ceiling in bytes for total stored backups (unset = no quota)
BACKUP_MAX_TOTAL_BYTES=
# Backend-only passphrase for UNATTENDED scheduled backups. v2 archives are always AES-256-GCM
# encrypted; if unset, scheduled runs FAIL CLOSED (never emit an unencrypted archive). Interactive
# create/import take the passphrase from the request instead. A lost passphrase makes the archive
# UNRECOVERABLE. Generate: openssl rand -base64 32
BACKUP_ENCRYPTION_PASSPHRASE=
# OPTIONAL scrypt cost (log2 N) for passphrase KDF — include ONLY if 02 ships a
# process.env.BACKUP_SCRYPT_LOGN read; baseline 02 uses a fixed DEFAULT_KDF (no env). Omit if not read.
BACKUP_SCRYPT_LOGN=
# Max accepted import upload size in bytes (compressed, default: 2147483648 = 2 GiB)
BACKUP_IMPORT_MAX_BYTES=
# Compression-bomb ceiling: max DECOMPRESSED bytes during import (default: 4x the upload ceiling)
BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES=
# Per-file ceiling for media bytes packed into / restored from an archive (bytes)
BACKUP_MEDIA_MAX_FILE_BYTES=
# Temp spool directory for streaming export/import (default: OS tmpdir)
BACKUP_TMP_DIR=
```

**Verify each var name + default against the landed 01–06 code** before writing (grounded in the
02/03/05/06 contracts; confirm the exact `process.env.*` reads at land time and correct any drift).
Then add a short "Backups (v2)" paragraph to `docs/develop/getting-started.md`: v2 archives are
encrypted `.cbk`; set `BACKUP_ENCRYPTION_PASSPHRASE` for scheduled backups (else they fail closed);
the same passphrase is required to import; `users` include is encrypted-only + opt-in.

### 5.9 Changelog `1229` + Index

Create `_docs/_CHANGELOG/1229-2026-07-05-task-511-backup-v2-*.md` following the `1222` (TASK-484)
entry shape: Title line, `Date`/`Version`/`Tasks`, Key Changes grouped by area (Archive format &
manifest, Compression+encryption, Media bytes, Users/RBAC include, Import pipeline, Scheduler+Admin
UI, Migration `0066`, Docs/Data Model/API/Security/Media, Testing, Task Board). `Tasks:` TASK-511 +
01..07. Then add the Index row at the TOP of the table (`_docs/_CHANGELOG/README.md:35`):

```md
| 1229 | 2026-07-05 | TASK-511 Backup v2 — Scalable, Compressed, Encrypted, Importable — … | Backups/Data/Security/Streaming/Media/Admin UI/Schema/API/Testing/Docs/Task Board |
```

then update the pointer at `_docs/_CHANGELOG/README.md:32` (currently *"Use 1223…"*) to the next
genuinely-free number at land time — **≥ 1230**, verified against the LIVE merge-target README; never
`1224` (reserved by a parallel stream) and never below `1229`.

### 5.10 Task board + statuses — `_docs/_TASKS/README.md`

```
1. VERIFY placement first: grep -c 'TASK-511' _docs/_TASKS/README.md. At HEAD 6f1dee36 this is 0 —
   TASK-511 and its 01..07 rows are NOT on the board (authored straight into the worktree; the current
   To Do: 260 count does NOT include any 511 row). Do NOT "move" rows that aren't there; do NOT
   decrement To Do.
2. ADD the TASK-511 parent + each subtask row (01..07) DIRECTLY to the ## Done table, each with a
   Done(2026-07-05) summary in the Notes column (shape template: TASK-484 row at :157 — end with
   "Changelog 1229. 7 subtasks (01–07).").
3. Statistics (:81-83): INCREMENT Done by 8 (1 umbrella + 7 subtasks; the 511 tree has NO leaves):
   2868 → 2876. Leave To Do: 260 and In Progress: 5 UNCHANGED. Apply the +8 delta to the LIVE numbers
   at land time (they drift as other tasks land), not these snapshots.
   (Contingency) If a prior agent DID add 511 rows to ## To Do before closure, instead MOVE those
   rows To Do→Done and decrement To Do by exactly that many while incrementing Done by the same.
4. Parent contract file: flip **Status:** ⏳ To Do → ✅ Done (add **Completed:** 2026-07-05); flip
   every ## Sub-Tasks table Status cell (01..07, table body :151-157; heading ## Sub-Tasks at :147) to ✅ Done. The changelog number at
   :49,:50 already reads 1229 — verify, do not change.
5. Each subtask file (01..06): flip its own **Status:** to ✅ Done. All six already reference 1229
   (reconciled tree-wide) — verify only.
   Confirm no conflicting uncommitted owner drift-agent edits before editing (parallel-agent hygiene).
6. Final check: grep -rn "⏳ To Do\|🚧 In Progress" _docs/_TASKS/TASK-511* returns nothing; no
   superseded/phantom changelog file exists (`ls _docs/_CHANGELOG/12{2,3}9-* 2>/dev/null` empty) and
   the README Index has exactly one 511 row, pointing to 1229.
```

## 6. Testing / Gates Requirements

07 authors NO new test file — behaviour tests ship with 01–06 (correct lanes there: Bun for
streaming/route/crypto/DB, Vitest for genuinely Bun-free pure logic). 07's testing obligation is
**registration + a combined green gate sweep** (MEMORY: deferred combined gate + flake re-run
discipline; typecheck-scope gotcha):

1. `bun --cwd core lint` and `bun --cwd core lint:types` — clean.
2. **Root `tsc -p tsconfig.json --noEmit`** — clean (core-only lint misses `tests/` excess-prop
   errors; mandatory after 05/06's prop-signature changes — MEMORY typecheck-scope gotcha).
3. `bun run test:bun` — full Bun lane incl. the Backup-v2 suites (`tests/unit/backups/*`,
   `tests/integration/routes/backups.test.ts`, `tests/integration/runtime/backupScheduler.test.ts`).
   Re-run any spuriously-timed-out named file individually; the settings smoke-DB transient is a known
   false-fail (re-run isolated) — MEMORY.
4. `bun run test:vitest` — the admin UI/client suites (`tests/vitest/ui/backups.test.tsx`,
   `tests/vitest/admin/backupsClient.test.ts`).
5. `bun run test:bun:lane` — walks the arrays 07 edited in §5.2; confirm the newly-registered suites
   are picked up and green.
6. Security/release gates: `tests/security/codersoSecurityGate.test.ts` green, and (if available in
   this worktree) `bun run gates:coderso` / `scan:security:strict`.
7. Docs sanity: the new changelog file number is unique (no `1229` collision, no superseded/phantom
   changelog file under `_docs/_CHANGELOG/`), the Index row is well-formed and points to `1229`;
   grep the edited specs for stale "v1 / metadata+URLs only / JSON artifact" claims
   where v2 superseded them, and confirm every documented route/error-code/env var maps to a real
   symbol in the shipped code (fail-closed: if it isn't in the code, it isn't in the docs).

**Shared REMOTE test-DB safety (parent §Coordination — render.com `DATABASE_URL`):** 07 runs the
suites but authors none. The 01–06 suites already use uniquely-scoped fixtures + rollback-scoped
restore/import seams (`restoreArtifactTx`/`restoreArchiveStreamTx` inside a deliberately rolled-back
`db.transaction`) and never truncate shared tables. 07 must NOT add any test that commits a
destructive restore/import over the shared DB.

**Gate-fix scope:** if a gate fails, 07 fixes it in **07-owned files only** (docs, `run-bun-lane.ts`).
A failure rooted in 01–06 product code is escalated to the orchestrator as a sequential-order
violation for the owning subtask — 07 does NOT edit `core/**` to make a gate pass, and does NOT flip
statuses to Done or write a "green" changelog claim until every gate above passes.

## 7. Open Questions / cross-subtask reconcile (for the orchestrator)

1. **Changelog `1229` — orchestrator-PINNED and reconciled tree-wide.** The number is **`1229`** by
   orchestrator pin: `README:32` currently reads *"Use 1223…"* and highest-on-disk is `1222`, but
   `1220–1228` are reserved by parallel streams (482–484 / 512–516) and TASK-480 owns `1223` in the
   merge target, so the next number safe for 511 is `1229`. All seven 511 files reference `1229`, so
   no closure-time renumbering is required — 07 VERIFIES the 511 tree references `1229` (a check of
   the 511 files, NOT of README:32) and creates the `1229` changelog. 07 does NOT edit README:32 to
   read 1229; at land it advances the pointer to the next genuinely-free number ≥ 1230.
2. **Board Statistics arithmetic + To Do presence.** TASK-511 is absent from the board (grep: 0), so
   closure ADDS 8 rows (umbrella + 7 subtasks, no leaves) straight to `## Done` and increments Done by
   8 (2868→2876), To Do/In Progress unchanged. Confirm this, that there are genuinely no leaves under
   any 511 subtask, and that 07 applies the +8 delta to the LIVE counts at land time (not the snapshot).
3. **CMS_API/SECURITY_SPEC section retitle vs dual v1/v2.** This contract retitles `(v1)`→`(v2)` while
   preserving v1 back-compat notes (legacy `.json` rows still download/restore). Confirm preferred
   presentation (single retitled section with caveats vs a separate `### Legacy v1` subsection).
4. **Exact env-var names/defaults.** The `.env.example` block (§5.8) is grounded in the 01–06
   contracts, but 07 MUST verify each `process.env.*` read + default against the LANDED code at land
   time (e.g. `BACKUP_SCRYPT_LOGN` default, `BACKUP_IMPORT_MAX_BYTES` = 2 GiB) and correct any drift.
5. **Suite-path registration set.** §5.2 lists the expected new suite files from the 01–06 contracts;
   07 registers exactly the files that exist on disk at land time (no phantom/renamed paths), and adds
   only missing entries (no duplicates of an already-listed suite).

## 8. Coordination

- **Changelog `1229` is created ONLY here** (closure 511-07); no other 511 subtask writes
  `_docs/_CHANGELOG/*` or `_docs/_TASKS/*`. After creating `1229`, set the README pointer (`:32`,
  currently *"Use 1223…"*) to the next genuinely-free number at land time (**≥ 1230**), verified
  against the LIVE merge-target README — never `1224` and never below `1229`.
- **Strictly sequential land order:** 01→02→03→04→05→06→07. 07 runs last and presumes 01–06 are
  merged; it documents the ACTUAL shipped surface, not the planned one — reconcile against real code
  first (§5.1).
- **Single-writer / no code edits:** 07 owns only docs + `scripts/run-bun-lane.ts` registration; it
  does not touch `core/**` or `tests/**` suite bodies.
- **Env/config documentation is 07's job** (05 §8 / 06 §Coordination both defer `.env.example` +
  `docs/develop/getting-started.md` to 07): `BACKUP_ENCRYPTION_PASSPHRASE`, `BACKUP_IMPORT_MAX_BYTES`,
  `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES`, `BACKUP_MEDIA_MAX_FILE_BYTES`, `BACKUP_TMP_DIR`,
  `BACKUP_SCRYPT_LOGN` (OPTIONAL — only if 02 ships a real `process.env.BACKUP_SCRYPT_LOGN` read) (+ the pre-existing v1 set,
  ALL of which 07 documents: `BACKUP_DIR`, `BACKUP_SCHEDULER_ENABLED`, `BACKUP_SCHEDULER_TICK_MS`,
  `BACKUP_MAX_TOTAL_BYTES` — grep `process.env.BACKUP` at land time to confirm the full set).
- **Branch/worktree:** `feature/task-511` (`/home/coder/project/Coderso-task-511`), branched from
  `feature/tasks` HEAD `6f1dee36`.
- **Shared REMOTE test DB** (`DATABASE_URL` in `.env`): gate runs only; never commit a destructive
  restore/import against it.
- **Parallel-agent hygiene:** the owner may run their own drift-fixer agents in the shared tree. 07
  scopes its writes to only the docs/board/changelog files it owns and never reverts others'
  uncommitted edits.
- Keep every claim consistent with the parent
  `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md` and its Confirmed design decisions
  (AES-256-GCM/scrypt, gzip, tar+manifest+NDJSON, `.cbk`, batched keyset/COPY streaming, opt-in
  encrypted-only users include, preserved TASK-484 fail-closed restore posture).
</content>
