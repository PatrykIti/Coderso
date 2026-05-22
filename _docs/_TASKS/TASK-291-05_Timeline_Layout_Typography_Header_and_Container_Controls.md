# TASK-291-05: Timeline Layout Typography Header and Container Controls

# FileName: TASK-291-05_Timeline_Layout_Typography_Header_and_Container_Controls.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-291, TASK-291-01, TASK-291-02, TASK-291-03, TASK-291-04
**Status:** Done (2026-05-22)

---

## Overview

Add Timeline-owned layout, typography, and section composition controls that are
currently hardcoded in the renderer.

This leaf owns W1, W5, W9, W11, and W12 from
`REPORT_TIMELINE_WIDGET.md`.

Final outcome: header/title-weight/padding/section-spacing/max-width
controls are landed, and axis/milestone layouts now keep date/dateLabel
metadata visible without inventing a separate hybrid variant.

## Sub-Tasks

- [x] Add bounded title font-weight tokens for step titles.
- [x] Add bounded section padding controls that replace hardcoded `px-4 py-8`
  without exposing raw class strings.
- [x] Add bounded outer section margin controls, or an explicitly named section
  spacing token, so W5's padding/margin request is not reduced to padding only.
- [x] Add bounded max-width tokens that replace hardcoded `max-w-6xl`.
- [x] Add optional `headerTitle` and `headerDescription` fields for the whole
  Timeline widget.
- [x] Decide and implement a truthful horizontal dated milestone composition
  that covers the report's `milestones + chronology` gap, or defer with exact
  constraints in TASK-291-07.
- [x] Keep header fields usable as accessible labels for TASK-291-03.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/timeline.tsx` | Extend schema/defaults/normalizer and renderer for header, title weight, padding, outer margin/section spacing, max-width, and any accepted dated milestone composition. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Add Visual controls for section header, typography weight, padding, outer margin/section spacing, max-width, and dated milestone composition. |
| `tests/vitest/widgets/timeline.test.tsx` | Cover schema/defaults, header output, accessible labels, bounded padding/margin/max-width classes/styles, and backward compatibility. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover editor controls and validation feedback. |

## Implementation Pseudocode

```ts
type TimelinePadding = "none" | "sm" | "md" | "lg";
type TimelineSectionSpacing = "none" | "sm" | "md" | "lg";
type TimelineMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
type TimelineTitleWeight = "normal" | "medium" | "semibold" | "bold";

type TimelineHeader = {
  title?: string;
  description?: string;
};

function resolveTimelineContainer(layout: TimelineData["layout"]) {
  return {
    paddingClass: paddingClassMap[layout?.padding ?? "md"],
    sectionSpacingClass: sectionSpacingClassMap[layout?.sectionSpacing ?? "md"],
    maxWidthClass: maxWidthClassMap[layout?.maxWidth ?? "xl"],
    minHeightClass: minHeightClassMap[layout?.minHeight ?? "auto"],
  };
}
```

Data flow:

1. Add strict schema entries for header/layout/style fields.
2. Normalize empty header strings to omitted fields.
3. Resolve token values through local maps, not arbitrary classes. Reuse the
   existing `layout.spacing` item-gap model only for item spacing; use a
   separate bounded section margin/spacing token if W5 needs outer spacing.
4. Reuse header title as `aria-labelledby` when present.

Error handling:

- Unknown tokens normalize to current defaults.
- Empty header values are omitted and the renderer falls back to static ARIA
  labels.
- If the dated milestone composition cannot be implemented without conflicting
  with current mode/variant rules, record a physical deferral in TASK-291-07.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new persisted fields must be added to
  `timelineSchema`.
- Anti-abuse: no raw class names, HTML, scripts, or unbounded style strings.
- Secret handling: no secrets in header fields, DOM attributes, or test
  fixtures.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before committing or closing this runtime/editor leaf
- `bun run scan:security:strict` before committing or closing this leaf
- `bun run precommit` before committing or closing this leaf

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with layout/header/typography fields.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred
  status for W1, W5, W9, W11, and W12.
- Update `_docs/WIDGETS.md` only if shared widget field categories change.

## Acceptance Criteria

- Timeline no longer hardcodes the only available padding/margin/max-width
  behavior.
- Header title/description can be authored inside the widget and support
  accessible section naming.
- Step title weight is bounded and test-covered.
- Dated milestone composition is either implemented truthfully or deferred with
  an exact reason and owner.
