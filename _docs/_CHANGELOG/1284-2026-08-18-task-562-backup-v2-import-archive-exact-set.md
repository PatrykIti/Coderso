# 1284 - TASK-562 Backup V2 Import Archive Exact Set Validation

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-562

## Key Changes

### Backups
- `validateManifest` in `backupImport.ts` is extended to a strict per-section
  schema: member presence/type checks plus reject-unknown inside
  `media`/`users` sections.
- `validateArchive` now compares manifest-declared counts/bytes with the
  actual tar members for both sections; any mismatch rejects with the
  machine-readable `backup_manifest_invalid` cause before any restore work
  starts (no partial mutation).
- Negative matrix extended: missing member, extra member, checksum/byte-size
  mismatch, malformed section payloads all fail closed with 422.
- The prior positive test "users present but opt-out" (`:732-769`) was
  updated for the exact-set rule (empty `roles.ndjson` +
  `user_roles.ndjson` members added).

## Validation
- `bun --cwd core lint` + `lint:types` green;
  `bun test tests/unit/backups/backupImport.test.ts` extended negative matrix
  green.
- Runtime smoke (`wf568smoke`): archive omitting one required table member is
  rejected with "Backup manifest is missing or malformed." (422) and no DB
  mutation; valid 22-table archive imports cleanly; screenshots in
  `_docs/_workflows/_smoke/evidence/task-568/wf568smoke/`.
