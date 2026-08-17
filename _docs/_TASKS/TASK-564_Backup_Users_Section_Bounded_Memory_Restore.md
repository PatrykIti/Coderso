# TASK-564: Backup Users Section Bounded Memory Restore

**Status:** ⏳ To Do
**Started:**
**Completed:**
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

- `core/services/backups/backupImport.ts:559-587` — `collectLines()` into full
  arrays, then handed to the restore helper.
- Parent `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md:140-155`
  (no-OOM must cover users RBAC matrix; exception must be explicit, bounded,
  owner-scoped, recorded).
- `TASK-511-04_...md:422-444` — the exception IS recorded and justified
  (whole-set natural-key collision guard + admin-lockout reconciliation), but no
  numeric bound/admission limit exists.

## Scope

- Stream/batch the users section: staging-table batch upsert with set-based SQL
  for the whole-set natural-key collision guard and admin-lockout
  reconciliation, preserving the documented correctness rationale.
- OR introduce an explicit, validated archive/section size limit with a refusal
  code and a documented product decision. Prefer batch upsert to keep the
  million-user promise.
- Add an OOM-guard test with a large synthetic users section and a memory/batch
  budget assertion.

## Fix Strategy

Replace the full-array path with bounded `ndjsonLineBatches()` upserts into a
staging table, then one set-based natural-key collision + admin-lockout
reconciliation query, then bulk insert into final tables inside the same
transaction.

## Security Contract

- Endpoint unchanged (`internal` admin, `backups:restore`).
- No new payload fields; reject-unknown unchanged.
- Refusal code (if a size limit is chosen) must be machine-readable and
  sanitized.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Unit tests for batch boundaries; DB test with a large users section when
  `DATABASE_URL` available (assert bounded row-batch count and no full-array
  materialization).

## Notes

- Keeps the owner-approved collision-guard correctness; only the "bounded" half
  of the parent exception is unmet today.
