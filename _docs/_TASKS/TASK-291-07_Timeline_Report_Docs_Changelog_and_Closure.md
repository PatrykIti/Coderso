# TASK-291-07: Timeline Report Docs Changelog and Closure

# FileName: TASK-291-07_Timeline_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Playwright QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-291-01, TASK-291-02, TASK-291-03, TASK-291-04, TASK-291-05, TASK-291-06
**Status:** To Do

---

## Overview

Close the Timeline-specific Playwright follow-up family after implementation
leaves land.

This leaf owns textual evidence updates for
`_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`, Timeline widget docs,
task-board status changes, and changelog closure. It does not implement
production fixes by itself.

## Sub-Tasks

- [ ] Re-run or refresh admin preview evidence for each completed TASK-291 row.
- [ ] Re-run or refresh frontend evidence for each completed TASK-291 row.
- [ ] Mark every source report finding as `fixed`, `task-256-physical-owner`,
  `deferred`, or `not reproducible`, with a concrete task ID and reason.
- [ ] For NEW, record exact TASK-256-01 evidence; never close it with broad
  `TASK-256` ownership only.
- [ ] For W7, either reference a concrete shared contrast-validation physical
  task or mark it `blocked-pending-owner`; do not use generic TASK-256-08 as the
  implementation owner.
- [ ] Update `_docs/_WIDGETS/TIMELINE.md` with final data/editor/runtime
  behavior.
- [ ] Update `_docs/_WIDGETS/README.md` and `_docs/WIDGETS.md` if their Timeline
  summaries still say the widget is date-free; update
  `core/widgets/modulePackMatrix.ts` or `_docs/WIDGET_PACK_MATRIX.md` only when
  an implementation leaf changed those source-of-truth contracts.
- [ ] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-291 and completed leaves to `Done`, update dates, and sync
  `_docs/_TASKS/README.md` statistics.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` | Add fixed/deferred/routed status and textual admin/frontend evidence. |
| `_docs/_WIDGETS/TIMELINE.md` | Document final Timeline contract after implementation. |
| `_docs/_WIDGETS/README.md` | Remove stale Timeline "bez dat" summary if live Timeline date/dateLabel behavior remains part of the contract. |
| `_docs/WIDGETS.md` | Remove stale Timeline "bez dat" summary if needed; otherwise update only if shared contract changes. |
| `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-291*.md` | Status/date updates for umbrella and leaves. |
| `_docs/_TASKS/README.md` | Board row/status/stat updates. |
| `_docs/_CHANGELOG/*.md`, `_docs/_CHANGELOG/README.md` | Final changelog entry and index update. |

## Implementation Pseudocode

```ts
type TimelineFindingStatus =
  | "fixed"
  | "task-256-physical-owner"
  | "deferred"
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
]);

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
   use exact physical owner IDs, not umbrella-only `TASK-256`; W7 cannot close
   until a concrete contrast owner exists and otherwise remains
   `blocked-pending-owner`.
3. Update report evidence with textual DOM/admin/frontend results; do not add
   Playwright PNG artifacts.
4. Update docs and changelog.
5. Run final targeted validation plus required baseline gates.
6. Update task statuses and board statistics only after validation status is
   known.

Error handling:

- If Playwright replay is blocked, record the exact blocker and use
  Vitest/SSR evidence only when it directly covers the finding.
- If a finding was actually shared-contract scope, record the exact TASK-256
  physical owner task or future physical task ID and do not mark it fixed by
  TASK-291. Generic `TASK-256-06-03` or `TASK-256-08` references are not valid
  Timeline implementation owners.
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
  ownership; each row has an exact physical task ID and reason, or W7 remains
  explicitly blocked until such an owner exists.
- Timeline docs reflect the final schema/editor/runtime behavior.
- Task board, task files, changelog, and report evidence are synchronized.
- Required validation is green or the exact blocker is documented before any
  task is marked `Done`.
