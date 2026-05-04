# TASK-244-04-01: Marketing and Content Surface and Overlay Clear

# FileName: TASK-244-04-01_Marketing_and_Content_Surface_and_Overlay_Clear.md

**Priority:** High
**Category:** Widgets + Marketing + Content
**Estimated Effort:** Large
**Dependencies:** TASK-244-03-01, TASK-244-03-02
**Status:** Done (2026-04-30)

---

## Overview

Add clear controls and runtime output omission for marketing/content widgets with
card surfaces, caption overlays, section backgrounds, and highlighted surfaces.

Target widgets:

- `grid-columns`
- `gallery-mosaic`
- `feature-grid`
- `faq-accordion`
- `pricing-plans`
- `testimonials`
- `team`
- `stats-kpi`
- `content-list`
- `posts-feed`
- `entry-teaser`
- `cta-banner`
- `logo-cloud`
- `rich-text-section`
- `timeline`
- `compare-timeline`

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/gridColumns.tsx`
- `core/widgets/core/galleryMosaic.tsx`
- `core/widgets/core/featureGrid.tsx`
- `core/widgets/core/faqAccordion.tsx`
- `core/widgets/core/pricingPlans.tsx`
- `core/widgets/core/testimonials.tsx`
- `core/widgets/core/team.tsx`
- `core/widgets/core/statsKpi.tsx`
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/postsFeed.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/widgets/core/ctaBanner.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/widgets/core/richTextSection.tsx`
- `core/widgets/core/timeline.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `core/admin/ui/widgets/editors/TeamEditors.tsx`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- `core/admin/ui/widgets/editors/TimelineEditors.tsx`
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `tests/vitest/widgets/gridColumns.test.tsx`
- `tests/vitest/widgets/galleryMosaic.test.tsx`
- `tests/vitest/widgets/featureGrid.test.tsx`
- `tests/vitest/widgets/faqAccordion.test.tsx`
- `tests/vitest/widgets/pricingPlans.test.tsx`
- `tests/vitest/widgets/testimonials.test.tsx`
- `tests/vitest/widgets/team.test.tsx`
- `tests/vitest/widgets/statsKpi.test.tsx`
- `tests/unit/widgets/contentList.test.tsx`
- `tests/unit/widgets/postsFeedWidget.test.tsx`
- `tests/unit/widgets/entryTeaser.test.tsx`
- `tests/vitest/widgets/ctaBanner.test.tsx`
- `tests/vitest/widgets/logoCloud.test.tsx`
- `tests/vitest/widgets/richTextSection.test.tsx`
- `tests/vitest/widgets/timeline.test.tsx`
- `tests/vitest/widgets/compareTimeline.test.tsx`
- `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `tests/vitest/ui/team-editor-wave.test.tsx`
- `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `tests/vitest/ui/content-list-editor-wave.test.tsx`
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `tests/vitest/ui/timeline-editor-wave.test.tsx`
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`

## Implementation Notes

Pay special attention to these current surfaces:

- `grid-columns`: `columnBackground` defaults to `var(--color-surface)` and is
  rendered at `gridColumns.tsx:439`; editor `GridColumnsEditors.tsx:696-699`
  has no semantic clear action.
- `gallery-mosaic`: caption overlay defaults to a dark rgba value.
- `feature-grid`, `faq-accordion`, `pricing-plans`, `testimonials`, `team`,
  `content-list`, `posts-feed`, and `entry-teaser`: card/panel surfaces default
  to `var(--color-bg)` or equivalent.
- `cta-banner`: container, badge, and button backgrounds are style-owned and
  should support clear where safe.
- `logo-cloud`: repeated item/tile backgrounds are currently class-driven at
  `logoCloud.tsx:283-284` and the editor only exposes size/gap/alignment and
  grayscale/hover behavior at `LogoCloudEditors.tsx:488-578`. Add the tile
  surface contract to the existing `LogoCloudData.style`, schema, normalizer,
  renderer, and display-style editor section; do not close this by documenting
  "no style field" while the inventory remains `clear-required`.
- `stats-kpi`: repeated card backgrounds are currently class-driven and need a
  clearable surface contract where the card/split variants own a user-facing
  surface.
- `timeline` and `compare-timeline`: classify marker/line/highlight colors
  carefully; do not remove semantic timeline readability states by accident.

Where a current normalizer re-materializes defaults for absent style fields,
apply TASK-244-01-02 first. Clear cannot be implemented as key removal if the
same normalizer immediately turns the missing key back into a visible default.

Default and compatibility policy:

- `grid-columns`, `feature-grid`, `faq-accordion`, `pricing-plans`,
  `testimonials`, `team`, `content-list`, `posts-feed`, `entry-teaser`, and
  `rich-text-section`: use **creation default only** with an explicit
  `style: {}` clear override. The implementation must remove field-level
  normalizer fallbacks such as `?? "var(--color-surface)"` when the owning
  `style` object is present but the key was cleared.
