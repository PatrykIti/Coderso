# TASK-244-01-01: Widget Surface Background Inventory

# FileName: TASK-244-01-01_Widget_Surface_Background_Inventory.md

**Priority:** High
**Category:** Widgets + Inventory
**Estimated Effort:** Medium
**Dependencies:** TASK-242
**Status:** Done (2026-04-30)

---

## Overview

Create the execution inventory for all widget backgrounds, gradients, overlays,
and visual surfaces that cannot currently be cleared in a product-facing way.
Use current code as the source of truth.

## Sub-Tasks

- None. This is an execution leaf.

## Inventory Owners

| Owner group | Files to inspect |
|---|---|
| Core definitions | `core/widgets/core/*.tsx` |
| Admin editors | `core/admin/ui/widgets/editors/*.tsx` |
| UI tests | `tests/vitest/ui/*editor-wave.test.tsx` |
| Widget render tests | `tests/vitest/widgets/*.test.tsx`; Bun-owned current owners `tests/unit/widgets/contentList.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`, `tests/unit/widgets/entryTeaser.test.tsx` |
| Docs | `_docs/WIDGETS.md`, `_docs/_WIDGETS/*.md` |

## Required Classification

Each finding must be classified as one of:

- `clear-required`: rendered public/widget output forces a gradient, background,
  overlay, card surface, or framed shell and no clear affordance exists;
- `already-clearable`: user can already remove the visual surface without
  storing a fake `transparent` sentinel;
- `intentional-state`: state color is part of validation, empty, warning,
  success, destructive, stock, or lifecycle semantics and is not a style surface;
- `exclude-admin-only`: admin chrome, preview thumbnail, library card, skeleton,
  or drawer styling that is not rendered widget output.

## Contract Audit Requirements

For every `clear-required` row, record whether the target field already exists
in the widget data contract or must be added to the existing contract:

- existing field: name the current type, schema, default, normalizer, renderer,
  editor, test, and docs owner;
- new field: extend the same widget's data type, JSON schema, defaults,
  normalizer, renderer, editor, and tests. Do not add a parallel editor flow or
  a widget-specific save path;
- defaulted field: if the normalizer currently materializes a default when the
  property is absent, the implementation leaf must decide how cleared absence is
  distinguished from legacy absence before runtime work starts;
- no current editor control: name the insertion point in the existing editor
  section and add the clearable control there instead of creating a second
  settings panel for the same widget.

Keep `additionalProperties: false` wherever the current widget schema uses it.
Strict validation tests must prove accepted clear payloads and rejected unknown
style keys for every schema extension.

## Current Execution Matrix

Refresh line references if implementation starts after code moves. The current
scan is from 2026-04-30 and covers every widget registered by
`createCoreWidgetDefinitions` in `core/widgets/core/index.ts`.

