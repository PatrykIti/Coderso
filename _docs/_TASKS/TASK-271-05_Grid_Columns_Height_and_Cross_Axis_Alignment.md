# TASK-271-05: Grid Columns Height and Cross-Axis Alignment

# FileName: TASK-271-05_Grid_Columns_Height_and_Cross_Axis_Alignment.md

**Priority:** Medium
**Category:** Widgets + Grid Columns + Layout
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-271-03, TASK-271-04
**Status:** To Do

---

## Overview

Replace hardcoded column height behavior with bounded Grid Columns options for
minimum height and per-column cross-axis alignment.

This leaf owns report findings W2, W5, and P4.

## Scope

- Add min-height tokens that replace the hardcoded `min-h-[6rem]` behavior with
  a schema-owned default.
- Add a mobile-safe compact option or per-device min-height token if the
  implementation needs to reduce empty mobile space.
- Add per-column alignment override without removing the existing global
  `layout.align` default.
- Keep tokens bounded and design-system friendly.

Out of scope:

- Arbitrary height strings.
- CSS grid template editing.
- Full responsive device preview UI outside the Grid Columns editor.

## Sub-Tasks

- [ ] Add schema-owned min-height tokens with backward-compatible defaults.
- [ ] Add mobile-safe compact height behavior when needed.
- [ ] Add per-column alignment override fields and editor controls.
- [ ] Replace or wrap the hardcoded column min-height in runtime output.
- [ ] Add runtime, editor, and validator tests for height/alignment fields.
- [ ] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Add min-height and per-column align types/schema/defaults/class maps/runtime merge. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add Visual/Advanced controls for height and per-column alignment. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover default height, min-height tokens, mobile compact behavior, and per-column alignment output. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover height and alignment editor controls. |
| `tests/unit/widgets/validator.test.ts` | Cover new strict schema fields. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document height/alignment behavior. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark W2/W5/P4 fixed/deferred with textual evidence. |

## Implementation Pseudocode

Token shape:

```ts
const gridColumnsMinHeightTokens = ["none", "sm", "md", "lg", "xl"] as const;
const gridColumnsSelfAlignTokens = ["inherit", "start", "center", "end", "stretch"] as const;

type GridColumnsColumn = {
  id?: string;
  label?: string;
  minHeight?: GridColumnsMinHeight;
  mobileMinHeight?: GridColumnsMinHeight;
  alignSelf?: GridColumnsSelfAlign;
};
```

Runtime class merge:

```ts
function resolveColumnShellClasses(column: ResolvedGridColumn, layout: LayoutData) {
  const alignSelf = column.alignSelf === "inherit" ? undefined : column.alignSelf;
  return joinClasses(
    "h-full",
    minHeightClassMap[column.minHeight ?? "md"],
    mobileMinHeightClassMap[column.mobileMinHeight ?? column.minHeight ?? "md"],
    alignSelf ? selfAlignClassMap[alignSelf] : undefined,
    layout.align ? alignClassMap[layout.align] : undefined
  );
}
```

Error handling:

- `none` min-height must not collapse columns with nested content.
- If per-column align is `inherit`, renderer must continue using global
  `layout.align`.
- Existing payloads must render the same default height until the user changes
  the token.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: min-height and alignment fields must use enums.
- Anti-abuse: no arbitrary CSS height or class strings.
- Secret handling: no secrets in layout fields or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with height and per-column alignment
  options.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` for W2, W5, and P4.
- Update TASK-271-07 closure matrix.

## Acceptance Criteria

- The hardcoded `min-h-[6rem]` behavior is replaced or wrapped by a documented
  schema-owned token with backward-compatible default output.
- Users can reduce mobile empty space through a bounded control.
- A single column can override vertical alignment while other columns inherit
  the global alignment.
- Runtime and editor tests cover default, changed, and invalid-token behavior.
