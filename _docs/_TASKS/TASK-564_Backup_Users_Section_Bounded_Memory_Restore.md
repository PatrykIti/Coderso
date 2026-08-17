# TASK-564: Backup Users Section Bounded Memory Restore

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1286 (pinned)
**Priority:** Medium
**Size:** Medium

# FileName: TASK-564_Backup_Users_Section_Bounded_Memory_Restore.md

**Parent Task:** none
**Source Findings:** M-511-04 (audit `_TMP-audit-task-511-backups.md`, verified at HEAD `4e3dab15`)

## Purpose

The backup users section materializes the whole roles/membership matrix in
memory (`collectLines()` into `users`/`roles`/`userRoles` arrays). The TASK-511
parent promises a no-OOM guarantee covering the full RBAC matrix; the
"owner-scoped exception" is recorded but has no numeric bound or admission
limit, so large instances violate the scalability contract.

## Evidence

- `core/services/backups/backupImport.ts:559-589` — `collectLines()` at `:565`
  into full arrays (`:566-570`), cross-check `:578-586`, helper call `:587`,
  then handed to the restore helper.
- Parent `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md:140-155`
  (no-OOM must cover users RBAC matrix; exception must be explicit, bounded,
  owner-scoped, recorded).
- `TASK-511-04_...md:422-444` — the exception IS recorded and justified
  (whole-set natural-key collision guard + admin-lockout reconciliation), but no
  numeric bound/admission limit exists.

## Scope

- Stream/batch the users section: a **persistent, run-scoped staging table**
  with set-based SQL for the whole-set natural-key collision guard and
  user_roles reconciliation, preserving the documented correctness rationale.
  Staging mechanics (pinned): CREATE TEMP TABLE is unsafe through the default
  pooled client (`core/db/client.ts:21-23` — temporary tables deliberately
  absent; `withSessionDatabaseClient` exists but the restore runs inside the ONE
  outer `db.transaction` on the default client). Therefore ship a persistent
  staging table `backup_users_staging` with FULL migration artifacts (SQL +
  `meta/*_snapshot.json` + `meta/_journal.json` update; migration number pinned
  to **0074** after TASK-569 (0073); re-read the live journal immediately
  before allocation, since 0073 is allocated by the sibling 569 stream), unique
  run-scoped rows
  (`runId` + natural-key columns), idempotent per-run cleanup, and a
  rollback/cleanup runbook in the task handoff.
- **Run id source (pinned, shared with TASK-563):** `importBackupFromUpload`
  creates no stored backup row, so `opts.runId` must use the same source as
  TASK-563's media-failure receipt: either the synthetic `"import"` convention
  (`backupRoutes.ts:307-309`) or the spool-dir UUID (`backupImport.ts:699`
  `coderso-import-<randomUUID>`). Pick ONE; both contracts must agree.
- Replace the full-array path: stream NDJSON lines into the staging table in
  bounded batches (~5k/batch) via `ndjsonLineBatches()`, then run the existing
  set-based natural-key collision guard and user_roles reconcile as SQL against
  the staging table inside the same transaction.
- The admin-lockout guard is ALREADY a single bounded set-based select on the
  final tables (`backupUsersSection.ts:409-419`) and stays unchanged — only the
  natural-key collision guard and step-3 user_roles reconcile need the
  set-based rewrite.
- OR (fallback if the staging table is rejected) introduce an explicit,
  validated archive/section size limit with a refusal code and a documented
  product decision. Prefer the staging table to keep the million-user promise.
- Add an OOM-guard test with a large synthetic users section and a memory/batch
  budget assertion (no full-array materialization).

## Fix Strategy

```ts
// core/services/backups/backupUsersSection.ts (owns the change; single writer)
// New shape: stream from the tar line reader instead of taking full arrays.
export async function restoreUsersSectionTx(
  tx: DbTransaction,
  opts: { restoreUsers: boolean; confirm: boolean; runId: string },
  stream: AsyncIterable<string> // NDJSON lines, bounded batches by the caller
): Promise<{ usersRestored: number; rolesRestored: number }> {
  // 0. Cleanup any stale rows for runId (idempotent).
  // 1. Insert archived rows into backup_users_staging in ~5k-row batches
  //    (one INSERT per batch, bounded binds); track counts in memory only.
  // 2. Set-based natural-key collision guard (SQL, no full-array maps):
  //    SELECT EXISTS(roles.name in staging WHERE name IN (SELECT name FROM final
  //    roles) AND id <> final.id) -> throw backup_restore_invalid_artifact.
  //    Same for users.email. (PII-safe: offending values never thrown.)
  // 3. Bounded FK-missing roleId guard + user_roles reconcile via SQL against
  //    staging (scoped to archived userIds; batched deletes/inserts <= 500).
  // 3.5 STAGING -> FINAL upsert (NEW, required): batched
  //    INSERT INTO roles (id, name, ...) SELECT ... FROM backup_users_staging
  //    WHERE run_id = $1 ON CONFLICT (id) DO UPDATE SET ... (mirror the
  //    excluded.* sets today at backupUsersSection.ts:340-373), then the same
  //    batched upsert for users (backupUsersSection.ts:352) and user_roles
  //    (composite-pk onConflictDoNothing, :370). Without this step the final
  //    tables never change and the lockout guard below would run against
  //    pre-restore state.
  // 4. Admin-lockout guard: unchanged set-based query on final tables
  //    (backupUsersSection.ts:405-419, runs AFTER the upsert).
  // 5. DELETE staging rows for runId (idempotent cleanup) before returning.
}
```

- Caller (`backupImport.ts:559-589`) replaces `collectLines()` with streaming
  batches into the new helper; the content/media paths are untouched.
- Error handling: every failure before commit rolls back the outer tx (staging
  rows included); the run-scoped cleanup is idempotent and safe on retry.
- Regression-test shape: extend `tests/unit/backups/backupUsersSection.test.ts`
  (9 top-level tests today: `:179,196,211,283,335,404,434,477,595`; new tests
  cover the staging→final upsert and run-scoped cleanup) + the
  `backupImport.test.ts` `testIfDb` at `:591` (pre-restore
  path); keep the natural-key collision, FK-missing roleId, and admin-lockout
  guards behavior-identical.
- Exact files owned: `core/services/backups/backupUsersSection.ts`,
  `core/services/backups/backupImport.ts` (pre-restore path only),
  `core/db/tables/` + migration artifacts (new staging table),
  `tests/unit/backups/backupUsersSection.test.ts`,
  `tests/unit/backups/backupImport.test.ts`.

## Security Contract

- Endpoint unchanged (`internal` admin; the route uses RBAC `backups:write`
  per `backupRoutes.ts:260,278` — there is no `backups:restore` permission).
- No new payload fields; reject-unknown unchanged.
- Refusal code (if a size limit is chosen) must be machine-readable and
  sanitized.
- Staging rows never contain plaintext secrets beyond what the archive already
  carries (password hashes are opaque); PII (email/name) stays archive-scoped
  and is not logged.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Unit tests for batch boundaries (no full-array materialization) +
  behavior-identical guards; DB test with a large users section when
  `DATABASE_URL` available (load env with `set -a && source .env && set +a`;
  assert bounded row-batch count and staging cleanup on success and rollback).
- Migration artifacts present (SQL + snapshot + journal) and `meta/_journal.json`
  updated atomically with the schema module under one writer.

## Notes

- Keeps the owner-approved collision-guard correctness; only the "bounded" half
  of the parent exception is unmet today.
