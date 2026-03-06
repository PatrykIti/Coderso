# TASK-105-06: Widget Editor New Tests Wave
# FileName: TASK-105-06_Widget_Editor_New_Tests_Wave.md

**Priority:** High  
**Category:** QA + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** To Do

---

## Overview

Add real new tests for the still-undercovered widget editor files after the initial migration wave.

## Priority Hotspots

- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/Product*Editors.tsx`

## Pseudocode

```ts
renderWizardVisualAdvancedEditors();
assertConditionalSections();
assertResolvedRuntimeFields();
assertVariantSpecificBranches();
```

## Acceptance Criteria

1. The largest remaining widget editor gaps get targeted new tests.
2. Tests cover meaningful editor branching, not only generic presence checks.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
