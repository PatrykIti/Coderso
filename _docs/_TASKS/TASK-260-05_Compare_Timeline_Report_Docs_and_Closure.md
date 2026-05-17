# TASK-260-05: Compare Timeline Report Docs and Closure

# FileName: TASK-260-05_Compare_Timeline_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Playwright QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-260-01, TASK-260-02, TASK-260-03, TASK-260-04
**Status:** Done (2026-05-17)

---

## Overview

Close the Compare Timeline-specific Playwright follow-up family after the
implementation leaves land.

This leaf owns textual evidence updates for
`_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md`, Compare Timeline widget
docs, task-board status changes, and changelog closure. It does not implement
production fixes by itself.

## Sub-Tasks

- [ ] Re-run or refresh admin preview evidence for each completed TASK-260 row.
- [ ] Re-run or refresh frontend evidence for each completed TASK-260 row.
- [ ] Mark every source report finding as `fixed`,
  `task-256-physical-owner`, `deferred`, or `not reproducible`, with a concrete
  task ID and reason.
- [ ] For U4, W7, W8, and any other row outside TASK-260, record the exact
  physical owner task (`TASK-256-02`, `TASK-299`, `TASK-300`, or a later task
  ID); never close a row with broad umbrella ownership only.
- [ ] Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` with final data/editor/runtime
  behavior.
- [ ] Update `_docs/WIDGETS.md`, `core/widgets/modulePackMatrix.ts`, or
  `_docs/WIDGET_PACK_MATRIX.md` only when an implementation leaf changed those
  source-of-truth contracts.
- [ ] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-260 and completed leaves to `Done`, update dates, and sync
  `_docs/_TASKS/README.md` statistics.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` | Add fixed/deferred/routed status and textual admin/frontend evidence. |
| `_docs/_WIDGETS/COMPARE_TIMELINE.md` | Document final Compare Timeline contract after implementation. |
| `_docs/WIDGETS.md` | Update only if shared widget contract changes. |
| `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-260*.md` | Status/date updates for umbrella and leaves. |
| `_docs/_TASKS/README.md` | Board row/status/stat updates. |
| `_docs/_CHANGELOG/*.md`, `_docs/_CHANGELOG/README.md` | Final changelog entry and index update. |

## Implementation Pseudocode

```ts
type CompareTimelineFindingStatus =
  | "fixed"
  | "task-256-physical-owner"
  | "deferred"
  | "not-reproducible";

type CompareTimelineClosureRow = {
  findingId: string;
  status: CompareTimelineFindingStatus;
  ownerTask: string;
  evidence: string;
  validationCommands: string[];
};

const sharedOwnerAllowList = new Set([
  "TASK-256-01",
  "TASK-256-02",
  "TASK-256-05",
  "TASK-256-08",
]);

function buildClosureMatrix(rows: CompareTimelineClosureRow[]) {
  return rows.map((row) => ({
    ...row,
    evidence: redactPrivateRuntimeValues(row.evidence),
  }));
}
```

Closure flow:

1. Read all TASK-260 leaves and the source report.
2. Build a finding-by-finding closure matrix. Rows routed outside TASK-260 must
   use exact physical owner IDs, not umbrella-only `TASK-256`.
3. Update report evidence with textual DOM/admin/frontend results; do not add
   Playwright PNG artifacts.
4. Update docs and changelog.
5. Run final targeted validation plus required baseline gates.
6. Update task statuses and board statistics only after validation status is
   known.

Error handling:

- If Playwright replay is blocked, record exact blocker and use existing
  Vitest/SSR evidence only when it directly covers the finding.
- If a finding was actually shared-contract or future-scope work, record the
  exact physical owner task ID and do not mark it fixed by TASK-260. `U5` and
  `U10` are not shared closure rows anymore once TASK-260-04 adopts the
  settled shared contracts locally.
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
- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if any
  renderer leaf changed shared output
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before final commit/closure

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/WIDGETS.md` only if shared contract changed
- `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md` only if
  readiness changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/<next>-<date>-task-260-compare-timeline-widget-followups.md`

## Changelog Policy

- This leaf creates or verifies the changelog entry that covers TASK-260 and
  all completed TASK-260 leaves.

## Acceptance Criteria

- Every row from `REPORT_COMPARE_TIMELINE_WIDGET.md` has an explicit final
  status and owner.
- Shared-contract or future-scope rows are not closed with generic TASK-256
  ownership; each row has an exact physical task ID and reason.
- Compare Timeline docs reflect the final schema/editor/runtime behavior.
- Task board, task files, changelog, and report evidence are synchronized.
- Required validation is green or the exact blocker is documented before any
  task is marked `Done`.
