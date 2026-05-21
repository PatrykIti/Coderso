# TASK-325: Grid Columns Shared Structural Truthfulness Follow-up

# FileName: TASK-325_Grid_Columns_Shared_Structural_Truthfulness_Followup.md

**Priority:** High
**Category:** Widgets + Grid Columns + Shared Contract + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-05-01, TASK-293
**Status:** Done (2026-05-21)

---

## Overview

Close the residual Grid Columns shared-contract drift that stayed open after the
TASK-256 family was marked done.

This task exists because the 2026-05-19 TASK-271 audit confirmed several report
findings are still structural truthfulness issues in the live checkout, so they
must not be patched ad hoc inside the Grid Columns product-expansion family.
This parent is an umbrella only. Execution must land through the physical
`TASK-325-*` leaves below so the shared Grid Columns residuals can ship in
dependency order and close with explicit report/docs ownership.

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

- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`
- `_docs/_TASKS/TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md`
- `core/widgets/core/gridColumns.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `tests/vitest/widgets/gridColumns.test.tsx`
- `tests/vitest/ui/grid-columns-editor-wave.test.tsx`

## Sub-Tasks

- [x] TASK-325-01: Grid Columns Asymmetric Variant Truthfulness
- [x] TASK-325-02: Grid Columns Span Total Feedback and Invalid Layout Guidance
- [x] TASK-325-03: Grid Columns CSS Variable Picker Truthfulness
- [x] TASK-325-04: Grid Columns Cardize Control Gating
- [x] TASK-325-05: Grid Columns Overflow Guard Decision
- [x] TASK-325-06: Grid Columns Report Docs Changelog and Closure

## Files to Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-325*.md` | Keep the parent and physical leaves synchronized as the shared residuals move through dependency order. |
| `_docs/_TASKS/README.md` | Track `TASK-325` plus every physical `TASK-325-*` row and keep board statistics synchronized. |
| `core/widgets/core/gridColumns.tsx` | Add any variant-truthfulness/runtime helper needed for existing span data and the final overflow decision. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add shared structural truthfulness feedback for variant, span totals, CSS-variable picker state, and inactive cardize controls. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover runtime truthfulness for asymmetric/current span behavior and any residual overflow decision. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover picker truthfulness, span-total feedback, and cardize-control gating. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Move the affected findings out of TASK-271 and record final shared evidence. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document the final shared structural contracts once shipped. |
| `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` | Add closure evidence only when the final `TASK-325-06` leaf lands. |

## Implementation Order

1. Land `TASK-325-01` before any conditional runtime decision so the
   `asymmetric` controls become truthful first.
2. Land `TASK-325-02` next so current span totals and invalid-layout guidance
   exist before deciding whether runtime overflow guardrails are still needed.
3. Land `TASK-325-03` and `TASK-325-04` to close the remaining editor truth
   gaps around CSS-variable representation and inactive cardize controls.
4. Land `TASK-325-05` only after the editor feedback leaves above are in place.
   It owns the conditional runtime-guard decision and any narrow runtime follow-up.
5. Land `TASK-325-06` last for report/docs/changelog/board closure.

## Implementation Pseudocode

Parent orchestration only:

1. Route each residual drift to one physical `TASK-325-*` owner.
2. Keep runtime changes behind the latest possible leaf (`TASK-325-05`) so
   editor truthfulness lands first.
3. Use `TASK-325-06` to reconcile the final report/docs/changelog state only
   after the implementation leaves and validations are done.

Helper shape:

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

