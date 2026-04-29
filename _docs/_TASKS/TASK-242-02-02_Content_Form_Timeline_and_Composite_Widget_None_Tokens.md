# TASK-242-02-02: Content, Form, Timeline, and Composite Widget None Tokens

# FileName: TASK-242-02-02_Content_Form_Timeline_and_Composite_Widget_None_Tokens.md

**Priority:** High
**Category:** Content Widgets + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-242-02-01
**Status:** To Do

---

## Overview

Add `none` to content, form, timeline, and composite widget visual spacing/radius
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
- corresponding runtime widget test files in `tests/vitest/widgets/` or the
  existing Bun-owned `tests/unit/widgets/` suite for that surface.
- editor files and editor-wave tests are owned by TASK-242-03-01. This leaf must
  not require editor select changes to be considered complete.

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

## Ownership Boundaries

- This leaf owns runtime/schema/type/normalizer/render changes for content,
  form, timeline, and composite widget spacing/gap/padding/radius fields.
- `screenTwoColumn.gap` is intentionally excluded here because TASK-242-02-01
  owns screen layout gaps with the other layout/container widgets.
- Typography label-size fields, width presets, logo height, input size, and
  button size runtime changes are owned by TASK-242-03-02.
- Admin editor select options for all fields approved by TASK-242 are owned by
  TASK-242-03-01 after the relevant runtime leaves have landed.
- For `postsFeed`, update the local schema/type/normalizer first, then verify
  the value flows through `mapPostsFeedToContentListData()` into the shared
  content-list renderer. Do not rely on content-list normalization alone.

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

- Add render assertions for `data-*` markers where present, such as
  `data-stats-kpi-spacing`, `data-gallery-mosaic-gap`,
  `data-cta-banner-padding`, and similar markers.
- Add normalizer tests in the current owner suite for each widget. Use
  `tests/vitest/widgets/*` for Bun-free widget render/normalizer tests and keep
  existing `tests/unit/widgets/contentList.test.tsx`,
  `postsFeedWidget.test.tsx`, and `entryTeaser.test.tsx` in Bun.
- Run the Bun-owned runtime suites explicitly when those surfaces are touched:
  `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx`.
- Do not update focused editor-wave suites in this leaf; editor option
  visibility and interactions are owned by TASK-242-03-01.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Impacted `_docs/_WIDGETS/*.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Content/form/timeline widget schemas, normalizers, and renderers support
   `none` for all approved spacing and radius tokens.
2. Defaults stay unchanged for new widgets.
3. Invalid token behavior stays strict.
4. Editor select visibility remains deferred to TASK-242-03-01.
