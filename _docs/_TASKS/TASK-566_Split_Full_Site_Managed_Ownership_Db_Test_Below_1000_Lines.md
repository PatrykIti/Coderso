# TASK-566: Split fullSiteManagedOwnershipDb.test.ts Below 1,000 Lines

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Small

# FileName: TASK-566_Split_Full_Site_Managed_Ownership_Db_Test_Below_1000_Lines.md

**Parent Task:** none
**Source Findings:** M-547-02 (audit `_TMP-audit-task-547-full-site-installer.md`, verified at HEAD `4e3dab15`)

## Purpose

`tests/integration/kits/fullSiteManagedOwnershipDb.test.ts` is **1001** physical
lines and was modified in the TASK-547 closure commit `0a912476`. The parent
gate (`TASK-547_...md:367`) pins max 1,000 lines per touched production/test
file. One line over is a hard gate violation.

## Evidence

- `wc -l tests/integration/kits/fullSiteManagedOwnershipDb.test.ts` = 1001.
- Touched in closure commit `0a912476` (TASK-547).

## Scope

- Extract a cohesive suite (ownership/takeover cases or setting-compensation
  cases) into a clearly named, independently runnable DB test file in the same
  lane.
- Keep the remaining file at or below 1,000 lines.
- Re-run the kits test group after extraction.

## Fix Strategy

Split by responsibility (e.g. ownership transfer vs setting compensation) into
named suites that share fixtures via a common helper module, then re-run the
whole `kits` DB group.

## Validation

- `wc -l` on every touched file <= 1000.
- Owning DB test group passes (when `DATABASE_URL` available).
- `bun --cwd core lint` + `bun --cwd core lint:types`.

## Notes

- Pure test-structure change; no production behavior change.
