# 1288 - TASK-566 Split Full Site Managed Ownership DB Test Below 1000 Lines

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-566

## Key Changes

### Tests
- `tests/integration/kits/fullSiteManagedOwnershipDb.test.ts` (1001 lines)
  split by responsibility (ownership transfer vs setting compensation) into
  named suites at or below 1000 physical lines per the AGENTS.md gate.
- Named common helper module
  `tests/integration/kits/fullSiteManagedOwnershipSupport.ts` owns the shared
  in-file helpers (`createOwnedIds`, `ownId`, `cleanupOwnedIds`,
  `emptyResources`, `packageFixture`, `identityNormalizer`, `planPackage`,
  `projectPersistedFormActions`, `persistEvidence`), the owned-row cleanup
  contract (delete ONLY created rows), and the setting-takeover test's
  settings restore.
- No fixture/mock/assertion weakening; each split suite remains DB-backed and
  independently runnable.

## Validation
- `bun --cwd core lint` + `lint:types` green; all split full-site suites pass;
  touched-file line-count gate verified.
