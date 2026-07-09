# TASK-511: Backup v2 — Scalable, Compressed, Encrypted, Importable

# FileName: TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md

**Priority:** High
**Category:** Backups / Data / Security / Admin
**Estimated Effort:** Very Large
**Dependencies:** TASK-484 (backups v1 — scheduler/retention/restore/remote storage, merged)
**Status:** ⏳ To Do
**Started:** 2026-07-05

---

## Overview

TASK-484 shipped "backups are real" but the artifact is a single pretty-printed
JSON snapshot built fully in memory (`JSON.stringify(artifact, null, 2)` →
`coderso-backup-<id>.json`), restored by reading the whole file + `JSON.parse`
into memory, then delete-all + re-insert. This does NOT scale: a data-heavy site
(the CMS is meant to build "ogromne skalowalne strony" — think an otodom/otomoto
with a million listings/users) would OOM the container on both backup and
restore. It also cannot import an uploaded backup file, never captures media file
bytes or settings by default, and offers no encryption.

TASK-511 rebuilds the backup engine to be **streaming, batched, compressed,
encrypted, and importable at any scale**, while preserving TASK-484's fail-closed
security posture (confirmation-gated destructive restore, RBAC + CSRF, strict
validation before any write, transactional restore, backend-only secrets).

**Owner-confirmed scope (2026-07-05):**
- Streaming + **batched** export/restore so huge services never load a whole
  table (or the whole archive) into memory — no container OOM.
- **Compressed** archive format (not a live JSON blob).
- **Full backup**, runnable manually AND automatically on the schedule frequency,
  covering database + settings + media **files** (bytes, not just rows).
- **Encryption with a user-supplied passphrase**; the same passphrase is required
  at import time; wrong passphrase fails closed with a clear error.
- **Import of a backup file** (upload → decrypt → decompress → validate →
  restore) — the existing Import/Export tool does NOT cover this.
- **Optional, opt-in include of users + the role/RBAC matrix** (roles, user↔role
  assignments) so large sites don't rebuild roles and re-assign users from
  scratch. Sensitive: opt-in only, only ever written to an ENCRYPTED archive,
  password hashes handled as opaque blobs, never exported to an unencrypted
  artifact, never returned to clients.
- **Users restore = MERGE (owner-confirmed 2026-07-06), never mirror.** UPSERT by
  primary key; users present in the current DB but ABSENT from the archive are LEFT
  IN PLACE (never deleted) — so restoring onto a live instance that already gained
  users (an invited teammate, a fresh self-registration from the front) does not
  wipe them. There is NO "exact-mirror" restore mode (it is unsafe against the
  cross-table FK graph).
- **Maintenance-mode gate for destructive restore (owner-confirmed 2026-07-06).**
  A full/disaster restore is destructive (it delete-replaces the content snapshot
  tables). The import/restore endpoint therefore REQUIRES the server to be in a
  **maintenance mode** first (admin flips it), so no concurrent front-end
  registrations / content writes race the restore. 511 introduces this
  maintenance-mode capability: a `site.maintenanceMode` boolean setting (settings
  service, admin-toggleable), a public-request `503 Service Unavailable`
  middleware (public site + non-admin API return 503 while enabled; the admin app
  + the restore/import route stay reachable), and the import route fails closed
  (`backup_maintenance_required`, 409) when maintenance mode is OFF. See 511-05.
- Fast, pleasant UX, but full security preserved.

## Coordination (pinned facts)

