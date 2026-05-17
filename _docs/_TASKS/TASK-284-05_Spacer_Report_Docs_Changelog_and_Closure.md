# TASK-284-05: Spacer Report Docs Changelog and Closure

# FileName: TASK-284-05_Spacer_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-284-01, TASK-284-02, TASK-284-03, TASK-284-04, TASK-256-08, TASK-284
**Status:** To Do

---

## Overview

Close the Spacer-specific Playwright follow-up family after implementation
leaves land.

This leaf owns final evidence and docs synchronization for
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`. It must verify that every Spacer
report row is either fixed by TASK-256, fixed by TASK-284, marked no-action, or
explicitly deferred with a reason.

## Scope Boundary

In scope:

- report status refresh for Spacer findings;
- widget docs updates;
- task board and changelog closure;
- final validation evidence for the family;
- checking that TASK-284 did not claim TASK-256 shared-contract rows.

Out of scope:

- implementing the shared TASK-256 token/mode/guide repairs;
- adding new Spacer product fields beyond the implementation leaves;
- committing PNG screenshots as evidence.

## Sub-Tasks

- [ ] Re-run or review the final Spacer admin/frontend evidence after all
  implementation leaves are complete.
- [ ] Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` so each row has a final
  classification: `fixed-task-256`, `fixed-task-284`, `no-action`, or
  `deferred`.
- [ ] Update `_docs/_WIDGETS/SPACER.md` with final schema, editor, runtime,
  preset, length, and orientation behavior.
- [ ] Update `_docs/WIDGETS.md` and `_docs/WIDGET_PACK_MATRIX.md` only when the
  final work changes shared widget or pack contracts.
- [ ] Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-284 and completed leaves to `Done` and update
  `_docs/_TASKS/README.md` statistics.
- [ ] Confirm PNG screenshot names in the Playwright report remain local labels
  and no screenshot files are staged.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` | Add final textual fixed/deferred/TASK-256/no-action evidence for each report row. |
| `_docs/_WIDGETS/SPACER.md` | Document final user-facing Spacer contract. |
| `_docs/WIDGETS.md` | Update only if shared widget contract text changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Spacer pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-284*.md` | Move completed tasks to `Done` with dates and validation notes. |
| `_docs/_TASKS/README.md` | Move completed rows and recompute statistics. |
| `_docs/_CHANGELOG/NNN-YYYY-MM-DD-task-284-spacer-widget-playwright-product-followups.md` | Add final changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog entry to the index. |

## Implementation Pseudocode

Report classification:

```ts
type SpacerReportStatus =
  | "fixed-task-256"
  | "fixed-task-284"
  | "no-action"
  | "deferred";

type SpacerReportRow = {
  id: "BUG-01" | "BUG-02" | "BUG-03" | "BUG-04" | "UX-01" | string;
  status: SpacerReportStatus;
  ownerTask: "TASK-256" | "TASK-284-01" | "TASK-284-02" | "TASK-284-03" | "TASK-284-04" | string;
  evidence: string;
};
```

Closure flow:

```md
1. Verify TASK-256 final notes for rows excluded from TASK-284.
2. Verify each TASK-284 implementation leaf has tests and docs evidence.
3. Update the report with textual evidence and keep PNGs ignored.
4. Move task statuses only after docs/changelog/validation are complete.
```

Error handling:

- If TASK-256 has not landed a required shared fix, keep the corresponding
  TASK-284 row open or deferred; do not mark it fixed by proxy.
- If a report row still lacks evidence, leave TASK-284-05 open and create or
  update a physical follow-up leaf.
- If `_docs/_TASKS/README.md` has concurrent changes, preserve all other task
  families and recompute counts instead of replacing the table wholesale.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm implementation leaves updated
  schema tests for any new fields.
- Anti-abuse: closure must verify no raw CSS/script/HTML, unsafe attributes, or
  unbounded class names were introduced by TASK-284.
- Secret handling: no secrets, private URLs, tokens, screenshots with sensitive
  data, or privileged settings in reports, changelog, or docs.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  token/custom length adjacency changed in the family.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  markers or output shape changed in the family.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed
  in the family.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.
- Update `_docs/_WIDGETS/SPACER.md`.
- Update `_docs/WIDGETS.md` only if shared widget text changed.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changed.
- Update `_docs/_TASKS/README.md`.
- Add and index the TASK-284 changelog entry.

## Changelog Policy

- This leaf creates or verifies the final TASK-284 changelog entry before moving
  TASK-284 to `Done`.
- The changelog entry must list TASK-284 and every completed child leaf.

## Acceptance Criteria

- Every row in `REPORT_SPACER_WIDGET.md` has a final status and evidence.
- TASK-284 does not claim TASK-256 shared-contract fixes as its own.
- Spacer docs, task statuses, board statistics, and changelog are synchronized.
- Final validation commands are recorded with pass/fail status and any skipped
  lane has a concrete blocker.
- No PNG screenshots or unrelated widget-family edits are staged.