function resolveAsymmetricVariantState(columns: ColumnData[]) {
  if (matchesAsymmetricPreset(columns)) return { mode: "preset" as const };
  if (hasCustomSpanDistribution(columns)) {
    return {
      mode: "custom" as const,
      message: "Custom spans override the asymmetric preset until you reapply it.",
    };
  }
  return { mode: "equal" as const };
}
```

Data flow:

- The parent task owns only scope routing, dependency order, and closure policy.
- Each physical `TASK-325-*` leaf owns its own concrete helper shape, error
  handling, validation evidence, and docs updates.
- `gridColumns.tsx` changes only in leaves that need runtime behavior
  (`TASK-325-01` and conditionally `TASK-325-05`).
- `GridColumnsEditors.tsx` changes in the editor-truthfulness leaves
  (`TASK-325-01` through `TASK-325-04`).

Error handling:

- Do not mix the conditional overflow-runtime decision into earlier editor-only
  leaves; keep that decision isolated to `TASK-325-05`.
- If a proposed fix requires widening schema or adding a new persisted field,
  stop and split or update the exact owning leaf instead of hiding the scope in
  this parent.
- If shared color-input behavior or cardize gating turns out to affect other
  widgets, record that explicitly in the owning leaf and prove why the change
  remains safe for Grid Columns before closure.

Regression-test shape:

- `TASK-325-01` and `TASK-325-02` own the current span/runtime truthfulness
  tests.
- `TASK-325-03` and `TASK-325-04` own the editor-wave truthfulness tests for
  CSS-variable representation and inactive cardize controls.
- `TASK-325-05` owns the final runtime-guard proof only if the runtime decision
  is approved.
- `TASK-325-06` owns final validation-note and report/docs evidence only.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve the existing strict schema unless this
  task deliberately adds a bounded persisted field with matching validator tests.
- Anti-abuse: no raw HTML, scripts, arbitrary classes, or arbitrary CSS values.
- Secret handling: no secrets in widget data, diagnostics, or report evidence.

## Testing Requirements

- Docs-only planning changes in this parent:
  - `git diff --check`
  - `bun run precommit`
- Each physical `TASK-325-*` leaf owns the concrete runtime/editor test commands
  it needs.

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.
- Update `_docs/_WIDGETS/GRID_COLUMNS.md`.
- Update `_docs/_TASKS/README.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when
  `TASK-325-06` closes the family.

## Acceptance Criteria

- The live checkout no longer presents misleading `asymmetric`, span, color, or
  cardize-control states for existing Grid Columns controls.
- TASK-271 can continue as a widget-local product family without inheriting
  closed-but-unresolved shared structural findings.
- Report/task/doc ownership for the affected findings is unambiguous, with each
  implementation area routed through a physical `TASK-325-*` leaf.

## Outcome

- `asymmetric` selection is now truthful: both Wizard and Visual variant selection reapply the current live-slot desktop preset, while drifted saved desktop spans surface explicit state and a reapply action that follows live slot order instead of raw `columns[]` order.
- Grid Columns now shows current desktop/tablet/mobile span totals from the effective visible live layout, keeps row-level controls and layout presets aligned to the current live slot order, derives repeatable column instance ids from `column:<id>` slot targets when needed, and explains whether each breakpoint fills one row, wraps onto additional rows, or leaves unused width.
- CSS-variable color values were already preserved correctly by the landed shared clearable-field contract; TASK-325 adds Grid Columns-specific regression coverage instead of widening that shared owner again.
- Cardize-only controls now hide or disable truthfully when cardized styling is off, and `masonry-lite` keeps the cardized contract locked on with explicit copy.
- `TASK-325-05` closed with an explicit runtime rejection: `gridColumnsOverflowDecision = "no-runtime-guard"`. Runtime keeps saved spans as authored and does not auto-balance them.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` - passed (`30` tests)
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx` - passed (`26` tests)
- `bun test tests/unit/widgets/validator.test.ts` - passed (`19` tests in `1` file, `38` expect() calls); the generic validator lane stayed green while Grid Columns-specific schema proof remains in `gridColumns.test.tsx`
- Family-wide lint/types/gates/precommit/diff/security results are recorded in `TASK-325-06`.

## Completion Notes

- 2026-05-21: the TASK-325 family is closed. The shared Grid Columns residuals from the report no longer sit in deferred/shared limbo, and the final no-runtime-guard decision is explicit in code, docs, and tests.
