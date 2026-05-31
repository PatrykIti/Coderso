# TASK-325-05: Grid Columns Overflow Guard Decision

# FileName: TASK-325-05_Grid_Columns_Overflow_Guard_Decision.md

**Priority:** Medium
**Category:** Shared Widgets + Grid Columns + Runtime Render + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-325-01, TASK-325-02, TASK-325-03, TASK-325-04
**Status:** Done (2026-05-21)

---

## Overview

Decide whether invalid Grid Columns span totals still need a bounded runtime
guard after the editor-truthfulness leaves land.

This leaf owns the decision and any narrow runtime follow-up. It must not
reopen broader editor truthfulness or final closure chores.

## Sub-Tasks

- None. This is an execution-ready decision/implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Add a bounded runtime guard only if the editor-truthfulness leaves still leave misleading public overflow behavior. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover the final runtime decision, including the no-guard path if the decision is explicit rejection. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Record the exact P3 decision and evidence once it is made. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Update the runtime contract only if a bounded guard is approved. |

## Implementation Pseudocode

```ts
if (editorTruthfulnessNowFullyExplainsInvalidTotals()) {
  decision = "no-runtime-guard";
} else {
  decision = "add-bounded-runtime-guard";
}
```

## Data Flow

1. Re-read the editor state after `TASK-325-01` through `TASK-325-04`.
2. Confirm whether invalid totals can still create misleading public overflow.
3. Either document an explicit rejection of a runtime guard or add one bounded
   runtime decision path in `gridColumns.tsx`.

Error handling:

- Do not add a runtime guard only because the editor state is inconvenient to
  validate; the decision must be evidence-based.
- If a runtime guard is added, keep it narrow and deterministic rather than
  rewriting arbitrary saved layouts.
- If the decision is rejection, document that explicitly instead of leaving the
  P3 question implicit.

Regression-test shape:

```ts
test("grid columns records the final overflow decision explicitly", () => {
  expect(resolveOverflowDecision("no-runtime-guard")).toBe("no-runtime-guard");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless the runtime decision adds a new
  bounded persisted field, which is not expected.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md` if a bounded runtime guard is approved.

## Acceptance Criteria

- The final P3 overflow position is explicit.
- Any runtime guard that lands is bounded and tested.
- If no runtime guard lands, the rejection is documented with evidence.

## Decision Outcome (2026-05-21)

- The final decision is explicit rejection: no bounded runtime overflow guard was added.
- `gridColumnsOverflowDecision` is now `"no-runtime-guard"`.
- Runtime keeps saved spans as authored, while the editor now exposes current totals and row-fit consequences so wrap/unused-width behavior is no longer implicit.

## Completion Notes

- TASK-325-05 closes by documenting the runtime rejection in code, tests, report evidence, and widget docs instead of leaving P3 as an implicit follow-up.
