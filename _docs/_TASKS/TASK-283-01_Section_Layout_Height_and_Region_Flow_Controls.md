# TASK-283-01: Section Layout Height and Region Flow Controls

# FileName: TASK-283-01_Section_Layout_Height_and_Region_Flow_Controls.md

**Priority:** High
**Category:** Widgets + Section + Layout + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-03, TASK-256-05-01, TASK-283
**Status:** To Do

---

## Overview

Add Section-owned layout controls for bounded minimum height, fullscreen-style
sections, region flow, and spacing between heading and repeated regions.

This leaf covers report findings C1, C5, W7, and W8 from
`_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`. It does not own public placeholder
hiding, anchor validation, or existing width/bleed truthfulness because those
remain TASK-256-05-01.

## Scope Boundary

In scope:

- `layout.minHeight` with bounded presets such as `none`, `screen`, `hero`,
  `compact`, and `custom-var` only if the existing design-token system has a
  safe token owner;
- `layout.regionFlow` with bounded values such as `stack`, `row`, and `grid`;
- `layout.regionColumns` only when `regionFlow="grid"`, clamped to the current
  slot max of 8 and responsive-safe defaults;
- `layout.headingGap` and `layout.regionGap` tokens for the Section-owned
  header-to-content and region-to-region gaps;
- editor controls that show inactive-field guidance when a field depends on
  another selection.

Out of scope:

- hiding `Empty region.` in public runtime output, owned by TASK-256;
- changing the repeatable slot storage format (`region:<id>`), owned by the
  existing widget slot contract;
- arbitrary CSS classes, raw style strings, or unbounded numeric gap/height
  values.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:55` - C1 min-height/fullscreen gap.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:59,200,212,264,290` - C5 regions always
  render as `flex-col`.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:71-72` - W7/W8 hardcoded gaps.

## Sub-Tasks

- [ ] Extend `SectionData.layout` and `sectionSchema` with bounded height,
  region flow, column, and gap fields.
- [ ] Add resolver helpers that normalize unknown values to current defaults and
  keep legacy payloads visually unchanged.
- [ ] Render region wrappers through explicit class maps instead of hardcoded
  `flex flex-col` and variant-only gap selection.
- [ ] Add Visual editor controls for min height, flow, columns, heading gap, and
  region gap with disabled/hidden dependent controls where appropriate.
- [ ] Keep Wizard unchanged unless a later TASK-283 preset leaf decides to expose
  a safe starting layout.
- [ ] Add regression tests for default legacy output, grid/row output, clamped
  columns, and editor payload updates.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend schema/types/defaults/normalizer and render bounded min-height, region flow, columns, heading gap, and region gap classes. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add mode-appropriate Visual controls and inactive-state guidance for dependent grid columns. |
| `tests/vitest/widgets/section.test.tsx` | Add normalization and SSR assertions for legacy defaults, row/grid flow, clamped columns, and gap classes. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add control interaction tests for layout fields and dependent grid column behavior. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fixture coverage needs explicit Section layout payloads. |

## Implementation Pseudocode

Token maps:

```ts
type SectionMinHeight = "none" | "compact" | "hero" | "screen";
type SectionRegionFlow = "stack" | "row" | "grid";
type SectionGap = "none" | "sm" | "md" | "lg" | "xl";

const minHeightClassMap: Record<SectionMinHeight, string> = {
  none: "",
  compact: "min-h-64",
  hero: "min-h-[70vh]",
  screen: "min-h-screen",
};
```

Normalizer flow:

```ts
function normalizeSectionLayout(layout: SectionData["layout"]) {
  const regionFlow = resolveSectionRegionFlow(layout?.regionFlow);
  return {
    ...normalizeExistingSectionLayout(layout),
    minHeight: resolveSectionMinHeight(layout?.minHeight),
    regionFlow,
    regionColumns: regionFlow === "grid" ? clampSectionRegionColumns(layout?.regionColumns) : 1,
    headingGap: resolveSectionGap(layout?.headingGap),
    regionGap: resolveSectionGap(layout?.regionGap),
  };
}
```

Renderer flow:

```tsx
const regionClassName = joinClasses(
  regionFlowClassMap[layout.regionFlow],
  layout.regionFlow === "grid" ? regionColumnClassMap[layout.regionColumns] : undefined,
  regionGapClassMap[layout.regionGap]
);
```

Error handling:

- Unknown enum values normalize to current default stack behavior.
- `regionColumns` is ignored unless `regionFlow="grid"`.
- Existing saved blocks with no new fields must produce the same output as
  before this leaf, except for any TASK-256 placeholder fix already landed.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new layout fields must be listed in
  `sectionSchema` with `additionalProperties: false`.
- Anti-abuse: layout fields must resolve through bounded class maps only; no
  arbitrary class names, raw CSS, inline scripts, or user-authored expressions.
- Secret handling: no secrets in layout data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with new layout fields and examples.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows C1, C5, W7, and W8
  after validation.

## Acceptance Criteria

- Section can render bounded min-height/fullscreen-style layouts without raw CSS.
- Section regions can render stack, row, and grid layouts while preserving
  repeatable slot identity.
- Heading and region gaps are schema-owned tokens, not hardcoded per variant.
- Focused widget/editor tests prove defaults, normalization, renderer output,
  and editor controls stay synchronized.
