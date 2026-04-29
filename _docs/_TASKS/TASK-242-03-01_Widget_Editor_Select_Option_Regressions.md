# TASK-242-03-01: Widget Editor Select Option Regressions

# FileName: TASK-242-03-01_Widget_Editor_Select_Option_Regressions.md

**Priority:** High
**Category:** Widget Editors + Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-242-02, TASK-242-03, TASK-242-03-02
**Status:** To Do

---

## Overview

Update widget editor option arrays and regression tests so every approved
`none` token is visible in Wizard, Visual, and Advanced modes where the field is
editable.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

Editor files under `core/admin/ui/widgets/editors/`, especially:

- `HeroEditors.tsx`
- `NavigationEditors.tsx`
- `FooterEditors.tsx`
- `GridColumnsEditors.tsx`
- `StackEditors.tsx`
- `SplitLayoutEditors.tsx`
- `StatsKpiEditors.tsx`
- `FeatureGridEditors.tsx`
- `ContentListEditors.tsx`
- `PostsFeedEditors.tsx`
- `EntryTeaserEditors.tsx`
- `GalleryMosaicEditors.tsx`
- `CtaBannerEditors.tsx`
- `PricingPlansEditors.tsx`
- `FaqAccordionEditors.tsx`
- `TeamEditors.tsx`
- `TestimonialsEditors.tsx`
- `ContactEditors.tsx`
- `NewsletterEditors.tsx`
- `FormEmbedEditors.tsx`
- `LogoCloudEditors.tsx`
- `RichTextSectionEditors.tsx`
- `TimelineEditors.tsx`
- `CompareTimelineEditors.tsx`
- `ScreenEditors.tsx`
- `DividerEditors.tsx`
- `SpacerEditors.tsx`

Tests under `tests/vitest/ui/` matching those editor files.

Use the line-level editor and test inventory in
`TASK-242-01-01_Widget_Config_Token_Inventory.md` before editing. It maps each
editor option array and focused wave suite to the owning widget surface.

## Editor UX Rules

- Label the option `None`.
- Place `None` first in the option list.
- Keep existing defaults selected until the user explicitly chooses `none`.
- Do not use an empty Radix Select value; use literal `"none"`.
- Keep existing labels for numeric zero only when `"0"` remains a legacy or
  technical option. Prefer showing `None` instead of a product-facing `0` where
  both would mean the same thing.

## Security Contract

- Visibility: internal admin widget editor.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: editor must only emit schema-approved values.
- Anti-abuse: no raw class names or arbitrary CSS tokens from editor selects.

## Pseudocode

```tsx
const spacingOptions: Array<{ id: WidgetSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

<Select
  value={normalized.style?.spacing ?? defaults.style?.spacing ?? "md"}
  onValueChange={(next) => updateStyle(value, onChange, { spacing: next as WidgetSpacing })}
>
  {spacingOptions.map((option) => (
    <SelectItem key={option.id} value={option.id}>
      {option.label}
    </SelectItem>
  ))}
</Select>;
```

## Testing Requirements

- Update `findSelectByOptions` / `findSelectsByOptions` expectations to include
  `none`.
- Add at least one interaction per major editor family proving selecting `none`
  reaches `onChange`.
- Keep mode coverage: if a control exists in both Visual and Advanced, test both
  when existing suites already cover both modes.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/<touched-suite>.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md` editor authoring notes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. All approved `none` tokens are visible from admin editor controls.
2. Selecting `None` writes literal `"none"` into widget data.
3. Radix Select does not use empty-string values.
4. Existing editor defaults remain unchanged.
