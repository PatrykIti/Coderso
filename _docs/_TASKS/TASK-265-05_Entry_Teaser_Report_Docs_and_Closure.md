# TASK-265-05: Entry Teaser Report, Docs, and Closure

# FileName: TASK-265-05_Entry_Teaser_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-265-01, TASK-265-02, TASK-265-03, TASK-265-04, TASK-265-06
**Status:** To Do

---

## Overview

Close the Entry Teaser Playwright follow-up family after implementation leaves
land.

This leaf owns fixed/routed/deferred evidence for
`_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`, widget docs, task-board sync,
changelog, and final validation. It must not mark TASK-265 done while any report
finding is only implicitly covered.

## Scope Boundary

In scope:

- Update every Entry Teaser report finding with final status:
  fixed, routed to TASK-256, deferred to a named future task, not reproducible,
  or current-state verified.
- Update `_docs/_WIDGETS/ENTRY_TEASER.md` to match final schema/editor/runtime
  behavior.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Entry Teaser readiness changes.
- Update `_docs/_TASKS/README.md`, task statuses, changelog file, and changelog
  index when closing leaves or umbrella.
- Record final validation commands and any blocked checks.

Out of scope:

- Implementing new product behavior not already owned by TASK-265-01 through
  TASK-265-04 or TASK-265-06.
- Closing TASK-256 shared-contract rows.

## Files To Create Or Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md` | Add fixed/routed/deferred evidence and final admin/frontend verification notes. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Sync final data model, editor mode responsibilities, runtime behavior, and accessibility notes. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack completeness/readiness changes. |
| `_docs/_TASKS/TASK-265*.md` | Move completed leaves and umbrella to `Done (YYYY-MM-DD)` only when implementation and validation are complete. |
| `_docs/_TASKS/README.md` | Move TASK-265 rows between tables and update statistics. |
| `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-265-entry-teaser-widget-followups.md` | Add final user-facing changelog entry using the actual closure date when the family moves to `Done`. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row using the next unused number. |

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility: none.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: closure notes must confirm schema validation
  coverage for persisted fields added by implementation leaves.
- Anti-abuse: closure notes must confirm safe-href/media constraints remain
  backend/runtime-owned where relevant.
- Secret handling: Playwright report and changelog must not include secrets,
  tokens, private URLs, raw cookies, or sensitive admin data.

## Implementation Pseudocode

```ts
type EntryTeaserReportStatus =
  | "fixed"
  | "routed-to-task-256"
  | "deferred"
  | "not-reproducible"
  | "current-state-verified";

const findings = [
  "B-01", "B-02", "B-03", "B-04", "B-05", "B-06", "B-07", "B-08",
  "E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-07", "E-08",
  "E-09", "E-10", "E-11", "E-12", "E-13", "E-14",
  "T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07",
];

function verifyCoverage(reportRows, taskRows) {
  for (const finding of findings) {
    assert(reportRows[finding].status);
    assert(reportRows[finding].ownerTask);
    assert(taskRows.some((task) => task.id === reportRows[finding].ownerTask));
  }
}
```

Closure data flow:

1. Read the current report and TASK-265 leaves.
2. Build a finding-by-finding matrix.
3. Confirm each finding has fixed evidence, TASK-256 route, or explicit future
   task.
4. Update docs and changelog after code validation is green.
5. Move task rows to Done only after validation evidence is recorded.

Error handling:

- If a finding lacks evidence, keep the relevant leaf To Do/In Progress and do
  not close the umbrella.
- If a broad suite fails for unrelated reasons, isolate targeted Entry Teaser
  suites and document the unrelated blocker separately.
- If Playwright screenshots are generated, keep PNG files out of git.

Regression-test shape:

- Run the targeted implementation suites listed in TASK-265 umbrella.
- Run `git diff --check` after markdown edits.
- Before final commit, run `bun run precommit`.
- Run `bun run scan:security:strict` before final family closure because CTA and
  safe-link behavior may affect public runtime security posture.

## Sub-Tasks

- [ ] Add finding-by-finding status table to the Playwright report.
- [ ] Sync Entry Teaser widget docs and optional pack matrix.
- [ ] Add changelog entry and changelog index row.
- [ ] Move completed task rows and update board statistics.
- [ ] Record final validation commands and blocked checks.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- if the family has introduced or extended `tests/vitest/widgets/entryTeaser.test.tsx`,
  run `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx` remains required at closure
  while the legacy suite still owns any render, normalizer, or runtime coverage.
- Entry Teaser schema rejection coverage belongs in the Vitest widget suite;
  touch generic validator suites only if a completed leaf changed shared
  validator behavior.
- Focused route/security tests if TASK-265-01 or TASK-265-03 changed internal
  preview or safe-link behavior.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Every report finding has explicit status and owner.
- TASK-256 routed rows are named and not reimplemented locally.
- Entry Teaser docs match final code and tests.
- Task board statistics match task file statuses.
- Changelog entry lists TASK-265 before the umbrella is marked Done.
- Final validation evidence is recorded with any unavoidable blockers called out
  by command.
