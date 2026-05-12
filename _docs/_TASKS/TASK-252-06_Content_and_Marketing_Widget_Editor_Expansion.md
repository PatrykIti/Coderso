# TASK-252-06: Content and Marketing Widget Editor Expansion

# FileName: TASK-252-06_Content_and_Marketing_Widget_Editor_Expansion.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

Apply the shared TASK-252 editor IA to content and marketing widgets, then
expand each widget only where the added flexibility maps to a real page-building
need.

Hero and Timeline have dedicated subtasks because they contain explicit product
gaps. This task covers the rest of the marketing/content family and keeps the
same principle: one widget type per product surface, with variants/modes/presets
inside the editor instead of duplicate widget types.

## Widgets In Scope

- `feature-grid`
- `testimonials`
- `pricing-plans`
- `faq-accordion`
- `cta-banner`
- `logo-cloud`
- `gallery-mosaic`
- `stats-kpi`
- `team`
- `rich-text-section`
- `compare-timeline`

## Business Requirements

- Bring every Visual editor to the same sectioned control model as TASK-252-01.
- Add stable `data-widget-control` metadata for repeated item controls, reorder
  actions, variant cards, color fields, media fields, and CTA/link fields.
- Use the completed `_docs/_WIDGETS/tmp/<widget>/` research archive for every
  widget in this family. Each implementation leaf must cite the widget-local
  Keep/Adapt/Reject matrix before finalizing its option list.
- Use research from TASK-252-02 to decide mode/preset expansion:
  - `feature-grid`: keep icon-card/row basics and optional links; treat bento,
    badges/categories, hover, and rich media rows as Adapt-only.
  - `testimonials`: keep grid/spotlight/rating/avatar-shape basics; company/
    logo metadata and carousel/motion remain Adapt-only.
  - `pricing-plans`: keep tiers, highlight, billing toggle, and feature
    marker controls; preserve the current derived `comparison-rows` variant,
    while enterprise/custom price labels, explicit comparison-row schema, and
    mobile fallback stay Adapt-only.
  - `faq-accordion`: keep question/answer, support/contact CTA, icon
    placement, and single/multiple/default-open behavior; categories and
    search remain Adapt-only.
  - `cta-banner`: keep compact/split/high-contrast plus badge/icon CTA strip;
    background media and named animation presets stay Adapt-only, while
    countdown urgency is rejected for this widget.
  - `logo-cloud`: keep grid/intro/tone/rows; treat marquee as Adapt-only with
    reduced-motion fallback.
  - `gallery-mosaic`: layout presets, captions, media selection clarity, and
    explicit alt text; overlay text stays Adapt-only.
  - `stats-kpi`: cards/strip modes, prefix/suffix, and icons; trend labels stay
    Adapt-only.
  - `team`: member grid, social links, photo shape, and fallback rendering;
    existing `spotlight` payloads are preservation-only, while explicit
    selected-featured-member/profile controls stay Adapt-only.
  - `rich-text-section`: keep prose/width plus badge/eyebrow and CTA; quote/
    media and editorial layout additions stay Adapt-only.
  - `compare-timeline`: two-side comparison, dated segments, track labels, and
    current/highlight states; scroll narrative/progress stays Adapt-only.
- Do not widen widgets into unrelated features. If a requested capability is a
  new product surface, create a separate task instead of overloading the widget.

## Sub-Tasks

This parent is now executed through physical per-widget leaves. Do not implement this parent as one broad batch; complete the leaves below in dependency order.

- [x] TASK-252-06-01: Feature Grid Icon Cards Rows and Links
- [x] TASK-252-06-02: Testimonials Grid Spotlight Rating and Attribution
- [x] TASK-252-06-03: Pricing Plans Tiers Billing Toggle and Highlight
- [x] TASK-252-06-04: FAQ Accordion Support CTA Icon Placement and Defaults
- [x] TASK-252-06-05: CTA Banner Compact Split Badge and Icon
- [x] TASK-252-06-06: Logo Cloud Grid Tone Rows and Accessibility
- [x] TASK-252-06-07: Gallery Mosaic Layout Captions and Alt Text
- [x] TASK-252-06-08: Stats KPI Values Icons and Display Modes
- [x] TASK-252-06-09: Team Members Photo Shape Socials and Fallbacks
- [x] TASK-252-06-10: Rich Text Section Prose Presets Width Badge and CTA
- [x] TASK-252-06-11: Compare Timeline Two Track Segments Status and Highlight

## Files to Change

- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `core/admin/ui/widgets/editors/TeamEditors.tsx`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- Matching widget contracts under `core/widgets/core/*.tsx` when schema/defaults
  or render output changes.
- Shared safe-href owner when any leaf touches public link fields:
  - `core/widgets/core/widgetSafeHref.ts`
  - `tests/vitest/widgets/widgetSafeHref.test.ts`
- Matching docs under `_docs/_WIDGETS/*.md`.
- Existing `_docs/_WIDGETS/tmp/<widget>/README.md` and `MATRIX.md` as evidence
  references; update them only if implementation finds a concrete research
  mismatch.

