# TASK-283-03: Section Heading Typography Alignment and Wizard UX

# FileName: TASK-283-03_Section_Heading_Typography_Alignment_and_Wizard_UX.md

**Priority:** High
**Category:** Widgets + Section + Typography + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-283
**Status:** To Do

---

## Overview

Add Section-owned heading typography, alignment, and Wizard completeness after
TASK-256 resolves the current heading semantic baseline.

This leaf covers report findings C3, W5, and U1. It intentionally does not own
the baseline hardcoded `h3` accessibility repair while TASK-256-05-01 already
tracks that structural defect.

## Scope Boundary

In scope:

- bounded heading text-size tokens for label, title, and description;
- bounded heading alignment values `left`, `center`, and `right`;
- safe clearable text-color fields for label/title/description after the shared
  TASK-256 token/color-picker contract is available;
- Wizard `Label` input so the quick setup can produce the same heading model as
  Visual;
- optional product-level heading-level selection only after TASK-256 lands or
  explicitly delegates the baseline semantic repair to this leaf.

Out of scope:

- generic color-picker/token semantics, owned by TASK-256-02;
- fixing current hardcoded invalid heading hierarchy before TASK-256-05-01 is
  resolved;
- rich text, Markdown, arbitrary classes, or raw HTML in headings.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:48,276-279,368` - C3 and C4
  heading rendering observations.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:65` - W5 heading alignment missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:241` - U1 Wizard lacks label field.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:230-239` - admin/frontend heading
  parity and current hardcoded classes.

## Sub-Tasks

- [ ] Extend `SectionData.heading` with bounded typography/alignment fields
  without changing persisted label/title/description strings.
- [ ] Add resolver helpers and class maps for heading alignment, label size,
  title size, description size, and optional heading level if delegated.
- [ ] Add safe inline color output only through existing clearable/token
  helpers after TASK-256 establishes the final color-field behavior.
- [ ] Add a Wizard `Label` control and keep Wizard/Visual updates atomic through
  `normalizeSectionData`.
- [ ] Add editor guidance that explains heading-level behavior only after the
  baseline semantic contract is settled.
- [ ] Add tests for legacy defaults, typography tokens, Wizard label update, and
  heading output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend heading schema/types/defaults/normalizer and render bounded alignment, typography, and optional level classes. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add Wizard label and Visual typography/alignment controls without duplicating shared color-picker fixes. |
| `tests/vitest/widgets/section.test.tsx` | Add render/normalization coverage for heading typography/alignment and legacy defaults. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add Wizard label and Visual heading-control interaction coverage. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema/default fixture coverage needs new heading fields. |

## Implementation Pseudocode

Heading model:

```ts
type SectionHeadingAlign = "left" | "center" | "right";
type SectionHeadingSize = "sm" | "md" | "lg" | "xl";

type SectionHeadingData = {
  label?: string;
  title?: string;
  description?: string;
  align?: SectionHeadingAlign;
  titleSize?: SectionHeadingSize;
  labelColor?: string;
  titleColor?: string;
  descriptionColor?: string;
};
```

Normalizer flow:

```ts
function normalizeSectionHeading(heading: SectionData["heading"]) {
  return {
    label: heading?.label ?? "",
    title: heading?.title ?? "",
    description: heading?.description ?? "",
    align: resolveHeadingAlign(heading?.align),
    titleSize: resolveHeadingSize(heading?.titleSize),
    labelColor: resolveClearableStyleValue(heading?.labelColor),
    titleColor: resolveClearableStyleValue(heading?.titleColor),
    descriptionColor: resolveClearableStyleValue(heading?.descriptionColor),
  };
}
```

Renderer flow:

```tsx
<header className={joinClasses("space-y-2", headingAlignClassMap[heading.align])}>
  <HeadingElement className={joinClasses("font-semibold", titleSizeClassMap[heading.titleSize])}>
    {heading.title}
  </HeadingElement>
</header>
```

Error handling:

- Unknown typography/alignment tokens normalize to the current left-aligned
  `text-2xl` behavior.
- Empty color values are omitted instead of serialized as unsafe sentinels.
- Heading-level work must not create skipped levels without either TASK-256
  baseline coverage or explicit documentation in this leaf.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: every new heading field must be schema-bound with
  `additionalProperties: false`.
- Anti-abuse: heading content remains plain text. No raw HTML, Markdown parser,
  scripts, inline event handlers, arbitrary classes, or unbounded style strings.
- Secret handling: no secrets in heading data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with heading typography/alignment fields.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows C3, W5, and U1 after
  validation. Reference TASK-256 for baseline heading-level repair unless that
  work is explicitly delegated here.

## Acceptance Criteria

- Wizard can edit the Section label without forcing users into Visual.
- Section heading typography and alignment are bounded, schema-owned, and
  backward compatible.
- Heading output remains plain text and accessible after TASK-256 baseline
  repairs land.
- Focused tests cover normalization, renderer output, and editor interactions.
