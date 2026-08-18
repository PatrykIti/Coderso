# TASK-9999: Permanent Deferred Non-User-Facing Low-Severity Backlog

# FileName: TASK-9999_Permanent_Deferred_Non_User_Facing_Low_Severity_Backlog.md

**Priority:** Low
**Category:** Engineering Process / Verified Maintenance Backlog
**Estimated Effort:** Very Large
**Dependencies:** None
**Status:** 🚧 In Progress
**Started:** 2026-07-16
**Last Triaged:** 2026-07-18
**Next Quarterly Triage:** 2026-10-01

---

## Overview

TASK-9999 is the permanent, final-board intake for verified LOW-severity findings
whose deferral has no current user-visible or contract-level consequence. It keeps
small behavior-neutral maintenance debt explicit without forcing an active delivery
stream to spend disproportionate time on it.

This is the sole reserved four-digit sentinel exception to the repository's
`TASK-###` naming rule. No other four-digit task ID may be allocated.

This task is not a general waiver and is not a place for uncertain, cosmetic UI, or
poorly scoped findings. The parent intentionally remains `🚧 In Progress`; a source task
receives its own numbered child only when it contributes at least one new, nonduplicated
finding, and each such accepted finding receives a concrete, execution-ready leaf. A
source with only duplicate findings links the existing leaves without creating an empty
child.

## Eligibility Contract

A finding may enter this family only when all of the following are true:

- it is evidence-backed and classified LOW;
- it has zero current user-visible UI, UX, or accessibility effect;
- it has zero data, security, privacy, auth, RBAC, API, persistence, migration,
  performance, reliability, or test-integrity impact;
- the source task links the exact TASK-9999 leaf and records evidence plus a concrete
  rationale for safe deferral;
- the backlog was searched first and the finding is not already represented by an
  existing leaf; and
- the leaf is narrowly scoped, execution-ready, and testable. Vague dumping into the
  parent or a catch-all child is prohibited.

HIGH and MEDIUM findings are never eligible. If new evidence reveals any excluded
impact, the item must leave this backlog and return to active work at its corrected
severity.

## Intake and Triage Process

1. Verify the finding against current source and record concrete file/symbol evidence.
2. Apply every eligibility condition above; uncertainty means the finding stays in the
   source task.
3. Search all existing TASK-9999 children and leaves. Link an existing match instead of
   duplicating it.
4. If at least one finding is new after deduplication, allocate the next stable child for
   the source task and one leaf per new distinct finding. A source with only duplicate
   findings links the existing leaves and creates no child. The source task must add each
   backlink and safe-deferral rationale before it can close.
5. Re-triage the relevant leaves at source-task closure, at the quarterly parent review,
   and whenever evidence, impact, or severity changes.
6. Close implemented leaves and children normally with validation, changelog evidence,
   task-board updates, and Statistics synchronization, but keep this parent and its final
   board row permanently In Progress.

## Security Contract

This backlog contract changes no endpoint, auth, permission, CSRF, rate-limit, storage,
or secret-handling behavior. A proposed leaf that would change any such behavior is
ineligible and must move to an active task with its own complete Security Contract.

## Sub-Tasks

| ID | Source family | Leaves | Status |
|---|---|---|---|
| TASK-9999-01 | TASK-540 Custom Screens | TASK-9999-01-L01 (`⏳ To Do`), TASK-9999-01-L02 (`⏭️ Superseded`) | ⏳ To Do |
| TASK-9999-02 | TASK-560 audit sweep (docs-only) | TASK-9999-02-L01..L04 (all `⏳ To Do`) | ⏳ To Do |

The 2026-07-18 evidence-triggered re-triage removed L02 from the eligible backlog:
active TASK-540-02-L01 now reads `baseLabel` to preserve focus while invalidating stale
drafts, so the old removal would have a user-visible UX/accessibility effect. Changelog
1258 records the terminal supersession. L01 is the only open finding in this child; the
child remains `⏳ To Do`, and this sentinel parent remains `🚧 In Progress`.

Future source-family children use the next unused `NN`; retired numbers are never
reused. Adding a child does not change the parent status or move its board row.

## Testing Requirements

- Validate every leaf in the dependency-shaped Bun or Vitest lane named by that leaf.
- Run `bun --cwd core lint:types`, `bun --cwd core lint`, and root
  `tsc -p tsconfig.json --noEmit` for source changes unless a stricter source-task gate
  applies.
- Run task-file identity, parent-link, status, board-row/statistics, and duplicate-leaf
  consistency checks whenever this family changes.
- Run `git diff --check` before handoff.
- A pure domain/service leaf that touches no UI or editor runtime may omit runtime smoke
  when its dependency-shaped tests prove the unchanged contract. Every leaf that touches
  UI/editor code still follows the root mandatory runtime-smoke contract: restart the dev
  server through the repository helper, use a task-scoped `playwright-cli` session, cover
  at least five distinct real behavior-preservation flows, verify light and dark mode for
  Admin surfaces, assert visible/DOM effects, capture review screenshots, require zero
  console/page errors, and clean up the session, fixtures, helper, process, and ports.
  Multiple UI/editor TASK-9999 leaves may share one smoke only when every leaf retains an
  explicit scenario-to-owner evidence mapping. Expected behavior-neutrality is an
  eligibility invariant, not a waiver of runtime validation; an intentional visible
  behavior change requires promotion out of TASK-9999, while an accidental one fails the
  implementation and must be repaired before closure.

## Documentation Updates Required

- Keep this parent table and `_docs/_TASKS/README.md` synchronized when children are
  added or statuses change.
- Make the source task link every accepted leaf with exact evidence and rationale.
- Add a changelog entry covering implemented leaf IDs when a source-family child closes.
- Update `Last Triaged` and `Next Quarterly Triage` during each quarterly review while
  leaving the parent In Progress.
