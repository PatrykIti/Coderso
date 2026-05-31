# TASK-267-01: Feature Grid Variant Preview and Responsive Cards-4 Layout

# FileName: TASK-267-01_Feature_Grid_Variant_Preview_and_Responsive_Cards4.md

**Priority:** High
**Category:** Widgets + Feature Grid + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-06-01, TASK-267
**Status:** Done (2026-05-17)

---

## Overview

Add Feature Grid-owned visual previews for variant cards and repair the
`cards-4` responsive breakpoint so the selected four-card variant reads as four
cards on laptop/desktop widths.

This leaf must not implement the TASK-256 columns-control fix. If the shared
truthful-control work has not landed yet, rebase over it or keep this leaf
limited to variant previews and the `cards-4` breakpoint.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:168` - `cards-4` shows two
  columns until `xl`.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:201-204` - BUG-05.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:214-216` - UX-02 variant
  previews.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:280-288` - local resolver
  readability cleanup when touching the renderer.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:382-384` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/featureGrid.tsx` | Adjust `cards-4` grid class after TASK-256 truthful-control semantics are in place; explicitly accept default resolver values when touching `resolveFeatureGridGap`, `resolveFeatureGridBorderWidth`, and `resolveFeatureGridRadius`. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add compact non-SVG layout previews to `VariantCards` and stable `data-widget-control` metadata for each variant card. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Assert `cards-4` emits the intended responsive grid class and explicit default resolver behavior remains stable. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Assert all variant options render a visual preview and remain selectable. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document the `cards-4` responsive behavior and variant preview editor affordance. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Mark BUG-05/UX-02 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
const variantPreviewRows: Record<FeatureGridVariantId, Array<number>> = {
  "cards-3": [1, 1, 1],
  "cards-4": [1, 1, 1, 1],
  "highlight-first": [2, 1, 1],
};

function FeatureGridVariantPreview({ variant }: { variant: FeatureGridVariantId }) {
  return (
    <span aria-hidden="true" className="grid grid-cols-4 gap-1">
      {variantPreviewRows[variant].map((span, index) => (
        <span key={index} className={cn("h-3 rounded-sm bg-muted", span === 2 && "col-span-2")} />
      ))}
    </span>
  );
}

const columnsClassMap: Record<FeatureGridColumns, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};
```

Error handling:

- Keep unknown variants normalized through `resolveFeatureGridVariant`.
- Do not add a second columns override path. The renderer must have one owner for
  variant/default column classes after TASK-256 lands.
- If `lg:grid-cols-4` creates visual crowding in Playwright replay, document the
  replay result and choose a named responsive variant policy in this leaf instead
  of leaving the behavior implicit.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged unless a variant id is added.
- Anti-abuse: no user-authored HTML, script, or class-name input is introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or shared output assumptions change.
- `bun test tests/unit/widgets/validator.test.ts` if a new variant id is added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-01_Feature_Grid_Variant_Preview_and_Responsive_Cards4.md`
- `_docs/_TASKS/README.md` on status changes

## Completion Notes

- Done (2026-05-17). Added variant miniatures in Visual, moved the `cards-4`
  responsive desktop baseline to `lg`, and kept the resolver defaults explicit.
- Final family validation is recorded in `TASK-267-08`.

## Acceptance Criteria

- Variant cards visually communicate `cards-3`, `cards-4`, and
  `highlight-first` without requiring the user to click first.
- `cards-4` no longer surprises laptop-width users with a two-column desktop
  result unless this leaf records an explicit product deferral.
- The implementation does not duplicate TASK-256 columns-control ownership.
- Feature Grid runtime and editor tests cover the new behavior.
