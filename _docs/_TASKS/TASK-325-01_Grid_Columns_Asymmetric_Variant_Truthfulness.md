# TASK-325-01: Grid Columns Asymmetric Variant Truthfulness

# FileName: TASK-325-01_Grid_Columns_Asymmetric_Variant_Truthfulness.md

**Priority:** High
**Category:** Shared Widgets + Grid Columns + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-325
**Status:** To Do

---

## Overview

Make the existing `asymmetric` Grid Columns variant truthful for already-saved
span data.

This leaf owns the `asymmetric` state only. It must not absorb the broader
span-total feedback, CSS-variable picker, cardize gating, or closure work.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Make the `asymmetric` controls truthful for current normalized span data and expose explicit preset-vs-custom state. |
| `core/widgets/core/gridColumns.tsx` | Add or reuse the narrow runtime/helper logic needed to keep custom spans deterministic while `asymmetric` is selected. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover `asymmetric` preset application and custom-span truthfulness messaging. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover any runtime/helper behavior used to keep `asymmetric` output deterministic. |

## Implementation Pseudocode

```ts
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

## Data Flow

1. Read the current normalized columns.
2. Detect whether the desktop spans still match the `asymmetric` preset.
3. If the user reapplies `asymmetric`, update the current columns atomically
   through the existing block patch path.
4. If saved spans are already custom, keep them authoritative and surface
   explicit status copy instead of pretending the variant dropdown alone changed
   the layout.

Error handling:

- Do not silently rewrite custom spans just because the dropdown says
  `asymmetric`.
- If current columns cannot express the preset because the saved shape drifted,
  keep the custom data and explain the state explicitly.
- Do not mix span-total warnings or overflow-runtime guardrails into this leaf.

Regression-test shape:

```ts
test("grid columns reapplying asymmetric updates the current spans atomically", () => {
  expect(applyAsymmetricPreset(twoEqualColumns)[0]?.desktopSpan).toBe("8");
});

test("grid columns reports when custom spans override the asymmetric preset", () => {
  expect(resolveAsymmetricVariantState(customColumns)).toMatchObject({ mode: "custom" });
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless a bounded persisted field is added
  intentionally, which is not expected in this leaf.
- Anti-abuse: no raw HTML, arbitrary classes, or arbitrary CSS values.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` only if this leaf
  changes owner wording or evidence before closure.

## Acceptance Criteria

- Selecting `asymmetric` no longer implies a layout change that did not happen.
- Reapplying the preset updates the current columns atomically.
- Custom spans stay authoritative and are explained truthfully in the editor.

