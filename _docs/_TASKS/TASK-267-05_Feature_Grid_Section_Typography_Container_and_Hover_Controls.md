# TASK-267-05: Feature Grid Section Typography, Container, and Hover Controls

# FileName: TASK-267-05_Feature_Grid_Section_Typography_Container_and_Hover_Controls.md

**Priority:** Medium
**Category:** Widgets + Feature Grid + Schema + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-267-04
**Status:** To Do

---

## Overview

Add bounded Feature Grid styling controls for section background, max-width,
header typography, card title typography, and card hover effects.

This is product styling scope local to Feature Grid. Do not move shared
clear/none semantics into this leaf; reuse TASK-242/TASK-244/TASK-256 helpers.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:309-328` - BF-06, BF-07,
  BF-09, BF-11, BF-12.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:398-402` - priority summary.
- `_docs/WIDGETS.md:185-227` - existing `none` and `Clear` contract for visual
  tokens.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/featureGrid.tsx` | Add bounded `style.sectionBackground`, `style.maxWidth`, `style.headerSize`, `style.cardTitleSize`, and `style.hoverEffect` fields with fixed class/style maps. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add Visual controls and, only if still appropriate after TASK-256, Advanced diagnostics for the new styling fields. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover normalized defaults, clear behavior where applicable, and fixed output classes/data markers. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Cover editor controls and key removal for clearable fields. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update if a new field uses `none`. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document the new styling controls. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Record fixed/deferred status for BF-06/BF-07/BF-09/BF-11/BF-12. |

## Implementation Pseudocode

```tsx
type FeatureGridMaxWidth = "5xl" | "6xl" | "7xl" | "full";
type FeatureGridHeaderSize = "sm" | "md" | "lg";
type FeatureGridCardTitleSize = "sm" | "md" | "lg";
type FeatureGridHoverEffect = "none" | "lift" | "border";

const maxWidthClassMap: Record<FeatureGridMaxWidth, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

function normalizeFeatureGridStyle(style: Partial<FeatureGridStyle> | undefined) {
  return {
    ...existingStyle,
    sectionBackground: resolveClearableStyleValue(style?.sectionBackground),
    maxWidth: resolveFeatureGridMaxWidth(style?.maxWidth),
    headerSize: resolveFeatureGridHeaderSize(style?.headerSize),
    cardTitleSize: resolveFeatureGridCardTitleSize(style?.cardTitleSize),
    hoverEffect: resolveFeatureGridHoverEffect(style?.hoverEffect),
  };
}

function getFeatureGridHoverClass(effect: FeatureGridHoverEffect) {
  if (effect === "lift") return "transition hover:-translate-y-0.5 hover:shadow-sm";
  if (effect === "border") return "transition hover:border-[var(--color-primary)]";
  return "";
}
```

Error handling:

- Unknown enums fall back to current defaults.
- Clearable `sectionBackground` must remove the field, not save an empty string
  or `transparent` sentinel.
- Hover effects must respect reduced-motion where transforms are used.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new schema fields must reject unknown values.
- Anti-abuse: all styling controls must use fixed maps or clearable-style
  helpers; do not accept arbitrary class names or CSS strings beyond existing
  color-token behavior.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  `none` token support changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-05_Feature_Grid_Section_Typography_Container_and_Hover_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Section background, container width, typography, and hover controls are visible
  in the Feature Grid editor and affect runtime output.
- New fields use fixed, documented enum maps or clearable-style helpers.
- Existing Feature Grid pages render the same when the new fields are absent.
