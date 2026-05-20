# TASK-325: Grid Columns Shared Structural Truthfulness Follow-up

# FileName: TASK-325_Grid_Columns_Shared_Structural_Truthfulness_Followup.md

**Priority:** High
**Category:** Widgets + Grid Columns + Shared Contract + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-05-01, TASK-293
**Status:** To Do

---

## Overview

Close the residual Grid Columns shared-contract drift that stayed open after the
TASK-256 family was marked done.

This task exists because the 2026-05-19 TASK-271 audit confirmed several report
findings are still structural truthfulness issues in the live checkout, so they
must not be patched ad hoc inside the Grid Columns product-expansion family.

## Scope

- Make the existing `asymmetric` variant truthful for already-normalized saved
  spans, either by applying the variant atomically or by surfacing explicit
  inactive-control guidance.
- Preserve and visibly represent CSS-variable color values in the shared Grid
  Columns color-control path instead of pretending the color input is exact when
  the saved value is `var(--color-...)`.
- Add current-control span feedback for the existing Grid Columns span selects:
  current totals, invalid-total feedback, and explicit user-facing guidance when
  a chosen layout overflows the 12-column contract.
- Remove or gate inactive cardize-only Advanced controls when cardized styling
  is off, preserving truthful mode ownership.
- Decide whether any residual public overflow fallout from invalid span totals
  is fully closed by the editor feedback or needs a second bounded runtime
  guardrail. Record the exact decision in report/docs/tests.

Out of scope:

- Grid Columns product expansion already owned by TASK-271 (`reverseOnMobile`,
  per-column visibility, wide breakpoints, per-column surface overrides,
  min-height tokens, new gap tokens, presets, etc.).
- Raw custom CSS classes or arbitrary style strings.
- Reopening public placeholder or technical-label leakage already closed by
  TASK-256.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:64-67,90-91,105,121,132,173,218,224-227,246`
- `_docs/_TASKS/TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md`
- `core/widgets/core/gridColumns.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `tests/vitest/widgets/gridColumns.test.tsx`
- `tests/vitest/ui/grid-columns-editor-wave.test.tsx`

## Sub-Tasks

- [ ] Make `asymmetric` truthful for existing span data.
- [ ] Repair shared CSS-variable picker truthfulness for Grid Columns controls.
- [ ] Add span-total feedback and invalid-layout guidance for current controls.
- [ ] Hide or disable inactive cardize-only Advanced controls when cardize is off.
- [ ] Decide and document the final P3 overflow position once span feedback lands.
- [ ] Update report/docs/changelog/board ownership when the shared slice closes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Add any variant-truthfulness/runtime helper needed for existing span data and the final overflow decision. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add shared structural truthfulness feedback for variant, span totals, CSS-variable picker state, and inactive cardize controls. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover runtime truthfulness for asymmetric/current span behavior and any residual overflow decision. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover picker truthfulness, span-total feedback, and cardize-control gating. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Move the affected findings out of TASK-271 and record final shared evidence. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document the final shared structural contracts once shipped. |
| `_docs/_TASKS/README.md` | Keep board status/counts synchronized. |

## Implementation Notes

- Reuse the existing shared color-input seam; do not fork a widget-only picker.
- If variant truthfulness mutates saved span data, keep the update atomic and
  fully regression-tested.
- Span-total feedback must stay deterministic and machine-testable; avoid
  browser-only heuristics.
- Do not claim TASK-271 closed any of these findings while TASK-325 is still open.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve the existing strict schema unless this
  task deliberately adds a bounded persisted field with matching validator tests.
- Anti-abuse: no raw HTML, scripts, arbitrary classes, or arbitrary CSS values.
- Secret handling: no secrets in widget data, diagnostics, or report evidence.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md`.
- Update `_docs/_TASKS/README.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when TASK-325 closes.

## Acceptance Criteria

- The live checkout no longer presents misleading `asymmetric`, span, color, or
  cardize-control states for existing Grid Columns controls.
- TASK-271 can continue as a widget-local product family without inheriting
  closed-but-unresolved shared structural findings.
- Report/task/doc ownership for the affected findings is unambiguous.
