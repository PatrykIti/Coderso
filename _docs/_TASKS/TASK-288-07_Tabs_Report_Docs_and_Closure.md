# TASK-288-07: Tabs Report Docs and Closure

# FileName: TASK-288-07_Tabs_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Documentation + Playwright QA + Release Evidence
**Estimated Effort:** Medium
**Dependencies:** TASK-288-01, TASK-288-02, TASK-288-03, TASK-288-04, TASK-288-05, TASK-288-06
**Status:** To Do

---

## Overview

Close the Tabs-specific Playwright follow-up family once implementation leaves
finish.

This leaf updates report evidence, widget documentation, task-board state,
changelog entries, and final validation notes for `TASK-288`. It must preserve
the separation between Tabs-specific work and shared TASK-256 work.

## Scope Boundary

This leaf does not implement new Tabs behavior. It verifies landed behavior,
updates source-of-truth docs, and records any explicitly deferred product rows.

Shared rows owned by TASK-256 must remain linked to TASK-256. Do not mark them
fixed by TASK-288 unless the relevant TASK-256 commit has actually landed on the
same branch and the report evidence names that commit/task.

## Sub-Tasks

- [ ] Re-read `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` and build a
  row-by-row fixed/deferred/routed matrix.
- [ ] Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` with final status notes
  for TASK-288 rows and explicit links back to TASK-256 for shared rows.
- [ ] Update `_docs/_WIDGETS/TABS.md` with final schema, editor, runtime,
  accessibility, preview, and testing contracts.
- [ ] Update `_docs/_TASKS/TASK-288*.md` statuses to `Done (YYYY-MM-DD)` only
  after implementation and validation land.
- [ ] Move TASK-288 rows from `To Do` to `Done` in `_docs/_TASKS/README.md` and
  recompute task statistics.
- [ ] Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` with the exact task IDs.
- [ ] Run final validation commands and record any skipped lane with a concrete
  blocker.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` | Add final TASK-288 fixed/deferred/routed evidence. |
| `_docs/_WIDGETS/TABS.md` | Document final Tabs data/editor/runtime contract. |
| `_docs/_TASKS/TASK-288*.md` | Update statuses, acceptance notes, and validation evidence. |
| `_docs/_TASKS/README.md` | Move rows and recompute statistics. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-288-tabs-widget-followups.md` | Add final changelog entry. |
| `_docs/_CHANGELOG/README.md` | Index the changelog entry. |

## Implementation Pseudocode

```ts
type ReportRowStatus = "fixed-by-task-288" | "routed-to-task-256" | "deferred";

function classifyTabsReportRow(rowId: string): ReportRowStatus {
  if (sharedTask256Rows.has(rowId)) return "routed-to-task-256";
  if (implementedTask288Rows.has(rowId)) return "fixed-by-task-288";
  return "deferred";
}

function assertBoardCounts(rows: TaskBoardRow[]) {
  return {
    todo: rows.filter((row) => row.status === "To Do").length,
    inProgress: rows.filter((row) => row.status === "In Progress").length,
    done: rows.filter((row) => row.status === "Done").length,
  };
}
```

Closure checklist:

```md
- REPORT rows C1/W1/...: fixed by TASK-288 leaf and commit SHA
- REPORT rows C2/R4/...: routed to TASK-256 historical evidence or TASK-328 shared follow-up with current status
- Docs updated: _docs/_WIDGETS/TABS.md
- Validation: exact commands and result
```

Error handling:

- If a shared TASK-256 or TASK-328 row is still open, leave it open/routed
  instead of claiming TASK-288 closure.
- If a validation lane cannot run, record the blocker and keep the task open
  unless the user explicitly accepts closure with that blocker.
- If `_docs/_TASKS/README.md` has adjacent agent changes, preserve all newer
  unrelated task rows and recompute counts from the final visible tables.

## Regression Test Shape

- Re-read every formal report row ID and record whether it is fixed by a
  TASK-288 leaf, routed to TASK-256 historical evidence, routed to TASK-328, or
  explicitly deferred with a reason.
- Verify `_docs/_WIDGETS/TABS.md`, `_docs/_TASKS/TASK-288*.md`,
  `_docs/_TASKS/README.md`, and `_docs/_CHANGELOG/README.md` all reflect the
  same final task state and validation evidence.
- Re-run the exact targeted lint/test/security commands listed in this leaf and
  record any unavoidable skips with a concrete blocker.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: verify implementation leaves updated schema tests
  when schema changed.
- Anti-abuse: docs must not include secrets, tokens, private URLs, or raw
  browser session artifacts.
- Secret handling: redact any local IDs or environment values that are not
  already public docs data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if any TASK-288 leaf changed
  Tabs schema/defaults
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md`
- `_docs/_WIDGETS/TABS.md`
- `_docs/_TASKS/TASK-288*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-288-tabs-widget-followups.md`
- `_docs/_CHANGELOG/README.md`

## Changelog Policy

- This leaf creates or verifies the final TASK-288 changelog entry.
- The changelog must list all completed TASK-288 leaf IDs and distinguish
  shared TASK-256 rows that are only routed, not implemented by TASK-288.

## Acceptance Criteria

- Every Tabs report finding has a current fixed/deferred/routed status.
- `_docs/_WIDGETS/TABS.md` matches the implemented schema/editor/runtime
  contract.
- Task statuses, task-board rows, task-board statistics, and changelog index are
  synchronized.
- Required validation evidence is recorded and no shared TASK-256 work is
  falsely claimed as TASK-288 scope.
