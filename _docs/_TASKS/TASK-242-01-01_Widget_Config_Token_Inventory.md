# TASK-242-01-01: Widget Config Token Inventory

# FileName: TASK-242-01-01_Widget_Config_Token_Inventory.md

**Priority:** High
**Category:** Widgets + Inventory
**Estimated Effort:** Small
**Dependencies:** TASK-242-01
**Status:** To Do

---

## Overview

Create a checked inventory of widget schema enums and editor option arrays that
look like visual tokens. Use the current code, not only docs, as the source of
truth.

## Sub-Tasks

- None. This is an execution leaf.

## Inventory Owners

| Owner group | Files to inspect |
|---|---|
| Core definitions | `core/widgets/core/*.tsx` |
| Admin editors | `core/admin/ui/widgets/editors/*.tsx` |
| UI tests | `tests/vitest/ui/*editor-wave.test.tsx` |
| Widget render tests | `tests/vitest/widgets/*.test.tsx`; existing `tests/unit/widgets/*.test.tsx` only where current coverage already lives |
| Docs | `_docs/WIDGETS.md`, `_docs/_WIDGETS/*.md` |

## Required Classification

Each enum-like field must be classified as one of:

- `add-none`: visual token that needs a new off option;
- `legacy-zero`: visual token where `"0"` already disables output and `none`
  should be accepted as a clearer alias;
- `already-none`: field already supports `none`;
- `exclude-structural`: counts, ratios, variants, source modes, and alignment;
- `exclude-existing-off`: field already has another clear off switch, such as
  `guides.enabled`.

## Initial Findings

Use this as the seed list and update it if the scan finds drift:

| Widget | Add or alias `none` for |
|---|---|
| `hero` | `layout.maxWidth`, `layout.contentWidth`, `style.headlineSize`, `style.subheadSize`, `style.bodySize`, `style.borderRadius`, `style.mediaRadius`, `style.primaryButtonSize`, `style.secondaryButtonSize` |
| `navigation` | `layout.maxWidth`, `layout.paddingY`, `layout.itemGap`, `style.fontSize`, `style.fontWeight` |
| `footer` | `layout.maxWidth`, `layout.columnGap`, `layout.sectionPaddingY`, `style.fontSize` |
| `stack` | responsive `gap` tokens, preserving `"0"` compatibility |
| `splitLayout` | `gap`, preserving `"0"` compatibility |
| `gridColumns` | `layout.gapX`, `layout.gapY`, `style.columnPadding` |
| `divider` | `marginTop`, `marginBottom`, preserving `"0"` compatibility |
| `spacer` | responsive `height`, preserving `"0"` compatibility |
| `screenTwoColumn` | `gap` |
| `statsKpi` | `style.spacing` |
| `featureGrid` | `style.gap` |
| `contentList` | `style.gap` |
| `postsFeed` | `style.gap` |
| `entryTeaser` | `style.spacing`, `style.radius` |
| `galleryMosaic` | `style.gap` |
| `ctaBanner` | `style.padding` |
| `pricingPlans` | `style.spacing` |
| `faqAccordion` | `style.spacing` |
| `team` | `style.gap` |
| `testimonials` | `style.spacing` |
| `contact` | `style.spacing` |
| `newsletter` | `style.spacing` |
| `formEmbed` | `layout.width`, `layout.spacing`, `style.radius`, `style.inputSize` |
| `logoCloud` | `style.logoHeight`, `style.gap` |
| `richTextSection` | `style.fontScale`, `style.lineHeight`, `style.spacing`; confirm whether `options.maxWidth = "full"` remains the off switch |
| `timeline` | `layout.spacing`, `style.titleSize`, `style.descriptionSize`; confirm whether marker/line size needs `none` or should stay structural |
| `compareTimeline` | `layout.trackSpacing`, `style.trackLabelSize`, `style.stepLabelSize`, `style.segmentLabelSize` |

Explicitly exclude unless product scope changes:

- `columns` in content/list/grid/team/product widgets;
- `ratio` in gallery and split layout;
- `borderWidth`/`borderTopWidth`, because `"0"` is already the border off
  value;
- `textTransform`, media `type`, and background media `type`, because they
  already use semantic `none`.

## Current Code Reference Inventory

