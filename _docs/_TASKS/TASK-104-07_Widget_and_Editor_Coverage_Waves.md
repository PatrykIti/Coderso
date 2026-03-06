# TASK-104-07: Widget and Editor Coverage Waves
# FileName: TASK-104-07_Widget_and_Editor_Coverage_Waves.md

**Priority:** High  
**Category:** QA + Admin/UI + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-104-01, TASK-104-03  
**Status:** To Do

---

## Overview

The largest uncovered cluster in the Bun report is `core/admin/ui/widgets/*`.
This needs explicit coverage waves instead of ad-hoc fixes.

## Coverage Waves

### Wave A: commercial/editor-heavy widgets

- `ProductTableEditors.tsx`
- `ProductGalleryEditors.tsx`
- `ProductCompareEditors.tsx`
- `BookingCalendarEditors.tsx`
- `CommerceWidgetEditorShared.tsx`

### Wave B: high-volume content widgets

- `CompareTimelineEditors.tsx`
- `NavigationEditors.tsx`
- `PricingPlansEditors.tsx`
- `ContentListEditors.tsx`
- `FeatureGridEditors.tsx`

### Wave C: remaining long-tail widget editors

- newsletters, testimonials, team, tabs, stack, split, section, footer, contact

## Files to Create / Change

- selected `tests/vitest/ui/*`
- selected `tests/vitest/ui-dom/*`
- optional helper render factories in `tests/utils/*`

## Pseudocode

```ts
for (const widgetEditor of coverageWave) {
  addRenderCoverage(widgetEditor);
  addInteractionCoverage(widgetEditor);
  addSchemaDefaultsCoverageIfMissing(widgetEditor);
}
```

## Acceptance Criteria

1. Widget/editor backlog is split into manageable waves.
2. The biggest coverage cluster has a deterministic execution plan.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`

## Documentation Updates Required

- main TASK-104 file
