# TASK-565: Split mediaDeliveryAccess.test.ts Below 1,000 Lines

**Status:** ⏳ To Do
**Started:**
**Completed:**
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

Identify the natural seams (shared fixture builders, per-grant access cases,
redirect/error cases), move them into named helper/suite files, and re-run the
whole media delivery test group.

## Validation

- `wc -l` on every touched file <= 1000.
- `bun test` (or owning lane runner) for the media delivery group passes.
- `bun --cwd core lint` + `bun --cwd core lint:types`.

## Notes

- Pure test-structure change; no production behavior change.