Reviewed on 2026-04-29. Line references are current for the checked-out
`feature/tasks` branch. If another branch changes these files before
implementation starts, refresh only the line references and keep the ownership
split.

### Runtime and Schema Owners

| Surface | Source refs | Fields | Owner |
|---|---|---|---|
| `hero` | `core/widgets/core/hero.tsx:125-166`, `221-287`, `320-455`, `541` | `borderRadius`, `mediaRadius` owned by TASK-242-02-01; `layout.maxWidth`, `layout.contentWidth`, `headlineSize`, `subheadSize`, `bodySize`, `primaryButtonSize`, `secondaryButtonSize` owned by TASK-242-03-02 | TASK-242-02-01, TASK-242-03-02 |
| `navigation` | `core/widgets/core/navigation.tsx:184-203`, `236-268`, `366-389` | `layout.paddingY`, `layout.itemGap` owned by TASK-242-02-01; `layout.maxWidth`, `style.fontSize`, `style.fontWeight` owned by TASK-242-03-02 | TASK-242-02-01, TASK-242-03-02 |
| `footer` | `core/widgets/core/footer.tsx:119-136`, `192-210`, `332-391` | `layout.columnGap`, `layout.sectionPaddingY` owned by TASK-242-02-01; `layout.maxWidth`, `style.fontSize` owned by TASK-242-03-02 | TASK-242-02-01, TASK-242-03-02 |
| `stack` | `core/widgets/core/stack.tsx:11-26`, `108-166`, `208-260` | responsive `gap` tokens, legacy `"0"` alias | TASK-242-02-01 |
| `splitLayout` | `core/widgets/core/splitLayout.tsx:13-57`, `118-191`, `247` | `gap`, legacy `"0"` alias | TASK-242-02-01 |
| `gridColumns` | `core/widgets/core/gridColumns.tsx:26-36`, `217-254`, `331-497` | `gapX`, `gapY`, `columnPadding`; `columnRadius` already has `none` | TASK-242-02-01 |
| `divider` | `core/widgets/core/divider.tsx:5-42`, `133-159` | `marginTop`, `marginBottom`, legacy `"0"` alias; keep `width` structural | TASK-242-02-01 |
| `spacer` | `core/widgets/core/spacer.tsx:5-39`, `104`, `152` | responsive `height`, legacy `"0"` alias | TASK-242-02-01 |
| `screenTwoColumn` | `core/widgets/core/screenTwoColumn.tsx:13-32`, `42-92` | `gap` | TASK-242-02-01 |
| `statsKpi` | `core/widgets/core/statsKpi.tsx:7-96`, `35`, `162`, `240-376` | `style.spacing` | TASK-242-02-02 |
| `featureGrid` | `core/widgets/core/featureGrid.tsx:7-123`, `53-72`, `261-428` | `style.gap`; `style.radius` already has `none` | TASK-242-02-02 |
| `contentList` | `core/widgets/core/contentList.tsx:21-154`, `266`, `328`, `377-646` | `style.gap` | TASK-242-02-02 |
| `postsFeed` | `core/widgets/core/postsFeed.tsx:149`, `228`, `333` | local `style.gap` schema/type/normalizer plus `mapPostsFeedToContentListData()` handoff to content-list rendering | TASK-242-02-02 |
| `entryTeaser` | `core/widgets/core/entryTeaser.tsx:9-110`, `204-210`, `268-523` | `style.spacing`, `style.radius` | TASK-242-02-02 |
| `galleryMosaic` | `core/widgets/core/galleryMosaic.tsx:7-95`, `44-50`, `162-474` | `style.gap`; `style.radius` already has `none` | TASK-242-02-02 |
| `ctaBanner` | `core/widgets/core/ctaBanner.tsx:7-112`, `46-54`, `178-339` | `style.padding`; `style.radius` already has `none` | TASK-242-02-02 |
| `pricingPlans` | `core/widgets/core/pricingPlans.tsx:9-108`, `48-54`, `172-559` | `style.spacing`; `style.radius` already has `none` | TASK-242-02-02 |
| `faqAccordion` | `core/widgets/core/faqAccordion.tsx:6-92`, `35`, `140`, `229-325` | `style.spacing` | TASK-242-02-02 |
| `team` | `core/widgets/core/team.tsx:7-124`, `43-63`, `187-553` | `style.gap`; `style.radius` already has `none` | TASK-242-02-02 |
| `testimonials` | `core/widgets/core/testimonials.tsx:6-92`, `43`, `155`, `238-372` | `style.spacing` | TASK-242-02-02 |
| `contact` | `core/widgets/core/contact.tsx:8-180`, `59-82`, `219-327` | `style.spacing` | TASK-242-02-02 |
| `newsletter` | `core/widgets/core/newsletter.tsx:6-99`, `31`, `135`, `178-251` | `style.spacing` | TASK-242-02-02 |
| `formEmbed` | `core/widgets/core/formEmbed.tsx:210-224`, `80-112`, `265`, `501-538` | `layout.spacing`, `style.radius` owned by TASK-242-02-02; `layout.width`, `style.inputSize` owned by TASK-242-03-02 | TASK-242-02-02, TASK-242-03-02 |
| `logoCloud` | `core/widgets/core/logoCloud.tsx:6-92`, `35-42`, `134`, `214-354` | `style.gap` owned by TASK-242-02-02; `style.logoHeight` owned by TASK-242-03-02 | TASK-242-02-02, TASK-242-03-02 |
| `richTextSection` | `core/widgets/core/richTextSection.tsx:13-16`, `148-160`, `58-80`, `229`, `405-561` | `style.spacing` owned by TASK-242-02-02; `style.fontScale` and `style.lineHeight` owned by TASK-242-03-02; keep `options.maxWidth="full"` as existing no-limit width unless reclassified | TASK-242-02-02, TASK-242-03-02 |
| `timeline` | `core/widgets/core/timeline.tsx:8-14`, `138-162`, `58`, `350`, `403`, `474`, `550` | `layout.spacing` owned by TASK-242-02-02; `style.titleSize`, `style.descriptionSize` owned by TASK-242-03-02; keep marker/line size structural unless reclassified | TASK-242-02-02, TASK-242-03-02 |
| `compareTimeline` | `core/widgets/core/compareTimeline.tsx:7-12`, `165`, `187-189`, `365`, `597`, `608-610` | `trackSpacing` owned by TASK-242-02-02; `trackLabelSize`, `stepLabelSize`, `segmentLabelSize` owned by TASK-242-03-02 | TASK-242-02-02, TASK-242-03-02 |