- `gallery-mosaic` and `cta-banner`: use the same creation-default-only policy
  for overlay/container/button style fields; clear removes the field and keeps
  the owning object empty if that is needed to override shallow defaults.
- `logo-cloud` and `stats-kpi`: for newly added tile/card style fields, add
  explicit defaults to the widget defaults and inserted block payload, then use
  `style: {}` as the clear override. Add a local legacy adapter only if audited
  saved data cannot be preserved by the default merge.
- `timeline` and `compare-timeline`: use creation-default-only for decorative
  background/surface fields. Keep semantic readability states local and
  defaulted; do not make those state colors clearable unless the row explicitly
  proves they are user-owned style surfaces.

## Per-Widget Implementation Matrix

| Widget | Runtime field/output | Editor clear behavior | Regression proof |
|---|---|---|---|
| `grid-columns` | `style.columnBackground` at `gridColumns.tsx:51`, default/schema `gridColumns.tsx:104-126`, fallback `gridColumns.tsx:352`, runtime style `gridColumns.tsx:439` | Add `Clear` for `Column background` in `GridColumnsEditors.tsx:696-699`; remove `columnBackground` from `style` | `gridColumns.test.tsx` asserts cleared columns omit `backgroundColor`; `grid-columns-editor-wave.test.tsx` asserts payload key removal and no `"transparent"` sentinel |
| `gallery-mosaic` | `style.overlay` at `galleryMosaic.tsx:29`, default `galleryMosaic.tsx:145`, normalizer `galleryMosaic.tsx:270-272`, overlay output `galleryMosaic.tsx:306` and fallback `galleryMosaic.tsx:400` | Add `Clear` for caption overlay in `GalleryMosaicEditors.tsx` | Assert cleared overlay does not render overlay DOM/style and configured overlay still renders |
| `feature-grid` | `style.surfaceColor` default/fallback `featureGrid.tsx:165`, `featureGrid.tsx:300-302`, runtime `featureGrid.tsx:347` | Add `Clear` in existing card surface controls at `FeatureGridEditors.tsx:651-664`; fix normalizer fallback before relying on key removal | Assert cards omit background style when cleared |
| `faq-accordion` | `style.surface` default/fallback `faqAccordion.tsx:129`, `faqAccordion.tsx:267`, runtime `faqAccordion.tsx:295` | Add `Clear` in `FaqAccordionEditors.tsx` | Assert panel backgrounds omit style while spacing/expanded content still render |
| `pricing-plans` | `cardSurface`/`cardBorder` defaults `pricingPlans.tsx:153-154`, fallback `pricingPlans.tsx:307-313`, runtime card/table/badge surfaces `pricingPlans.tsx:351-383`, `pricingPlans.tsx:433-436`, `pricingPlans.tsx:488` | Add `Clear` in existing card surface controls at `PricingPlansEditors.tsx:806-827`; keep plan badge text semantics | Assert cleared cards/table/highlight omit backgrounds and highlighted plan layout remains |
| `testimonials` | `cardSurface`/`cardBorder` default/fallback `testimonials.tsx:132-133`, `testimonials.tsx:259-265`, runtime `testimonials.tsx:354-355` | Add `Clear` in existing card surface controls at `TestimonialsEditors.tsx:624-637` | Assert testimonial cards omit cleared background/border style |
| `team` | `cardSurface`/`cardBorder` default/fallback `team.tsx:168-169`, `team.tsx:341-347`, runtime `team.tsx:455-460` | Add `Clear` in existing card surface controls at `TeamEditors.tsx:754-764` and advanced raw inputs at `TeamEditors.tsx:838-849` | Assert all team variants keep layout and omit cleared card background |
| `stats-kpi` | card/split-highlight item surfaces are class-driven in `StatsKpiCard` at `statsKpi.tsx:299-307`; `statsKpi.tsx:358-404` owns outer layout and should only receive style plumbing if needed for the card component | Add explicit style-owned card surface clear only for card/split variants in the existing style updater near `StatsKpiEditors.tsx:193` and color/style controls at `StatsKpiEditors.tsx:518-531`/`StatsKpiEditors.tsx:650-658` | Assert card variant can omit forced surface while inline variant remains unchanged |
| `content-list` | `style.backgroundColor` default/fallback `contentList.tsx:237-239`, `contentList.tsx:445-447`, runtime `contentList.tsx:537`; empty state `contentList.tsx:616-673` | Add `Clear` in `ContentListEditors.tsx`; remove `backgroundColor` from style | Bun test asserts mapped output omits card background; editor wave asserts key removal |
| `posts-feed` | `style.backgroundColor` default/fallback `postsFeed.tsx:210-212`, `postsFeed.tsx:298-300`, mapping to content list `postsFeed.tsx:368-371` | Add `Clear` by extending the existing editor instead of a new flow; current `PostsFeedEditors.tsx:387-566` exposes query/layout/advanced data but no background control, so add the style control there and preserve explicit mapping to content-list absence | Bun test asserts cleared `posts-feed` does not rematerialize content-list background |
| `entry-teaser` | `style.surface` default/fallback `entryTeaser.tsx:183`, `entryTeaser.tsx:331`, `entryTeaser.tsx:376`, runtime `entryTeaser.tsx:466` | Add `Clear` in `EntryTeaserEditors.tsx` | Bun test asserts teaser surface style is omitted when cleared |
| `cta-banner` | `background`, `badgeBackground`, button backgrounds at `ctaBanner.tsx:144-151`, `ctaBanner.tsx:245-258`, runtime `ctaBanner.tsx:315`, `ctaBanner.tsx:346-381` | Add `Clear` in `CtaBannerEditors.tsx` for container, badge, primary button, secondary button backgrounds | Assert cleared container/badge/button backgrounds remove style keys and preserve CTA links |
| `logo-cloud` | repeated tile backgrounds at `logoCloud.tsx:283-284` and item render flow `logoCloud.tsx:250-308` are class-driven; current style schema at `logoCloud.tsx:87-97` has no tile surface field | Extend `LogoCloudData.style`, `logoCloudSchema`, defaults/normalizer, renderer, and `LogoCloudEditors.tsx:488-578` with clearable tile background/border controls | Assert schema accepts tile surface fields and rejects unknown style keys; tile background can be omitted without hiding logos |
| `rich-text-section` | `style.background` default/fallback `richTextSection.tsx:205`, `richTextSection.tsx:410`, `richTextSection.tsx:444`, runtime `richTextSection.tsx:516` | Add `Clear` in existing background color control at `RichTextSectionEditors.tsx:757-767`; fix normalizer fallback before relying on key removal | Assert cleared background omits `backgroundColor`, not `"transparent"` |
| `timeline` | background and marker/line surfaces `timeline.tsx:47`, `timeline.tsx:168`, `timeline.tsx:249`, `timeline.tsx:353`, `timeline.tsx:385`, `timeline.tsx:441`, `timeline.tsx:511`, `timeline.tsx:580`, `timeline.tsx:597`, `timeline.tsx:614-617` | Add `Clear` for section background and style-owned line/marker fields in existing color/background controls at `TimelineEditors.tsx:628-668`; keep per-step accent readability defaults | Assert cleared section background omits style and semantic marker/line defaults still render when required |
| `compare-timeline` | highlight/marker/panel backgrounds `compareTimeline.tsx:479-522` | Add `Clear` in existing color controls at `CompareTimelineEditors.tsx:784-828` only for style-owned highlight/marker surfaces | Assert cleared highlight/marker backgrounds omit output while comparison state remains readable |

