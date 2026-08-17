# TASK-565: Split mediaDeliveryAccess.test.ts Below 1,000 Lines

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1287 (pinned)
**Priority:** Medium
**Size:** Small

# FileName: TASK-565_Split_Media_Delivery_Access_Test_Below_1000_Lines.md

**Parent Task:** none
**Source Findings:** M-511-05 (audit `_TMP-audit-task-511-backups.md`, verified at HEAD `4e3dab15`)

## Purpose

`tests/integration/server/mediaDeliveryAccess.test.ts` is **1051** physical
lines and was touched in the TASK-511 delivery scope. AGENTS.md requires every
human-authored test file to stay at or below 1,000 lines; a violation is a hard
failed gate, not a LOW/TASK-9999 candidate.

## Evidence

- `wc -l tests/integration/server/mediaDeliveryAccess.test.ts` = 1051.
- Touched in `5508f186` (TASK-511 delivery).

## Scope

- Extract cohesive fixtures/suites (e.g. media delivery access matrix, auth/permission
  variants) into clearly named, independently runnable files under the same test
  lane.
- Do not split arbitrary line ranges; keep the owning suite runnable via its
  existing test command surface.
- After the split, run the extracted suites and confirm the original entry still
  covers the full contract.

## Fix Strategy

Extract a shared support module `tests/integration/server/mediaDeliveryTestSupport.ts`
exporting `createMediaDeliveryHarness()` that returns the mutable module state
(records, bodies, mode, permissionAllowed, calls, streamFactory, adapterGet),
the `installHarness` helper, and the `beforeEach`/`afterEach`/`afterAll` hooks
— the current 22 tests read module-level state (`mediaDeliveryAccess.test.ts:132-138`)
and the singleton `__setMediaDeliveryDepsForTests` seam (`:303-357`, `:359-385`),
so each split file must be independently runnable and own those bindings.
Then split the suites (per-grant access matrix, auth/permission variants,
redirect/error cases) into clearly named files <= 1000 lines each.

## Validation

- `wc -l` on every touched file <= 1000.
- REGENERATE the lane manifest: `tests/integration/server/` is a
  `bun-lane-classify` directory, so extracted files are silently skipped until
  `bun scripts/bun-lane-classify.ts` re-runs and commits
  `tests/bun-lane-manifest.json`; add this step to the task.
- Pin the lane command: `bun tests/integration/server/mediaDeliveryAccess.test.ts`
  plus each extracted file (or `bun run test:bun` after manifest regen).
- `bun --cwd core lint` + `bun --cwd core lint:types`.

## Notes

- Pure test-structure change; no production behavior change.