When a widget file appears in multiple owner rows, implement each field group in
the named runtime leaf and leave the admin editor option exposure to
TASK-242-03-01. Do not use one leaf to opportunistically edit the other leaf's
runtime token family unless resolving an already-landed merge conflict.

### Editor and Test Owners

| Surface | Editor refs | Focused test refs | Owner |
|---|---|---|---|
| `hero` | `core/admin/ui/widgets/editors/HeroEditors.tsx:105-140`, `1035-1583` | `tests/vitest/ui/hero-editor-wave.test.tsx:810`, `1151` | TASK-242-03-01 |
| `navigation` | `core/admin/ui/widgets/editors/NavigationEditors.tsx:69-78`, `1177-1354` | `tests/vitest/ui/navigation-editor-wave.test.tsx:1049`, `1276`, `1335` | TASK-242-03-01 |
| `footer` | `core/admin/ui/widgets/editors/FooterEditors.tsx:32-57`, `663-826` | `tests/vitest/ui/footer-editor-wave.test.tsx:203`, `427` | TASK-242-03-01 |
| `stack` | `core/admin/ui/widgets/editors/StackEditors.tsx:55`, `244-403` | `tests/vitest/ui/stack-editor-wave.test.tsx:171`, `321`, `419` | TASK-242-03-01 |
| `splitLayout` | `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx:60`, `250`, `393`, `536` | `tests/vitest/ui/split-layout-editor-wave.test.tsx:299`, `361`, `455` | TASK-242-03-01 |
| `gridColumns` | `core/admin/ui/widgets/editors/GridColumnsEditors.tsx:62-88`, `517-892` | `tests/vitest/ui/grid-columns-editor-wave.test.tsx:350`, `485`, `617`, `778` | TASK-242-03-01 |
| `divider` | `core/admin/ui/widgets/editors/DividerEditors.tsx:60` | `tests/vitest/ui/divider-editor-wave.test.tsx:223`, `344` | TASK-242-03-01 |
| `spacer` | `core/admin/ui/widgets/editors/SpacerEditors.tsx:45`, `184` | `tests/vitest/ui/spacer-editor-wave.test.tsx:346`, `415`, `559` | TASK-242-03-01 |
| `screenTwoColumn` | `core/admin/ui/widgets/editors/ScreenEditors.tsx:339`, `385` | add or extend current screen editor coverage if no focused suite exists | TASK-242-03-01 |
| `statsKpi` | `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:59`, `586`, `657` | `tests/vitest/ui/stats-kpi-editor-wave.test.tsx:378`, `521`, `650` | TASK-242-03-01 |
| `featureGrid` | `core/admin/ui/widgets/editors/FeatureGridEditors.tsx:55-74`, `457`, `692-794` | `tests/vitest/ui/feature-grid-editor-wave.test.tsx:265`, `517`, `626` | TASK-242-03-01 |
| `contentList` | `core/admin/ui/widgets/editors/ContentListEditors.tsx:92`, `610` | `tests/vitest/ui/content-list-editor-wave.test.tsx:472`, `713`, `996` | TASK-242-03-01 |
| `postsFeed` | `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:70`, `448-459` | `tests/vitest/ui/posts-feed-editor-wave.test.tsx:293`, `643`; legacy coverage in `tests/vitest/ui/widget-editors-wave-1.test.tsx:435` | TASK-242-03-01 |
| `entryTeaser` | `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx:79-86`, `925-945` | `tests/vitest/ui/entry-teaser-editor-wave.test.tsx:478`, `753`, `915` | TASK-242-03-01 |
| `galleryMosaic` | `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:63-69`, `673-771` | `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx:364`, `498`, `606` | TASK-242-03-01 |
| `ctaBanner` | `core/admin/ui/widgets/editors/CtaBannerEditors.tsx:57-65`, `503-524` | `tests/vitest/ui/cta-banner-editor-wave.test.tsx:413`, `537`, `634` | TASK-242-03-01 |
| `pricingPlans` | `core/admin/ui/widgets/editors/PricingPlansEditors.tsx:54-60`, `852-935` | `tests/vitest/ui/pricing-plans-editor-wave.test.tsx:374`, `577`, `745` | TASK-242-03-01 |
| `faqAccordion` | `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx:52`, `618`, `720` | `tests/vitest/ui/faq-accordion-editor-wave.test.tsx:427`, `589`, `665` | TASK-242-03-01 |
| `team` | `core/admin/ui/widgets/editors/TeamEditors.tsx:63-69`, `757-863` | `tests/vitest/ui/team-editor-wave.test.tsx:335`, `500`, `768` | TASK-242-03-01 |
| `testimonials` | `core/admin/ui/widgets/editors/TestimonialsEditors.tsx:52`, `442`, `678` | `tests/vitest/ui/testimonials-editor-wave.test.tsx:357`, `532`, `813` | TASK-242-03-01 |
| `contact` | `core/admin/ui/widgets/editors/ContactEditors.tsx:38`, `695` | `tests/vitest/ui/contact-editor-wave.test.tsx:399`, `571`, `790` | TASK-242-03-01 |
| `newsletter` | `core/admin/ui/widgets/editors/NewsletterEditors.tsx:48`, `551`, `623` | `tests/vitest/ui/newsletter-editor-wave.test.tsx:451`, `607`, `703` | TASK-242-03-01 |
| `formEmbed` | `core/admin/ui/widgets/editors/FormEmbedEditors.tsx:30-56`, `76-92`, `396-586` | `tests/vitest/ui/form-embed-editor-wave.test.tsx:404`, `542`, `641` | TASK-242-03-01 |
| `logoCloud` | `core/admin/ui/widgets/editors/LogoCloudEditors.tsx:54-61`, `512-642` | `tests/vitest/ui/logo-cloud-editor-wave.test.tsx:433`, `548`, `605` | TASK-242-03-01 |
| `richTextSection` | `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx:56-75`, `524-876` | `tests/vitest/ui/rich-text-section-editor-wave.test.tsx:350`, `535`, `647` | TASK-242-03-01 |
| `timeline` | `core/admin/ui/widgets/editors/TimelineEditors.tsx:73-110`, `705-751` | `tests/vitest/ui/timeline-editor-wave.test.tsx:385`, `581` | TASK-242-03-01 |
| `compareTimeline` | `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx:52-54`, `841-907` for `trackLabelSizes`, `stepLabelSizes`, `segmentLabelSizes` | `tests/vitest/ui/compare-timeline-editor-wave.test.tsx:519-528`, `569-571`; keep broader spacing assertions around `387`, `585`, `734` when `trackSpacing` changes | TASK-242-03-01 |