- **Changelog number:** the closure subtask creates `_docs/_CHANGELOG/1229-*.md`.
  **`1229` is PINNED by the orchestrator — it is NOT the naive next-free number.**
  `_docs/_CHANGELOG/README.md:32` in this worktree reads *"Use 1223 for the next
  changelog entry"* and the highest entry on disk is `1222` (TASK-484), so the
  on-disk arithmetic alone would suggest `1223`. But `1223` and the whole band
  `1220-1228` are unavailable in the merge target: **TASK-480 owns `1223` in
  `feature/tasks`**, and **`1220-1228` are reserved by parallel streams
  (482-484 / 512-516)**. The first free number after those reservations is
  therefore `1229`. Closure must NOT renumber 511 to `1223` (or any value in
  `1220-1228`); it VERIFIES there is no `1229` collision on disk and creates
  `_docs/_CHANGELOG/1229-*.md`, then bumps the README pointer to the true
  next-free-after-merge number (NOT a decrease into the reserved band). Only the
  closure subtask edits `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`.
- **Branch/worktree:** `feature/task-511` (worktree `/home/coder/project/Coderso-task-511`),
  branched from `feature/tasks` HEAD `6f1dee36`.
- **No parallel streams currently** — single stream. Standard single-writer
  ownership per source file across subtasks; strictly sequential land order.
  - **Region-level ownership on shared backup files (by design).** Four existing
    files are necessarily edited by more than one subtask:
    `backupRoutes.ts` (`mapBackupError` codes + routes — 04 users codes, 05 import
    route/codes, 06 `POST /backups` create-handler passphrase),
    `backupSchemas.ts` (04 include enum, 05 `importBackupSchema`, 06
    `createBackupSchema.passphrase` + `scheduleUpdateSchema`),
    `backupTypes.ts` (04 `"users"`, 06 `BackupCreateInput.passphrase` + schedule
    types), and `backupService.ts` (06 create-rewiring + schedule + a top-of-
    `restoreBackup` v2 `.cbk` fail-fast guard + `resolveBackupDownload` v2-bytes
    rewire; 484's restore **transaction body** stays untouched). Per-file
    single-writer is impossible here, so these
    use **explicit per-region single-writer ownership** (each subtask names the
    lines/region it owns) enforced by the strictly-sequential land order — each
    subtask edits only its declared region on top of the prior merge.
- **Shared REMOTE test DB** (render.com, `DATABASE_URL` in `.env`). All DB tests
  use uniquely scoped fixtures + clean up only their own rows; never truncate
  shared tables. Restore/import tests must NEVER commit a destructive restore
  over the shared DB — use rollback-scoped seams / isolated fixtures.
- **New env/config:** any new env var (e.g. a default backup-encryption key, or
  passphrase policy) is documented in `.env.example` + `docs/develop/getting-started.md`.

## Confirmed design decisions (owner-approved)

1. **Archive format:** application-level **NDJSON per table** (one entity per
   line), streamed, packaged in a **tar** container with a `manifest.json`
   (schema/artifact version, per-table row counts, checksums, include flags,
   engine version) + per-table `*.ndjson` members + a `media/` member stream.
   The whole tar is **gzip**-compressed, then **encrypted**. Chosen over
   `pg_dump` (which needs the pg client in the container and is DB-centric —
   poor fit for bundling media bytes + settings + selective RBAC). Result:
   `coderso-backup-<id>.cbk` (Coderso BacKup) = `AES-GCM(gzip(tar(manifest +
   ndjson members + media)))`.
2. **Compression:** streaming gzip (never hold the full archive in memory).
3. **Encryption:** **AES-256-GCM**; key derived from the user passphrase via
   **scrypt** (random salt per archive, stored in the archive header alongside
   IV + KDF params + an auth tag). Streaming/chunked encryption so large
   archives are never fully buffered. Wrong passphrase → GCM auth failure →
   fail-closed `backup_decrypt_failed` (400/422), no partial restore. **Encryption
   is mandatory for every v2 `.cbk` — there is no unencrypted archive variant** (02
   owns the format; its header is intrinsically AES-256-GCM and 05's import always
   decrypts). A passphrase is therefore required for every backup: interactive
   create/import take the request-body passphrase; unattended scheduled runs read
   the backend-only `BACKUP_ENCRYPTION_PASSPHRASE` env and **fail closed** if it is
   unset (never emit an unencrypted archive).
4. **Batching:** per-table export via **keyset pagination** (stable `id` cursor)
   or `COPY ... TO STDOUT`, ~5–10k rows/batch; restore inserts in batches inside
   one transaction with FK-safe ordering (reuse TASK-484's reverse-delete +
   cascade/RESTRICT-complete table set). **The streaming / no-OOM guarantee
   covers EVERY section symmetrically — including the `users`/`roles`/`user_roles`
   RBAC matrix.** No section may materialize a whole table into resident memory on
   either export OR restore. Export already keyset-streams the users members (04),
   so import MUST likewise stream + batch the users/roles/user_roles NDJSON members
   on restore (a bounded window like the content tables), NOT `collectLines` them
   into full in-memory arrays before the upsert — a large users archive would
   otherwise OOM on import, breaking the million-user scale target. If a section
   genuinely requires full in-memory materialization for correctness (e.g. an
   admin-lockout reconciliation that must observe all admin rows), that is an
   explicit, bounded, **owner-scoped exception recorded in the owning subtask
   (04/05) and re-stated at closure (07)** — never a silent violation of the
   "never load a whole table into memory" mandate.
5. **Include options:** `database`, `settings`, `media` (now = file bytes), and
   **new** `users` (⇒ users + roles + user_roles RBAC matrix), all opt-in in the
   admin UI and the schedule config. Because **every v2 archive is encrypted**
   (decision 3 — passphrase mandatory), `users` is always written into an encrypted
   archive; `assertUsersEncryptionAllowed` (04) is the fail-closed, pre-read
   defense-in-depth guard that additionally rejects any `users` include lacking a
   passphrase with the specific `backup_users_requires_encryption` code (a non-users
   backup with no passphrase fails with `backup_passphrase_required`).

## Security Contract (summary; each route-touching subtask restates it)

- All admin backup/import routes stay **internal** (`/admin/api/*`), RBAC
  `backups:write` (create/import/restore/prune) / `backups:read` (list/usage),
  CSRF-enforced on writes, rate-limited, strict reject-unknown validation.
- Import upload is a streamed multipart body with a size ceiling; the file is
  decrypted + validated (manifest version, checksums, GCM auth) BEFORE any DB
  write; restore is confirmation-gated and transactional (all-or-nothing).
- Passphrase + derived key + KDF material never logged, never cached, never
  returned to clients; encryption/decryption is backend-only.
- `users` include: password hashes travel only inside the encrypted archive as
  opaque values; never emitted to logs/unencrypted output; importing users is
  itself gated (opt-in + confirmation) and must not escalate privileges.

## Sub-Tasks

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| TASK-511-01 | Streaming batched export engine + archive format & manifest | High | Large | ⏳ To Do |
| TASK-511-02 | Compression + passphrase encryption (gzip + AES-256-GCM/scrypt) | High | Large | ⏳ To Do |
| TASK-511-03 | Media file streaming into/out of the archive | High | Medium | ⏳ To Do |
| TASK-511-04 | Optional users + RBAC role-matrix include (opt-in, encrypted-only) | High | Medium | ⏳ To Do |
| TASK-511-05 | Import-file pipeline (upload → decrypt → validate → batched transactional restore) | High | Large | ⏳ To Do |
| TASK-511-06 | Scheduler full-backup wiring + Admin UI (include options, passphrase, upload-to-import) | High | Large | ⏳ To Do |
| TASK-511-07 | Docs, gates & closure | Medium | Medium | ⏳ To Do |

Land order is strictly sequential 01→02→03→04→05→06→07. Each subtask file carries
its own execution-ready pseudocode, single-writer file ownership, test lane
(Bun for the streaming/route/crypto/DB paths; Vitest only for genuinely Bun-free
pure logic), and — where it touches routes — a full Security Contract subsection.