| Widget | Classification | Current refs | Owner | Test/docs owners |
|---|---|---|---|---|
| `section` | `clear-required` for `style.backgroundColor`; gradient/overlay no-regression | `section.tsx:101-109`, `section.tsx:192-200`, `section.tsx:257-286` already treat empty gradient endpoints and `overlayOpacity: 0` as omitted output; `section.tsx:191` and `section.tsx:257` still normalize/render transparent `backgroundColor`; `SectionEditors.tsx:289-295` and `SectionEditors.tsx:407-413` expose background color without semantic clear; `section.tsx:333` empty-region placeholder is an intentional layout state | TASK-244-02-03 | `tests/vitest/widgets/section.test.tsx`; `tests/vitest/ui/section-editor-wave.test.tsx`; `_docs/_WIDGETS/SECTION.md` |
| `template-section` | `intentional-state` | `templateSection.tsx:107` placeholder `bg-muted/20` is public runtime output, but it is a missing-template state, not a configurable widget surface | TASK-244-01-01 | `tests/vitest/widgets/templateSection.test.tsx`; `TemplateSectionEditors.tsx`; `_docs/_WIDGETS/TEMPLATE_SECTION.md` |
| `grid-columns` | `clear-required` | `gridColumns.tsx:51`, `gridColumns.tsx:104`, `gridColumns.tsx:126`, `gridColumns.tsx:352`, `gridColumns.tsx:439`; editor `GridColumnsEditors.tsx:696-699` has `Column background` without semantic clear | TASK-244-04-01 | `tests/vitest/widgets/gridColumns.test.tsx`; `tests/vitest/ui/grid-columns-editor-wave.test.tsx`; `_docs/_WIDGETS/GRID_COLUMNS.md` |
| `split-layout` | `intentional-state` | `splitLayout.tsx:255`, `splitLayout.tsx:269` are public empty-column placeholder panels, not configurable visual surfaces | TASK-244-01-01 | `tests/vitest/widgets/splitLayout.test.tsx`; `SplitLayoutEditors.tsx`; `_docs/_WIDGETS/SPLIT_LAYOUT.md` |
| `tabs` | `clear-required` | `tabs.tsx:27-32`, `tabs.tsx:77-82`, `tabs.tsx:98-103`, `tabs.tsx:199-222`, `tabs.tsx:340-355`; editor `TabsEditors.tsx:319-365` | TASK-244-04-02 | `tests/vitest/widgets/tabs.test.tsx`; `tests/vitest/ui/tabs-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `accordion` | `clear-required` | `accordion.tsx:27`, `accordion.tsx:74`, `accordion.tsx:100`, `accordion.tsx:191-194`, `accordion.tsx:280`; editor `AccordionEditors.tsx:306-312` | TASK-244-04-02 | `tests/vitest/widgets/accordionWidget.test.tsx`; `tests/vitest/ui/accordion-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `toggle-block` | `clear-required` | `toggleBlock.tsx:23`, `toggleBlock.tsx:53`, `toggleBlock.tsx:71`, `toggleBlock.tsx:106-109`, `toggleBlock.tsx:207`; editor `ToggleBlockEditors.tsx:245-255` | TASK-244-04-02 | `tests/vitest/widgets/toggleBlock.test.tsx`; `tests/vitest/ui/toggle-block-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `spacer` | `intentional-state` | `spacer.tsx:188` runtime measurement label uses `bg-[var(--color-bg)]/80`; it is public preview output but represents the spacer measurement state, not a configurable widget surface | TASK-244-01-01 | `tests/vitest/widgets/spacer.test.tsx`; `SpacerEditors.tsx`; `_docs/_WIDGETS/SPACER.md` |
| `divider` | `already-clearable` | No background/surface field in public divider output; classification should stay no-op unless implementation finds a new real surface | TASK-244-01-01 | `tests/vitest/widgets/divider.test.tsx`; `DividerEditors.tsx`; `_docs/_WIDGETS/DIVIDER.md` |
| `stack` | `intentional-state` | `stack.tsx:268` is a public empty-stack placeholder panel, not a configurable widget surface | TASK-244-01-01 | `tests/vitest/widgets/stack.test.tsx`; `StackEditors.tsx`; `_docs/_WIDGETS/STACK.md` |
| `hero` | `clear-required` | `hero.tsx:17`, `hero.tsx:51`, `hero.tsx:55`, `hero.tsx:112`, `hero.tsx:154`, `hero.tsx:158`, `hero.tsx:337-351`, `hero.tsx:380`, `hero.tsx:392`, `hero.tsx:440-443`, `hero.tsx:550-551`; editor `HeroEditors.tsx:1097-1100`, `HeroEditors.tsx:1215-1239`, `HeroEditors.tsx:1338-1348`, `HeroEditors.tsx:1557-1570` | TASK-244-02-01 | `tests/vitest/widgets/hero.test.tsx`; `tests/vitest/widgets/heroEditors.test.tsx`; `tests/vitest/ui/hero-editor-wave.test.tsx`; `_docs/_WIDGETS/HERO.md` |
| `feature-grid` | `clear-required` | `featureGrid.tsx:31`, `featureGrid.tsx:121`, `featureGrid.tsx:165`, `featureGrid.tsx:300-302`, `featureGrid.tsx:347`; editor `FeatureGridEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/featureGrid.test.tsx`; `tests/vitest/ui/feature-grid-editor-wave.test.tsx`; `_docs/_WIDGETS/FEATURE_GRID.md` |
| `testimonials` | `clear-required` | `testimonials.tsx:26-27`, `testimonials.tsx:89-90`, `testimonials.tsx:132-133`, `testimonials.tsx:259-265`, `testimonials.tsx:354-355`; editor `TestimonialsEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/testimonials.test.tsx`; `tests/vitest/ui/testimonials-editor-wave.test.tsx`; `_docs/_WIDGETS/TESTIMONIALS.md` |
| `pricing-plans` | `clear-required` | `pricingPlans.tsx:28-29`, `pricingPlans.tsx:102-103`, `pricingPlans.tsx:153-154`, `pricingPlans.tsx:307-313`, `pricingPlans.tsx:351-383`, `pricingPlans.tsx:433-436`, `pricingPlans.tsx:488`; editor `PricingPlansEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/pricingPlans.test.tsx`; `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`; `_docs/_WIDGETS/PRICING_PLANS.md` |
| `faq-accordion` | `clear-required` | `faqAccordion.tsx:25`, `faqAccordion.tsx:91`, `faqAccordion.tsx:129`, `faqAccordion.tsx:267`, `faqAccordion.tsx:295`; editor `FaqAccordionEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/faqAccordion.test.tsx`; `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`; `_docs/_WIDGETS/FAQ.md` |
| `cta-banner` | `clear-required` | `ctaBanner.tsx:26`, `ctaBanner.tsx:32-33`, `ctaBanner.tsx:144`, `ctaBanner.tsx:150-151`, `ctaBanner.tsx:245-258`, `ctaBanner.tsx:315`, `ctaBanner.tsx:346-381`; editor `CtaBannerEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/ctaBanner.test.tsx`; `tests/vitest/ui/cta-banner-editor-wave.test.tsx`; `_docs/_WIDGETS/CTA_BANNER.md` |
| `logo-cloud` | `clear-required` | `LogoCloudItem` at `logoCloud.tsx:250-308` renders repeated logo tiles; wrapper background is class-driven at `logoCloud.tsx:283-284` and needs a clearable tile-surface contract | TASK-244-04-01 | `tests/vitest/widgets/logoCloud.test.tsx`; `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`; `_docs/_WIDGETS/LOGO_CLOUD.md` |
| `gallery-mosaic` | `clear-required` | `galleryMosaic.tsx:29`, `galleryMosaic.tsx:97`, `galleryMosaic.tsx:145`, `galleryMosaic.tsx:270-272`, `galleryMosaic.tsx:306`, `galleryMosaic.tsx:400`; editor `GalleryMosaicEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/galleryMosaic.test.tsx`; `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`; `_docs/_WIDGETS/GALLERY_MOSAIC.md` |
| `stats-kpi` | `clear-required` | `StatsKpiCard` at `statsKpi.tsx:299-307` forces card/split-highlight item backgrounds; `statsKpi.tsx:358-404` is the outer layout/rendering path and should only be touched if style data must flow into `StatsKpiCard`; editor `StatsKpiEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/statsKpi.test.tsx`; `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`; `_docs/_WIDGETS/STATS_KPI.md` |
| `team` | `clear-required` | `team.tsx:34-35`, `team.tsx:123-124`, `team.tsx:168-169`, `team.tsx:341-347`, `team.tsx:455-460`; editor `TeamEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/team.test.tsx`; `tests/vitest/ui/team-editor-wave.test.tsx`; `_docs/_WIDGETS/TEAM.md` |
| `rich-text-section` | `clear-required` | `richTextSection.tsx:44`, `richTextSection.tsx:162`, `richTextSection.tsx:205`, `richTextSection.tsx:410`, `richTextSection.tsx:444`, `richTextSection.tsx:516`; editor `RichTextSectionEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/richTextSection.test.tsx`; `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`; `_docs/_WIDGETS/RICH_TEXT_SECTION.md` |
| `content-list` | `clear-required` | `contentList.tsx:62-64`, `contentList.tsx:150-152`, `contentList.tsx:237-239`, `contentList.tsx:443-447`, `contentList.tsx:537`, `contentList.tsx:616-673`; editor `ContentListEditors.tsx` | TASK-244-04-01 | `tests/unit/widgets/contentList.test.tsx`; `tests/vitest/ui/content-list-editor-wave.test.tsx`; `_docs/_WIDGETS/CONTENT_LIST.md` |
| `posts-feed` | `clear-required` | `postsFeed.tsx:44-46`, `postsFeed.tsx:146-148`, `postsFeed.tsx:210-212`, `postsFeed.tsx:298-300`, `postsFeed.tsx:368-371`; editor `PostsFeedEditors.tsx` | TASK-244-04-01 | `tests/unit/widgets/postsFeedWidget.test.tsx`; `tests/vitest/ui/posts-feed-editor-wave.test.tsx`; `_docs/_WIDGETS/POSTS_FEED.md` |
| `entry-teaser` | `clear-required` | `entryTeaser.tsx:47`, `entryTeaser.tsx:107`, `entryTeaser.tsx:183`, `entryTeaser.tsx:331`, `entryTeaser.tsx:376`, `entryTeaser.tsx:466`; editor `EntryTeaserEditors.tsx` | TASK-244-04-01 | `tests/unit/widgets/entryTeaser.test.tsx`; `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`; `_docs/_WIDGETS/ENTRY_TEASER.md` |
| `product-gallery` | `clear-required` | `productGallery.tsx:342-365` forces empty/card backgrounds; editor `ProductGalleryEditors.tsx` plus `CommerceWidgetEditorShared.tsx` if shared style controls are added | TASK-244-03-02 | `tests/vitest/widgets/productGallery.test.tsx`; `tests/vitest/ui/product-gallery-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `product-compare` | `clear-required` | `productCompare.tsx:339-351` forces empty/table/header backgrounds; editor `ProductCompareEditors.tsx` plus `CommerceWidgetEditorShared.tsx` if shared style controls are added | TASK-244-03-02 | `tests/vitest/widgets/productCompare.test.tsx`; `tests/vitest/ui/product-compare-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `product-table` | `clear-required` | `productTable.tsx:350-362` forces empty/table/header backgrounds; editor `ProductTableEditors.tsx` plus `CommerceWidgetEditorShared.tsx` if shared style controls are added | TASK-244-03-02 | `tests/vitest/widgets/productTable.test.tsx`; `tests/vitest/ui/product-table-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `listing-filters` | `clear-required` | `listingFilters.tsx:493`, `listingFilters.tsx:543-548` force filter shell and primary action background | TASK-244-03-02 | `tests/vitest/widgets/listingFilters.test.tsx`; `tests/vitest/ui/listing-filters-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `search-box` | `clear-required` | `searchBox.tsx:190-221`, `searchBox.tsx:265-292` force listing/global shells and primary action background | TASK-244-03-02 | `tests/vitest/widgets/searchBox.test.tsx`; `tests/vitest/ui/search-box-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `timeline` | `clear-required` | `timeline.tsx:47`, `timeline.tsx:168`, `timeline.tsx:249`, `timeline.tsx:353`, `timeline.tsx:385`, `timeline.tsx:441`, `timeline.tsx:511`, `timeline.tsx:580`, `timeline.tsx:597`, `timeline.tsx:614-617`; editor `TimelineEditors.tsx` | TASK-244-04-01 | `tests/vitest/widgets/timeline.test.tsx`; `tests/vitest/ui/timeline-editor-wave.test.tsx`; `_docs/_WIDGETS/TIMELINE.md` |
| `compare-timeline` | `clear-required` | `compareTimeline.tsx:479-522` highlight, marker, and panel backgrounds need style-owned clear semantics without removing state readability | TASK-244-04-01 | `tests/vitest/widgets/compareTimeline.test.tsx`; `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`; `_docs/_WIDGETS/COMPARE_TIMELINE.md` |
| `newsletter` | `clear-required` | `newsletter.tsx:24`, `newsletter.tsx:102`, `newsletter.tsx:129`, `newsletter.tsx:187`, `newsletter.tsx:215`, `newsletter.tsx:247`; editor `NewsletterEditors.tsx:514-517` | TASK-244-04-02 | `tests/vitest/widgets/newsletter.test.tsx`; `tests/vitest/ui/newsletter-editor-wave.test.tsx`; `_docs/_WIDGETS/NEWSLETTER.md` |
| `booking-calendar` | `clear-required` | `bookingCalendar.tsx:348` forces the root frame; `bookingCalendar.tsx:418-424` is currently border/text-only refresh action output, so action background should become clearable only if TASK-244-03-02 first introduces a user-owned action background field | TASK-244-03-02 | `tests/vitest/widgets/bookingCalendar.test.tsx`; `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `appointment-form` | `clear-required` | `appointmentForm.tsx:229`, `appointmentForm.tsx:250`, `appointmentForm.tsx:317-323` force root, selected-slot panel, and submit action background | TASK-244-03-02 | `tests/vitest/widgets/appointmentForm.test.tsx`; `tests/vitest/ui/appointment-form-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `form-embed` | `clear-required` | `formEmbed.tsx:20-21`, `formEmbed.tsx:154-155`, `formEmbed.tsx:211-212`, `formEmbed.tsx:244-245`, `formEmbed.tsx:270-271`, `formEmbed.tsx:494-497`; editor `FormEmbedEditors.tsx:495-506`; `inputSize` at `FormEmbedEditors.tsx:564-574` is TASK-242 token work, not TASK-244 surface clear | TASK-244-04-02 | `tests/vitest/widgets/formEmbed.test.tsx`; `tests/vitest/ui/form-embed-editor-wave.test.tsx`; `_docs/_WIDGETS/FORM_EMBED.md` |
| `contact` | `clear-required` | `contact.tsx:30-32`, `contact.tsx:179-181`, `contact.tsx:204-206`, `contact.tsx:261-265`, `contact.tsx:299-303`; editor `ContactEditors.tsx:619-636` | TASK-244-04-02 | `tests/vitest/widgets/contact.test.tsx`; `tests/vitest/ui/contact-editor-wave.test.tsx`; `_docs/_WIDGETS/CONTACT.md` |
| `navigation` | `clear-required` | `navigation.tsx:62-67`, `navigation.tsx:196-201`, `navigation.tsx:320-343`, `navigation.tsx:430-436`; editor `NavigationEditors.tsx:1049-1098`, `NavigationEditors.tsx:1191-1198` | TASK-244-04-02 | `tests/vitest/widgets/navigation.test.tsx`; `tests/vitest/ui/navigation-editor-wave.test.tsx`; `_docs/_WIDGETS/NAVIGATION.md` |
| `footer` | `clear-required` | `footer.tsx:38`, `footer.tsx:119`, `footer.tsx:303`; editor `FooterEditors.tsx:560-564` | TASK-244-04-02 | `tests/vitest/widgets/footer.test.tsx`; `tests/vitest/ui/footer-editor-wave.test.tsx`; `_docs/_WIDGETS/FOOTER.md` |
| `screen-record-header` | `clear-required` | `screenRecordHeader.tsx:88-89`, `screenRecordHeader.tsx:107` force card/compact/pill surfaces | TASK-244-03-01 | `tests/vitest/widgets/screenWidgets.test.tsx`; `ScreenEditors.tsx`; create or extend `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `screen-field-value` | `clear-required` | `screenFieldValue.tsx:80`, `screenFieldValue.tsx:99` force inline/stacked field surfaces | TASK-244-03-01 | `tests/vitest/widgets/screenWidgets.test.tsx`; `ScreenEditors.tsx`; create or extend `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `screen-field-group` | `clear-required` | `screenFieldGroup.tsx:79-80` force subtle/default group frame surfaces; `screenFieldGroup.tsx:105` is an explicit empty-group builder placeholder and must stay intentional unless product chooses to make placeholder styling user-configurable | TASK-244-03-01 | `tests/vitest/widgets/screenWidgets.test.tsx`; `ScreenEditors.tsx`; create or extend `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`; `_docs/WIDGETS.md` |
| `screen-two-column` | `clear-required` | `screenTwoColumn.tsx:93` forces the two-column frame; `screenTwoColumn.tsx:111` is an explicit empty drop-area builder placeholder and must stay intentional unless product chooses to make placeholder styling user-configurable | TASK-244-03-01 | `tests/vitest/widgets/screenWidgets.test.tsx`; `ScreenEditors.tsx`; create or extend `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`; `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` |

