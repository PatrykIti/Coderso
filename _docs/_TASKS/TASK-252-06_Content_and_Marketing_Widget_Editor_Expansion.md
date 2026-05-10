# TASK-252-06: Content and Marketing Widget Editor Expansion

# FileName: TASK-252-06_Content_and_Marketing_Widget_Editor_Expansion.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-03, TASK-252-04
**Status:** To Do

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
- Use research from TASK-252-02 to decide mode/preset expansion:
  - `feature-grid`: icon cards, bento/grid modes, media feature rows.
  - `testimonials`: single quote, carousel-ready list, cards grid, rating/source
    visibility.
  - `pricing-plans`: monthly/annual labels, highlighted plan, feature groups,
    CTA styles.
  - `faq-accordion`: categories, searchable/tabbed FAQ mode only if justified by
    current UX needs.
  - `cta-banner`: compact strip, split CTA, badge/announcement CTA, countdown
    only if it stays schema-first and deterministic.
  - `logo-cloud`: marquee/static/grid modes with reduced-motion fallback.
  - `gallery-mosaic`: layout presets, captions, overlay controls, media
    selection clarity.
  - `stats-kpi`: cards/strip modes, prefix/suffix, trend labels.
  - `team`: card/list/profile modes, social links, photo shape.
  - `rich-text-section`: editorial layouts, safe typography presets, no unsafe
    raw HTML expansion.
  - `compare-timeline`: clearer track/segment editor, current/highlight states.
- Do not widen widgets into unrelated features. If a requested capability is a
  new product surface, create a separate task instead of overloading the widget.

## Sub-Tasks

- [ ] Convert shared marketing/content editor sections to the TASK-252-01 IA.
- [ ] Decide mode/preset expansion per widget using TASK-252-02 research.
- [ ] Add stable metadata for repeated item, media, CTA, variant, and color
  controls.
- [ ] Update schema/default/normalizer/render contracts only where expansion
  requires it.
- [ ] Update focused runtime/editor tests for every changed widget.
- [ ] Update existing `_docs/_WIDGETS` docs for every changed widget.

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
- Matching docs under `_docs/_WIDGETS/*.md`.

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

function planWidgetExpansion(widgetType: string, research: ResearchCard[]) {
  const usefulPatterns = research.filter((card) => card.codersoFit === "yes");
  return {
    widgetType,
    newModes: deriveModes(usefulPatterns),
    schemaFields: deriveSchemaFields(usefulPatterns),
    visualSections: deriveVisualSections(usefulPatterns),
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
    <WidgetControlRow id={`feature-grid.items.${index}.title`} label="Title">
      <Input value={item.title} onChange={...} />
    </WidgetControlRow>
  </WidgetEditorSection>
));
```

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
  - link/href fields must keep safe URL validation;
  - rich-text changes must preserve the existing sanitizer boundary and avoid
    raw unsafe HTML.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
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

## Acceptance Criteria

- Each content/marketing widget has a clearly grouped Visual editor.
- Added flexibility is schema-first and tied to real product use cases.
- Repeated item editors expose stable labels and automation metadata.
- Runtime output remains backward compatible for existing saved pages.
