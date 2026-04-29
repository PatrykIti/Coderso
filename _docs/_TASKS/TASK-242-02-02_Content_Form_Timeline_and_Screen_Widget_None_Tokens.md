# TASK-242-02-02: Content, Form, Timeline, and Screen Widget None Tokens

# FileName: TASK-242-02-02_Content_Form_Timeline_and_Screen_Widget_None_Tokens.md

**Priority:** High
**Category:** Content Widgets + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-242-02-01
**Status:** To Do

---

## Overview

Add `none` to content, form, timeline, and screen widget visual spacing/radius
tokens. These widgets currently expose `sm`/`md`/`lg`/`xl` style options but
often cannot disable the preset.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/statsKpi.tsx`
- `core/widgets/core/featureGrid.tsx`
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/postsFeed.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/widgets/core/galleryMosaic.tsx`
- `core/widgets/core/ctaBanner.tsx`
- `core/widgets/core/pricingPlans.tsx`
- `core/widgets/core/faqAccordion.tsx`
- `core/widgets/core/team.tsx`
- `core/widgets/core/testimonials.tsx`
- `core/widgets/core/contact.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/widgets/core/formEmbed.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/widgets/core/richTextSection.tsx`
- `core/widgets/core/timeline.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- corresponding editor and test files.

## Required Changes

| Widget | Fields | Render behavior |
|---|---|---|
| `statsKpi` | `style.spacing` | zero outer/card gap spacing |
| `featureGrid` | `style.gap` | zero card grid gap |
| `contentList`, `postsFeed` | `style.gap` | zero list/card gap |
| `entryTeaser` | `style.spacing`, `style.radius` | zero inner spacing, no forced radius |
| `galleryMosaic` | `style.gap` | zero mosaic gap |
| `ctaBanner` | `style.padding` | zero banner padding |
| `pricingPlans` | `style.spacing` | zero plan/card spacing |
| `faqAccordion` | `style.spacing` | zero item spacing/panel padding where applicable |
| `team` | `style.gap` | zero member-card gap |
| `testimonials` | `style.spacing` | zero testimonial/card spacing |
| `contact` | `style.spacing` | zero block/form spacing |
| `newsletter` | `style.spacing` | zero form/content spacing |
| `formEmbed` | `layout.spacing`, `style.radius` | zero form spacing and no forced field radius |
| `logoCloud` | `style.gap` | zero logo gap |
| `richTextSection` | `style.spacing` | zero rich text spacing |
| `timeline` | `layout.spacing` | zero step spacing |
| `compareTimeline` | `layout.trackSpacing` | zero track spacing |
| `screenTwoColumn` | `gap` | zero column gap |

## Security Contract

- Visibility: public widget output plus internal admin editor.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: strict schema enum updates only.
- Anti-abuse: renderers must use fixed maps for token to class translation.

## Pseudocode

```ts
export type WidgetSpacing = "none" | "sm" | "md" | "lg" | "xl";

const spacingClassMap: Record<WidgetSpacing, string> = {
  none: "space-y-0",
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
};

function resolveWidgetSpacing(value: unknown): WidgetSpacing {
  if (value === "none") return "none";
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
}
```

## Testing Requirements

- Update focused editor-wave suites for every touched widget editor.
- Add render assertions for `data-*` markers where present, such as
  `data-stats-kpi-spacing`, `data-gallery-mosaic-gap`,
  `data-cta-banner-padding`, and similar markers.
- Add normalizer tests where the widget already has unit coverage.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Impacted `_docs/_WIDGETS/*.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Content/form/timeline widgets expose `none` for all off-capable visual
   spacing and radius tokens.
2. Defaults stay unchanged for new widgets.
3. Invalid token behavior stays strict.