## Explicit Exclusions

Do not promote these to implementation unless a leaf verifies they are product
surface bugs. The matrix above is the binding owner map; exclusions below are
not permission to skip a `clear-required` row.

- admin-only widget library cards, previews, drawers, and skeletons;
- empty/error/success/destructive/warning state colors;
- form validation and status message colors;
- media placeholder backgrounds shown only when content is missing;
- intentional public layout/placeholders in `template-section`, `split-layout`,
  `stack`, `spacer`, and empty `section` regions unless they become persisted
  configurable widget surfaces;
- `divider`, because current public output has no background/surface contract;
- `section` gradient runtime, because empty endpoints already remove the
  gradient; Section `style.backgroundColor` remains clear-required through
  TASK-244-02-03;
- TASK-242 token controls such as spacing, width, radius, typography, and size.

## Pseudocode

Use a simple scanner during implementation review.

```sh
rg -n "gradient|backgroundImage|background(Color)?|bg-gradient|bg-\\[var\\(--color|bg-background|bg-muted|overlay|surface" core/widgets/core
rg -n "Background|Surface|Overlay|ColorField|GradientField|Clear" core/admin/ui/widgets/editors
```

Then map every finding to exactly one leaf owner. Do not leave a broad
"composite widgets" bucket without naming the runtime, editor, test, and docs
files.

## Security Contract

- Visibility:
  - internal task inventory for admin editor payloads and public widget runtime
    output.
- Auth model:
  - no new endpoint is introduced;
  - implementation leaves keep the existing authenticated admin save flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this inventory does not introduce an internal API-key
    mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every `clear-required` row that adds or changes `style` fields must keep
    strict reject-unknown schema coverage.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - inventory rows must not recommend raw user-controlled Tailwind class
    interpolation for colors, gradients, overlays, or surfaces.

## Testing Requirements

- Documentation-only validation:
  - `git diff --check`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- No runtime tests are required in this inventory leaf unless it is implemented
  together with code changes.

## Documentation Updates Required

- This inventory file.
- `_docs/_TASKS/README.md` status only when this leaf moves state.

## Acceptance Criteria

1. Inventory covers every widget listed in `createCoreWidgetDefinitions`.
2. Every finding has one classification and one owner leaf.
3. Exclusions are explicit and not used to hide real user-facing surfaces.
4. Current test owners are listed before implementation begins.
5. Every `clear-required` row has enough line/file context for implementation
   to start without rediscovering ownership.
