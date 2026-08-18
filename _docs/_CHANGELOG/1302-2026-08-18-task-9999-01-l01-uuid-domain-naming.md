# 1302 - TASK-9999-01-L01 Decouple Actor and Media UUID Domain Naming

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-9999-01-L01, TASK-9999-01

## Key Changes

### Domain Naming
- `screenMediaIdentity.ts` now owns a neutral `isScreenUuid` predicate plus the
  existing `isScreenMediaAssetUuid` as a delegating compatibility wrapper and
  unchanged `firstScreenMediaAssetUuid` scalar/array selector.
- `customScreenSchemas.ts` re-exports both predicates; the media-named API
  remains available to existing media consumers.
- Actor and `updatedBy` validation now route through the neutral predicate:
  `screenEntryPresentationOverrides.ts` `normalizeActorId` and
  `screenEntryPresentationOverrideContract.ts` `normalizeUpdatedBy`. The
  media-only `normalizeCanonicalMediaUuid` keeps its media-named predicate.
- No payload, persistence, auth, RBAC, error code, storage, or transport byte
  changes; the same case-insensitive UUID grammar rejects the same values.

## Validation

- `bun --cwd core lint` and `bun --cwd core lint:types` green.
- Root `tsc -p tsconfig.json --noEmit` green.
- `tests/vitest/customScreens` lane: 10 files / 111 tests green, including the
  new identical-truth-table parity test (`isScreenUuid` vs
  `isScreenMediaAssetUuid`) and the actor reject/uppercase-round-trip test.
- `git diff --check` clean; all touched files under 1,000 lines.

## Notes

- Closes the last open TASK-540 deferred LOW. TASK-9999-01 has both descendants
  terminal and moves to `✅ Done`; TASK-9999 (sentinel) remains `🚧 In Progress`.