### Runtime Widget Test Owners

Use the current runner ownership from `tests/README.md` and `vitest.config.ts`.
Most pure widget render/normalizer coverage is Bun-free and belongs in
`tests/vitest/widgets/*`. Keep the existing Bun-owned `tests/unit/widgets/*`
files only for surfaces that already live there.

| Surface | Runtime/render test owner |
|---|---|
| `hero` | `tests/vitest/widgets/hero.test.tsx` |
| `navigation` | `tests/vitest/widgets/navigation.test.tsx` |
| `footer` | `tests/vitest/widgets/footer.test.tsx` |
| `stack` | `tests/vitest/widgets/stack.test.tsx` |
| `splitLayout` | `tests/vitest/widgets/splitLayout.test.tsx` |
| `gridColumns` | `tests/vitest/widgets/gridColumns.test.tsx` |
| `divider` | `tests/vitest/widgets/divider.test.tsx` |
| `spacer` | `tests/vitest/widgets/spacer.test.tsx` |
| `screenTwoColumn` | `tests/vitest/widgets/screenWidgets.test.tsx` |
| `statsKpi` | `tests/vitest/widgets/statsKpi.test.tsx` |
| `featureGrid` | `tests/vitest/widgets/featureGrid.test.tsx` |
| `contentList` | `tests/unit/widgets/contentList.test.tsx` |
| `postsFeed` | `tests/unit/widgets/postsFeedWidget.test.tsx` |
| `entryTeaser` | `tests/unit/widgets/entryTeaser.test.tsx` |
| `galleryMosaic` | `tests/vitest/widgets/galleryMosaic.test.tsx` |
| `ctaBanner` | `tests/vitest/widgets/ctaBanner.test.tsx` |
| `pricingPlans` | `tests/vitest/widgets/pricingPlans.test.tsx` |
| `faqAccordion` | `tests/vitest/widgets/faqAccordion.test.tsx` |
| `team` | `tests/vitest/widgets/team.test.tsx` |
| `testimonials` | `tests/vitest/widgets/testimonials.test.tsx` |
| `contact` | `tests/vitest/widgets/contact.test.tsx` |
| `newsletter` | `tests/vitest/widgets/newsletter.test.tsx` |
| `formEmbed` | `tests/vitest/widgets/formEmbed.test.tsx` |
| `logoCloud` | `tests/vitest/widgets/logoCloud.test.tsx` |
| `richTextSection` | `tests/vitest/widgets/richTextSection.test.tsx` |
| `timeline` | `tests/vitest/widgets/timeline.test.tsx` |
| `compareTimeline` | `tests/vitest/widgets/compareTimeline.test.tsx` |

