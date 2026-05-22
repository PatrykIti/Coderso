# TASK-284-05: Spacer Report Docs Changelog and Closure

# FileName: TASK-284-05_Spacer_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-284-01, TASK-284-02, TASK-284-03, TASK-284-04, TASK-256-08, TASK-284
**Status:** Done (2026-05-21)

---

## Overview

Close the Spacer-specific Playwright follow-up family after implementation
leaves land.

Resolution (2026-05-21): the Spacer family is now closed. The report ends
with explicit final classifications for every BUG/UX/BF/A row, shared rows
stay attributed to `TASK-256-05-03` or `TASK-303`, Spacer-owned product rows
stay attributed to `TASK-284-01` through `TASK-284-04`, `UX-04`/`A1`/`A3`
are recorded as `no-action`, and BF-05 remains deferred to `TASK-328`.

## Scope Boundary

In scope:

- report status refresh for Spacer findings;
- widget docs updates;
- task board and changelog closure;
- final validation evidence for the family;
- checking that TASK-284 did not claim TASK-256 or TASK-303 shared rows.

Out of scope:

- implementing the shared TASK-256 token/mode/guide repairs;
- implementing deferred horizontal Spacer support from BF-05;
- committing PNG screenshots as evidence.

## Sub-Tasks

- [x] Re-run or review the final Spacer admin/frontend evidence after all
  implementation leaves are complete.
- [x] Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` so each row has a
  final classification: `fixed-task-256`, `fixed-task-303`,
  `fixed-task-284`, `no-action`, or `deferred`.
- [x] Update `_docs/_WIDGETS/SPACER.md` with final schema, editor, runtime,
  preset, guide, and orientation behavior.
- [x] Keep `_docs/WIDGETS.md` and `_docs/WIDGET_PACK_MATRIX.md` unchanged
  because this closure does not widen the shared widget or pack contract.
- [x] Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md`.
- [x] Move TASK-284 and completed leaves to `Done` and update
  `_docs/_TASKS/README.md` statistics.
- [x] Confirm PNG screenshot names in the Playwright report remain local
  labels and no screenshot files are staged.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` | Add the final family-level classification table and closure validation evidence for every Spacer report row. |
| `_docs/_WIDGETS/SPACER.md` | Document the final shipped Spacer contract, including vertical-only scope, guide behavior, and no-action accessibility boundary. |
| `_docs/WIDGETS.md` | No change required; shared widget contract text is unchanged by this closure leaf. |
| `_docs/WIDGET_PACK_MATRIX.md` | No change required; Spacer pack readiness is unchanged by this closure leaf. |
| `_docs/_TASKS/TASK-284*.md` | Move the parent and closure leaf to `Done` and record the final family outcome. |
| `_docs/_TASKS/README.md` | Move `TASK-284` and `TASK-284-05` to `Done`, remove `TASK-284-05` from `To Do`, and recompute statistics. |
| `_docs/_CHANGELOG/918-2026-05-21-task-284-spacer-widget-playwright-product-followups.md` | Add the final family changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the final family changelog entry to the index. |

## Implementation Pseudocode

Report classification:

```ts
type SpacerReportStatus =
  | "fixed-task-256"
  | "fixed-task-303"
  | "fixed-task-284"
  | "no-action"
  | "deferred";

type SpacerReportRow = {
  id:
    | "BUG-01"
    | "BUG-02"
    | "BUG-03"
    | "BUG-04"
    | "UX-01"
    | "UX-02"
    | "UX-03"
    | "UX-04"
    | "UX-05"
    | "BF-01"
    | "BF-02"
    | "BF-03"
    | "BF-04"
    | "BF-05"
    | "BF-06"
    | "BF-07"
    | "A1"
    | "A2"
    | "A3";
  status: SpacerReportStatus;
  ownerTask: string;
  evidence: string;
};
```

Closure flow:

```md
1. Verify TASK-256 and TASK-303 final notes for rows excluded from TASK-284.
2. Verify each TASK-284 implementation leaf has tests and docs evidence.
3. Add one final report table that classifies every report row.
4. Record family-level validation in one place.
5. Move the parent and closure leaf to Done only after docs/changelog/board
   state are synchronized.
```

Error handling:

- If a report row still lacks owner evidence, do not close the parent.
- If a row is intentionally not implemented, record `no-action` or
  `deferred` explicitly instead of leaving it implied.
- If `_docs/_TASKS/README.md` has concurrent changes, preserve other task
  families and recompute counts instead of replacing the table wholesale.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure confirms TASK-284 did not widen the
  persisted Spacer schema beyond the already-tested height contract.
- Anti-abuse: closure confirms TASK-284 did not introduce raw CSS/script/HTML,
  unsafe attributes, or unbounded class names.
- Secret handling: no secrets, private URLs, tokens, screenshots with
  sensitive data, or privileged settings are staged in reports, changelog,
  or docs.

## Testing Requirements

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/widgets/renderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.
- Update `_docs/_WIDGETS/SPACER.md`.
- Keep `_docs/WIDGETS.md` unchanged unless the shared widget text changes.
- Keep `_docs/WIDGET_PACK_MATRIX.md` unchanged unless pack readiness changes.
- Update `_docs/_TASKS/README.md`.
- Add and index the final TASK-284 changelog entry.

## Changelog Policy

- This leaf creates the final TASK-284 changelog entry before moving the
  parent task to `Done`.
- The changelog entry must list `TASK-284` and every completed child leaf.

## Acceptance Criteria

- Every row in `REPORT_SPACER_WIDGET.md` has a final status and evidence.
- TASK-284 does not claim TASK-256 or TASK-303 shared-contract fixes as its
  own.
- Spacer docs, task statuses, board statistics, and changelog are
  synchronized.
- Final validation commands are recorded with pass/fail status and any
  skipped lane has a concrete blocker.
- No PNG screenshots or unrelated widget-family edits are staged.

## Completion Notes (2026-05-21)

- The final report now classifies every Spacer row as
  `fixed-task-256`, `fixed-task-303`, `fixed-task-284`, `no-action`, or
  `deferred`.
- `UX-04`, `A1`, and `A3` are intentionally `no-action` under the current
  vertical-only, decorative Spacer contract.
- BF-05 remains deferred to `TASK-328` because a truthful horizontal Spacer
  still needs shared nested row-flow rendering ownership.
- `TASK-284` and `TASK-284-05` are now closed with final validation,
  changelog, and board sync.