## Implementation Pseudocode

For card/surface widgets:

```ts
const cardBackground = resolveClearableStyleValue(style.cardSurface);
const cardStyle = compactStyle({
  backgroundColor: cardBackground,
  borderColor: resolveClearableStyleValue(style.cardBorder),
});
```

For overlay widgets:

```tsx
const overlay = resolveClearableStyleValue(style.overlay);
return overlay ? (
  <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ background: overlay }} />
) : null;
```

For content-list/posts-feed, keep the mapping explicit:

```ts
const mappedStyle = compactObject({
  ...contentListStyle,
  backgroundColor: resolveClearableStyleValue(postsStyle.backgroundColor),
});

mapPostsFeedToContentListData({
  style: mappedStyle,
});
```

When cleared, the mapped field should be absent, not `"transparent"`.

## Security Contract

- Visibility:
  - marketing/content widget editor controls are internal admin UI;
  - rendered widget output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - edits persist through existing authenticated admin page/template save flows.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this leaf does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every new or newly-clearable style field must be owned by its widget schema,
    defaults, and normalizer with unknown keys rejected.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - card, overlay, marker, timeline, and tile values must render through
    validated style fields, not user-controlled class-name fragments.
- Compatibility:
  - content-list/posts-feed mappings must preserve absence without weakening
    resolver validation or semantic readability states.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx`
- Bun-owned current owners:
  - `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx`
- Matching editor-wave tests:
  - `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- Add assertions that clear emits omitted keys and runtime output contains no
  `"transparent"` sentinel solely because a clear action happened.
- Add schema/normalizer assertions for every new or newly-clearable style field:
  configured value, cleared absence, legacy/default behavior where applicable,
  and rejected unknown style keys.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` documentation files listed in
  **Files to Change**
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Marketing/content card surfaces can be cleared.
2. Gallery overlays can be cleared without leaving transparent overlay nodes.
3. Content-list/posts-feed background mapping preserves cleared absence.
4. Timeline/compare color clears do not remove semantic readability states.
5. Runtime/editor tests prove default and cleared output.
6. Clear actions remove saved properties instead of serializing
   `"transparent"` or empty strings as off-state payloads.