## Implementation Pseudocode

For each widget, run the same conversion checklist.

```ts
type WidgetExpansionDecision = {
  widgetType: string;
  newModes: string[];
  schemaFields: string[];
  visualSections: string[];
  advancedSections: string[];
  tests: string[];
};

type WidgetSafeHref = string | undefined;

function normalizeWidgetSafeHref(value: unknown): WidgetSafeHref {
  // Shared owner: core/widgets/core/widgetSafeHref.ts.
  // Allow relative paths, hash links, and http(s) URLs. Reject javascript:,
  // data:, vbscript:, protocol-relative URLs, unknown protocols, and malformed
  // values before render.
}

function planWidgetExpansion(widgetType: string, research: ResearchCard[]) {
  const requiredPatterns = research.filter((card) => card.decision === "Keep");
  const conditionalPatterns = research.filter((card) => card.decision === "Adapt");
  return {
    widgetType,
    newModes: deriveModes(requiredPatterns),
    schemaFields: deriveSchemaFields(requiredPatterns),
    visualSections: deriveVisualSections(requiredPatterns),
    conditionalNotes: summarizeAdaptOnlyPatterns(conditionalPatterns),
    advancedSections: ["Technical tokens", "Diagnostics"].filter(isNeeded),
  };
}
```

Render repeated item editors through stable control ids:

```tsx
items.map((item, index) => (
  <WidgetEditorSection
    key={item.id}
    id={`item-${index + 1}`}
    title={`Item ${index + 1}`}
  >
    <WidgetControlRow id={`feature-grid.items.${index}.title`} label="Title" data-widget-control={`feature-grid.items.${index}.title`}>
      <Input value={item.title} onChange={handleControlChange} />
    </WidgetControlRow>
  </WidgetEditorSection>
));
```

Apply the same metadata contract to non-text controls and item actions:

```tsx
<WidgetActionButton data-widget-control={`feature-grid.items.${index}.moveUp`} aria-label="Move feature up" />
<MediaPicker data-widget-control={`feature-grid.items.${index}.image`} value={item.image} onChange={handleMediaChange} />
<LinkInput data-widget-control={`feature-grid.items.${index}.ctaHref`} value={item.ctaHref} onChange={handleLinkChange} />
<ColorField data-widget-control="cta-banner.style.primaryButtonBg" value={style.primaryButtonBg} onChange={handleStyleChange} />
```

When a leaf touches repeated items, variant/mode controls, color fields, media
fields, CTA/link fields, or add/remove/reorder actions, it must list the stable
`data-widget-control` metadata for the touched controls before implementation
starts.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered widget output is public.
- Auth model:
  - no new endpoint;
  - existing page/template save calls remain authenticated admin writes.
- RBAC:
  - unchanged page/template write permissions.
- CSRF:
  - unchanged admin CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every changed widget schema must reject unknown fields and normalize legacy
    payloads through its owner module.
- Anti-abuse:
  - no public write endpoint;
  - link/href fields must use `core/widgets/core/widgetSafeHref.ts`; the helper
    owns the allowed scheme list once, rejects `javascript:`, `data:`,
    `vbscript:`, protocol-relative URLs, unknown protocols, and malformed
    values, and is covered by shared allowed/rejected protocol tests plus
    per-widget render/normalizer assertions;
  - rich-text changes must preserve the existing sanitizer boundary and avoid
    raw unsafe HTML.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
- Focused runtime/editor suites as widgets are touched:
  - `tests/vitest/widgets/featureGrid.test.tsx`
  - `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
  - `tests/vitest/widgets/testimonials.test.tsx`
  - `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - `tests/vitest/widgets/pricingPlans.test.tsx`
  - `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/widgets/ctaBanner.test.tsx`
  - `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `tests/vitest/widgets/logoCloud.test.tsx`
  - `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  - `tests/vitest/widgets/statsKpi.test.tsx`
  - `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
  - `tests/vitest/widgets/team.test.tsx`
  - `tests/vitest/ui/team-editor-wave.test.tsx`
  - `tests/vitest/widgets/richTextSection.test.tsx`
  - `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  - `tests/vitest/widgets/compareTimeline.test.tsx`
  - `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- Add `tests/vitest/widgets/renderer.test.tsx` coverage when slot or shared
  renderer behavior changes.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- Existing docs for all widgets in scope.
- `_docs/_WIDGETS/tmp/<widget>/*` only when research artifacts are created.
- `_docs/_TASKS/TASK-252*.md`
- `_docs/_TASKS/README.md` on status, title, or board row changes.
- `_docs/_CHANGELOG/README.md` and a new or consolidated changelog entry
  listing `TASK-252-06` when this parent is marked `Done`.

## Acceptance Criteria

- Each content/marketing widget has a clearly grouped Visual editor.
- Added flexibility is schema-first, tied to real product use cases, and backed
  by per-widget research decisions.
- Repeated item editors expose stable labels and automation metadata.
- Runtime output remains backward compatible for existing saved pages.
