# TASK-325-02: Grid Columns Span Total Feedback and Invalid Layout Guidance

# FileName: TASK-325-02_Grid_Columns_Span_Total_Feedback_and_Invalid_Layout_Guidance.md

**Priority:** High
**Category:** Shared Widgets + Grid Columns + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-325-01
**Status:** To Do

---

## Overview

Add current desktop/tablet/mobile span-total feedback for Grid Columns and make
invalid layouts explicit in the editor.

This leaf owns editor feedback only. It must not decide the final runtime guard
position; that stays in `TASK-325-05`.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Derive current per-breakpoint totals and show deterministic warning text when a total differs from `12`. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover current total feedback and invalid-layout guidance across desktop/tablet/mobile controls. |

## Implementation Pseudocode

```ts
type GridSpanTotals = {
  desktop: number;
  tablet: number;
  mobile: number;
};

function calculateGridSpanTotals(columns: ColumnData[]): GridSpanTotals {
  return {
    desktop: sumSpans(columns, "desktopSpan"),
    tablet: sumSpans(columns, "tabletSpan"),
    mobile: sumSpans(columns, "mobileSpan"),
  };
}
```

## Data Flow

1. Normalize the current columns first.
2. Derive desktop/tablet/mobile totals from the live editor values.
3. Render explicit warnings whenever a total differs from `12`.
4. Keep the warnings deterministic so later runtime-decision work can rely on
   the same totals.

Error handling:

- Do not auto-correct or silently clamp user selections in this leaf.
- If current totals are invalid, show explicit guidance instead of hiding the
  state.
- Do not add runtime fallback behavior here; only record the editor truth.

Regression-test shape:

```ts
test("grid columns warns when current desktop or tablet totals are not 12", () => {
  expect(calculateGridSpanTotals(invalidColumns)).toMatchObject({ desktop: 13 });
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` only if the finding
  status/evidence changes before closure.

## Acceptance Criteria

- Current span totals are visible for desktop, tablet, and mobile.
- Invalid totals are explained explicitly instead of remaining implicit.
- The runtime-guard decision remains deferred to `TASK-325-05`.

