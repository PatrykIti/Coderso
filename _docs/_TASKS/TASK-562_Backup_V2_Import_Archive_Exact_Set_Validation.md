# TASK-562: Backup v2 Import Archive Exact-Set Validation

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1284 (pinned)
**Priority:** High
**Size:** Medium

# FileName: TASK-562_Backup_V2_Import_Archive_Exact_Set_Validation.md

**Parent Task:** none
**Source Findings:** H-511-01, NEW-511-01a, NEW-511-01b (audit `_TMP-audit-task-511-backups.md`, verified at HEAD `4e3dab15`)

## Purpose

`validateManifest()`/`validateArchive()` accept archives whose declared
`include.users` / `include.media` do not match the actual members, and never
compare manifest counts/bytes with the tar. A restore can declare users/media
and silently restore incomplete roles or zero files without a fail-closed error.
Manifest `media`/`users` values are not shape-validated and duplicate section
members are not rejected.

## Evidence

- `core/services/backups/backupImport.ts:353-415` (`validateManifest` — DB
  section completeness only at `:400-413`; no media/users presence/shape),
  `:421-469` (`validateArchive` — `sawMediaMember` at `:444`; rejects media only
  when NOT selected at `:458-460`, so `include:["media"]` with zero members
  passes; count/bytes never compared with tar), `:559-587` (users pre-pass uses
  single boolean `sawUsersPre`), `:653-677` (any one of three members sets
  `sawUsersMember`).
- Test `tests/unit/backups/backupImport.test.ts:732-769` imports successfully a
  users archive with only `users.ndjson` and `restoreUsers: false`.
- Duplicate section members pass: PASS 1 dedups only the manifest member
  (`:429`); PASS 2 (`:599-668`) would apply `settings.json` twice and
  last-write-wins duplicate media keys.

## Scope

- Schema-validate the full manifest: when `include.users`, require `users` with
  three non-negative integer counts and exactly the three expected NDJSON
  members (also for empty sections); when `include.media`, require a media
  manifest and verify real count/bytes/skipped policy against the tar.
- Reject duplicate and unknown section members.
- Add negative tests: missing each of the three users members, missing
  `manifest.users`, count mismatch, `include.media` without members, count/bytes
  mismatch, duplicate members, non-object/wrong-type manifest values.

## Fix Strategy

Extend `validateManifest` to a strict per-section schema (types + presence +
reject-unknown inside `media`/`users`) and `validateArchive` to compare manifest
declared counts/bytes with actual tar members for both sections, rejecting any
mismatch with a machine-readable `backup_manifest_invalid` cause before any
restore work starts.

## Security Contract

- Endpoint unchanged (`internal` admin; the route uses RBAC `backups:write`
  per `backupRoutes.ts:260,278` — there is no `backups:restore` permission).
- No new payload fields; import payload reject-unknown unchanged.
- Failure is fail-closed before destructive work; error codes sanitized.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- `bun test tests/unit/backups/backupImport.test.ts` (extended negative matrix).
  NOTE: the existing positive test `tests/unit/backups/backupImport.test.ts:732-769`
  ("users present but opt-out") asserts SUCCESS for `include:["users"]` with only
  `users.ndjson`; under the new exact-set rule that archive becomes INVALID, so
  the test must be updated (add empty `roles.ndjson` + `user_roles.ndjson`
  members, or convert to a negative test) as part of this task.
- DB-backed import smoke when `DATABASE_URL` available.

## Notes

- Closes the semantic-completeness gap without weakening encryption/GCM
  integrity guarantees.
