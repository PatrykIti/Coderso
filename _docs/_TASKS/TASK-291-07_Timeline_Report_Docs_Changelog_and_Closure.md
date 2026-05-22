# TASK-291-07: Timeline Report Docs Changelog and Closure

# FileName: TASK-291-07_Timeline_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Playwright QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-299, TASK-291-01, TASK-291-02, TASK-291-03, TASK-291-04, TASK-291-05, TASK-291-06
**Status:** Done (2026-05-22)

---

## Overview

Close the Timeline-specific Playwright follow-up family after implementation
leaves land.

This leaf owns textual evidence updates for
`_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`, Timeline widget docs,
task-board status changes, and changelog closure. It does not implement
production fixes by itself.

Final outcome: no live Playwright rerun was captured in this isolated
worktree because the report environments were not booted; closure evidence
comes from targeted Timeline SSR/editor/validator coverage plus final repo
validation commands.

## Sub-Tasks

- [x] Re-run or refresh admin preview evidence for each completed TASK-291 row.
- [x] Re-run or refresh frontend evidence for each completed TASK-291 row.
- [x] Mark every source report finding as `fixed`, `shared-physical-owner`,
  `deferred`, `blocked-pending-owner`, or `not-reproducible`, with a concrete
  task ID and reason.
- [x] For NEW, record exact TASK-256-01 evidence; never close it with broad
  `TASK-256` ownership only.
- [x] For W7, reference exact `TASK-299` shared-contrast evidence; do not mark
  it `blocked-pending-owner` and do not use generic TASK-256-08 as the
  implementation owner.
- [x] Update `_docs/_WIDGETS/TIMELINE.md` with final data/editor/runtime
  behavior.
- [x] Update `_docs/_WIDGETS/README.md` and `_docs/WIDGETS.md` if their Timeline
  summaries still say the widget is date-free; update
  `core/widgets/modulePackMatrix.ts` or `_docs/WIDGET_PACK_MATRIX.md` only when
  an implementation leaf changed those source-of-truth contracts.
- [x] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [x] Move TASK-291 and completed leaves to `Done`, update dates, and sync
  `_docs/_TASKS/README.md` statistics.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` | Add fixed/deferred/routed status and textual admin/frontend evidence. |
| `_docs/_WIDGETS/TIMELINE.md` | Document final Timeline contract after implementation. |
| `_docs/_WIDGETS/README.md` | Remove stale Timeline "bez dat" summary if live Timeline date/dateLabel behavior remains part of the contract. |
| `_docs/WIDGETS.md` | Remove stale Timeline "bez dat" summary if needed; otherwise update only if shared contract changes. |
| `_docs/ARCHITECTURE.md` | Remove stale Timeline "bez dat" summary if that inventory line still describes the widget as date-free. |
| `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-291*.md` | Status/date updates for umbrella and leaves. |
| `_docs/_TASKS/README.md` | Board row/status/stat updates. |
| `_docs/_CHANGELOG/*.md`, `_docs/_CHANGELOG/README.md` | Final changelog entry and index update. |

## Implementation Pseudocode

```ts
type TimelineFindingStatus =
  | "fixed"
  | "shared-physical-owner"
  | "deferred"
  | "blocked-pending-owner"
  | "not-reproducible";

type TimelineClosureRow = {
  findingId: string;
  status: TimelineFindingStatus;
  ownerTask: string;
  evidence: string;
  validationCommands: string[];
};

const sharedOwnerAllowList = new Set([
  "TASK-256-01",
  "TASK-256-04",
  "TASK-299",
]);

function isAllowedSharedOwner(row: TimelineClosureRow) {
  return sharedOwnerAllowList.has(row.ownerTask);
}

function buildTimelineClosureMatrix(rows: TimelineClosureRow[]) {
  return rows.map((row) => ({
    ...row,
    evidence: redactPrivateRuntimeValues(row.evidence),
  }));
}
```

Closure flow:

1. Read all TASK-291 leaves and the source report.
2. Build a finding-by-finding closure matrix. Rows routed outside TASK-291 must
   use exact physical owner IDs, not umbrella-only `TASK-256`; W7 routes
   through `TASK-299` and must not remain `blocked-pending-owner`.
3. Update report evidence with textual DOM/admin/frontend results; do not add
   Playwright PNG artifacts.
4. Update docs and changelog.
5. Run final targeted validation plus required baseline gates.
6. Update task statuses and board statistics only after validation status is
   known.

Error handling:

- If Playwright replay is blocked, record the exact blocker and use
  Vitest/SSR evidence only when it directly covers the finding.
- If a finding was actually shared-contract scope, record the exact shared
  physical owner task ID (for example `TASK-256-01` or `TASK-299`) and do not
  mark it fixed by TASK-291. Generic `TASK-256-06-03` or `TASK-256-08`
  references are not valid Timeline implementation owners.
- If broad suites fail for unrelated reasons, isolate with targeted commands
  and record the unrelated failure separately.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless a prior leaf changed schema.
- Anti-abuse: reports and changelog must not include secrets, raw privileged
  payloads, nonce values, private preview tokens, or unredacted provider data.
- Secret handling: redact runtime URLs/tokens where needed.

## Testing Requirements

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if any
  renderer leaf changed shared output
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  TASK-256-01 integration affects Timeline mode updates
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before final commit/closure

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/README.md` if the Timeline summary still says date-free
- `_docs/WIDGETS.md` if the Timeline summary still says date-free or a shared
  contract changed
- `_docs/ARCHITECTURE.md` if the Timeline summary still says date-free
- `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md` only if
  readiness changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/<next>-<date>-task-291-timeline-widget-followups.md`

## Changelog Policy

- This leaf creates or verifies the changelog entry that covers TASK-291 and
  all completed TASK-291 leaves.

## Acceptance Criteria

- Every row from `REPORT_TIMELINE_WIDGET.md` has an explicit final status and
  owner.
- Shared-contract or future-scope rows are not closed with generic TASK-256
  ownership; each row has an exact physical task ID and reason, and W7 points
  to `TASK-299` instead of remaining implicitly blocked.
- Timeline docs reflect the final schema/editor/runtime behavior.
- Task board, task files, changelog, and report evidence are synchronized.
- Required validation is green or the exact blocker is documented before any
  task is marked `Done`.