### Documentation Owners

| File | Current refs | Update needed |
|---|---|---|
| `_docs/WIDGETS.md` | `77`, `188-189`, `406`, `421`, `435` | add global `none` semantics for visual tokens, legacy `"0"` compatibility, and structural exclusions |
| `_docs/_WIDGETS/HERO.md` | `45-46`, `75-80` | document width, typography, button, and radius `none` behavior |
| `_docs/_WIDGETS/NAVIGATION.md` | `50`, `66`, `138-154` | document max width, padding, item gap, font-size, and font-weight `none` behavior |
| `_docs/_WIDGETS/FOOTER.md` | `46`, `55-56`, `68-69`, `95`, `108` | document max width, column gap, section padding, and font-size `none` behavior |
| `_docs/_WIDGETS/STACK.md` | `27`, `40`, `45`, `50`, `65` | document responsive gap `none` and legacy `"0"` alias |
| `_docs/_WIDGETS/SPLIT_LAYOUT.md` | `28`, `42`, `58`, `74` | document `gap="none"` behavior |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | `29`, `43`, `57-58`, `82-83` | document gap and padding `none` behavior |
| `_docs/_WIDGETS/DIVIDER.md` | `38`, `43` | document margin `none` / `"0"` compatibility |
| `_docs/_WIDGETS/SPACER.md` | scan before edit | document responsive height `none` / `"0"` compatibility |
| `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` | file missing today | create per-widget doc, add it to `_docs/_WIDGETS/README.md`, and document `gap="none"` behavior |
| `_docs/_WIDGETS/STATS_KPI.md` | `39`, `50`, `78` | document spacing `none` behavior |
| `_docs/_WIDGETS/FEATURE_GRID.md` | file missing today | create per-widget doc, add it to `_docs/_WIDGETS/README.md`, and document gap `none` behavior plus radius no-op coverage |
| `_docs/_WIDGETS/CONTENT_LIST.md` | `88` | document card/list gap `none` behavior |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | `38`, `84-85` | document spacing and radius `none` behavior |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | `50`, `79-80` | document gap `none` behavior and radius no-op coverage |
| `_docs/_WIDGETS/CTA_BANNER.md` | `30`, `46`, `68-69` | document padding `none` behavior and radius no-op coverage |
| `_docs/_WIDGETS/PRICING_PLANS.md` | file missing today | create per-widget doc, add it to `_docs/_WIDGETS/README.md`, and document spacing `none` behavior plus radius no-op coverage |
| `_docs/_WIDGETS/FAQ.md` | `15`, `34`, `52`, `83` | document spacing `none` behavior |
| `_docs/_WIDGETS/TEAM.md` | `48-49`, `80`, `83` | document gap `none` behavior and radius no-op coverage |
| `_docs/_WIDGETS/TESTIMONIALS.md` | file missing today | create per-widget doc, add it to `_docs/_WIDGETS/README.md`, and document spacing `none` behavior |
| `_docs/_WIDGETS/CONTACT.md` | `60`, `89`, `106` | document spacing `none` behavior |
| `_docs/_WIDGETS/NEWSLETTER.md` | `40`, `55`, `82` | document spacing `none` behavior |
| `_docs/_WIDGETS/FORM_EMBED.md` | file missing today | create per-widget doc, add it to `_docs/_WIDGETS/README.md`, and document width, spacing, radius, and input-size `none` behavior |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | `48`, `73`, `76` | document logo height and gap `none` behavior |
| `_docs/_WIDGETS/RICH_TEXT_SECTION.md` | `54`, `87`, `91`, `95` | document font scale, line height, and spacing `none`; keep `maxWidth="full"` note if unchanged |
| `_docs/_WIDGETS/TIMELINE.md` | `34`, `70` | document spacing and label-size `none` behavior |
| `_docs/_WIDGETS/COMPARE_TIMELINE.md` | `40` | document track spacing and label-size `none` behavior |
| `_docs/_WIDGETS/POSTS_FEED.md` | `70` | document inherited content-list gap `none` behavior |
| `_docs/_TASKS/README.md` | TASK-242 rows | keep new TASK-242-03-02 row and status counts synchronized |
| `_docs/_CHANGELOG/README.md` | next changelog number on closure | add TASK-242 changelog entry only when implementation closes |

## Pseudocode

```ts
const offCapableNames = /spacing|gap|padding|radius|font|size|height|width/i;
const structuralNames = /columns|span|ratio|variant|source|align|orientation/i;

function classifyField(name: string, values: string[]) {
  if (structuralNames.test(name)) return "exclude-structural";
  if (values.includes("none")) return "already-none";
  if (values.includes("0")) return "legacy-zero";
  if (offCapableNames.test(name)) return "add-none";
  return "review";
}
```

## Testing Requirements

- No production test changes in this leaf.
- Record the final inventory in TASK-242 before implementation starts.

## Documentation Updates Required

- `_docs/_TASKS/TASK-242_Widget_Style_Token_None_Options.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every core widget enum-like visual field has an owner decision.
2. Editor option arrays are mapped to the same field decisions.
3. Exclusions are explicit and defensible.
