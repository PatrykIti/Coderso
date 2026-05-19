# TASK-271-03: Grid Columns Responsive Order, Visibility, and Wide Breakpoints

# FileName: TASK-271-03_Grid_Columns_Responsive_Order_Visibility_and_Wide_Breakpoints.md

**Priority:** High
**Category:** Widgets + Grid Columns + Responsive Runtime
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-05-01, TASK-271-01, TASK-271-02
**Status:** Done (2026-05-19)

---

## Overview

Add Grid Columns-specific responsive product controls for mobile ordering,
per-column visibility, and wide-screen span behavior.

This leaf owns report findings W3, W4, and W6.

Residual span-truthfulness and overflow fallout discovered during this audit are
shared structural follow-up scope in TASK-313. This leaf does not add a second
overflow guard while that shared work remains open.

## Scope

- Add a widget-level `reverseOnMobile` or equivalent bounded option that reverses
  visual order below the tablet breakpoint.
- Add per-column visibility controls such as `hideOnMobile`, `hideOnTablet`, and
  `hideOnDesktop` only if their runtime output remains accessible and predictable.
- Add explicit optional `xlSpan` and `2xlSpan` support for wide monitors beyond
  the current `lg` desktop span.
- Add runtime class mapping and normalized defaults for new responsive fields.

Out of scope:

- Replacing the 12-column span model with arbitrary CSS grid templates.
- Custom CSS classes per column.
- General page-preview device switcher behavior outside this widget.

## Sub-Tasks

- [x] Add a bounded mobile reverse option to the Grid Columns layout model.
- [x] Add per-column breakpoint visibility fields and editor controls.
- [x] Add explicit `xl` and `2xl` wide-breakpoint span support.
- [x] Add schema, runtime, editor, and validator coverage for responsive fields.
- [x] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Extend types, schema, defaults, normalizer, class maps, and runtime rendering for responsive fields. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add Visual/Advanced controls for mobile reverse, visibility, and wide spans. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover normalization, class output, legacy fallback, and hidden-column behavior. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover responsive controls and editor state updates. |
| `tests/unit/widgets/validator.test.ts` | Add schema acceptance/rejection for any new persisted fields. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document responsive options and breakpoint behavior. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark W3/W4/W6 fixed/deferred with textual evidence, and route P3 to TASK-313. |

## Implementation Pseudocode

Schema shape:

```ts
type GridColumnsColumn = {
  id?: string;
  label?: string;
  desktopSpan?: GridColumnsSpan;
  tabletSpan?: GridColumnsSpan;
  mobileSpan?: GridColumnsSpan;
  xlSpan?: GridColumnsSpan;
  twoXlSpan?: GridColumnsSpan;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
};

type GridColumnsLayout = {
  gapX?: GridColumnsGap;
  gapY?: GridColumnsGap;
  align?: GridColumnsAlign;
  reverseOnMobile?: boolean;
};
```

Runtime classes:

```ts
function resolveColumnResponsiveClasses(column: ResolvedGridColumn) {
  return joinClasses(
    column.hideOnMobile ? "hidden md:block" : undefined,
    column.hideOnTablet ? "md:hidden lg:block" : undefined,
    column.hideOnDesktop ? "lg:hidden" : undefined,
    spanClassMap[column.mobileSpan],
    tabletSpanClassMap[column.tabletSpan],
    desktopSpanClassMap[column.desktopSpan],
    column.xlSpan ? xlSpanClassMap[column.xlSpan] : undefined,
    column.twoXlSpan ? twoXlSpanClassMap[column.twoXlSpan] : undefined
  );
}
```

Error handling:

- Visibility controls must not hide all columns without a warning or explicit
  editor diagnostic.
- New wide-breakpoint fields must be optional so existing payloads render
  exactly as before.
- If multiple visibility toggles conflict, normalize to the safest visible
  fallback and show editor feedback.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update `gridColumnsSchema` and validator tests for
  every new persisted responsive field.
- Anti-abuse: hidden columns must not be used to hide privileged data; widget
  data remains public render data.
- Secret handling: no secrets in hidden column content or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts` if defaults/registry output
  changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with responsive ordering, visibility,
  and wide-breakpoint behavior.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` for W3, W4, W6, and
  route P3 through TASK-313.
- Update TASK-271-07 closure matrix.

## Acceptance Criteria

- Mobile order can be reversed through a bounded widget-owned option.
- Per-column visibility is schema-validated, normalized, and covered by runtime
  tests.
- Wide breakpoint support includes explicit optional `xl` and `2xl` span
  fields and remains backward compatible.

## Completion Notes

- 2026-05-19: Grid Columns now owns `reverseOnMobile`,
  `hideOnMobile/hideOnTablet/hideOnDesktop`, and optional `xlSpan` /
  `twoXlSpan` fields end-to-end in schema, normalizer, runtime, and editor.
- 2026-05-19: the editor surfaces explicit warnings when every column is hidden
  for a breakpoint instead of silently allowing a blank responsive state.
