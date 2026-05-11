# TASK-252-06-02: Testimonials Grid Spotlight Rating and Attribution

# FileName: TASK-252-06-02_Testimonials_Grid_Spotlight_Rating_and_Attribution.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Give testimonials grid, spotlight, rating, and avatar-shape controls first.
Company/logo attribution and carousel behavior stay Adapt-only unless the
implementation moves schema/defaults/normalizer/render/editor/tests together.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/testimonials/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/testimonials/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/testimonials/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/testimonials/MATRIX.md`; for this leaf, start from the current owner fields `header`, `testimonials`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: quote card grid, single spotlight quote, ratings, avatar shape, and concise author metadata from `_docs/_WIDGETS/tmp/testimonials/MATRIX.md`; add schema-owned `mode`, `featuredItemId`, item-level `rating`, `style.ratingVisibility`, `style.ratingScale`, and `style.avatarShape` fields in `core/widgets/core/testimonials.tsx` so the implementation does not rely on ad hoc variant-only inference.
- Adapt: company/logo metadata, masonry, and carousel behavior remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `testimonials`.
- `Visual`: `Layout`, `Quotes`, `Attribution`, `Rating`, `Avatar shape`.
- `Advanced`: `Legacy item mapping`, `Attribution diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/testimonials.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/testimonials.test.tsx`
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/_WIDGETS/tmp/testimonials/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-02_Testimonials_Grid_Spotlight_Rating_and_Attribution.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type TestimonialsMode = "grid" | "spotlight";
type TestimonialsAvatarShape = "circle" | "rounded" | "square";
type TestimonialsRatingVisibility = "show" | "hide";
type TestimonialsRatingScale = 5 | 10;

function normalizeTestimonialsData(data: TestimonialsData): TestimonialsData {
  const testimonials = normalizeTestimonialItems(data.testimonials);

  return {
    mode: normalizeTestimonialsMode(data.mode),
    featuredItemId: normalizeFeaturedTestimonialId(data.featuredItemId, testimonials),
    header: normalizeTestimonialsHeader(data.header),
    testimonials,
    style: normalizeTestimonialsStyle({
      ...data.style,
      avatarShape: normalizeTestimonialsAvatarShape(data.style?.avatarShape),
      ratingVisibility: normalizeTestimonialsRatingVisibility(data.style?.ratingVisibility),
      ratingScale: normalizeTestimonialsRatingScale(data.style?.ratingScale),
    }),
  };
}

function normalizeTestimonialItem(item: TestimonialItem, index: number): TestimonialItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `testimonials-${index + 1}`),
    rating: normalizeTestimonialRating(item.rating),
  };
}

function TestimonialsVisualEditor(props: WidgetEditorProps<TestimonialsData>) {
  return (
    <WidgetEditorSection id="testimonials.testimonials" title="Testimonials">
      <WidgetControlRow id="testimonials.mode" label="Mode" data-widget-control="testimonials.mode">
        <SegmentedControl value={props.value.mode ?? "grid"} onChange={(mode) => props.onChange(updateTestimonialsData(props.value, { mode }))} />
      </WidgetControlRow>
      <WidgetControlRow id="testimonials.featuredItemId" label="Featured quote" data-widget-control="testimonials.featuredItemId">
        <Select value={props.value.featuredItemId ?? ""} onChange={(featuredItemId) => props.onChange(updateTestimonialsData(props.value, { featuredItemId }))} />
      </WidgetControlRow>
      <WidgetControlRow id="testimonials.style.avatarShape" label="Avatar shape" data-widget-control="testimonials.style.avatarShape">
        <SegmentedControl value={props.value.style?.avatarShape ?? "circle"} onChange={(avatarShape) => props.onChange(updateTestimonialsStyle(props.value, { avatarShape }))} />
      </WidgetControlRow>
      <WidgetControlRow id="testimonials.style.ratingVisibility" label="Rating visibility" data-widget-control="testimonials.style.ratingVisibility">
        <SegmentedControl value={props.value.style?.ratingVisibility ?? "show"} onChange={(ratingVisibility) => props.onChange(updateTestimonialsStyle(props.value, { ratingVisibility }))} />
      </WidgetControlRow>
      <WidgetControlRow id="testimonials.style.ratingScale" label="Rating scale" data-widget-control="testimonials.style.ratingScale">
        <SegmentedControl value={props.value.style?.ratingScale ?? 5} onChange={(ratingScale) => props.onChange(updateTestimonialsStyle(props.value, { ratingScale }))} />
      </WidgetControlRow>
      {props.value.testimonials.map((item, index) => (
        <Fragment key={item.id ?? index}>
          <WidgetControlRow id={`testimonials.testimonials.${index}.quote`} label="Quote" data-widget-control={`testimonials.testimonials.${index}.quote`}>
            <Input
              value={item.quote ?? ""}
              onChange={(quote) => props.onChange(updateTestimonialItem(props.value, index, { quote }))}
            />
          </WidgetControlRow>
          <WidgetControlRow id={`testimonials.testimonials.${index}.rating`} label="Rating" data-widget-control={`testimonials.testimonials.${index}.rating`}>
            <NumberInput min={0} max={props.value.style?.ratingScale ?? 5} value={item.rating ?? 0} onChange={(rating) => props.onChange(updateTestimonialItem(props.value, index, { rating }))} />
          </WidgetControlRow>
        </Fragment>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/testimonials/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/testimonials.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Own spotlight mode explicitly: `mode: "grid" | "spotlight"` and
  `featuredItemId` must be added to schema/defaults/normalizer/render/editor/tests
  together, with legacy variant values mapped non-destructively during
  normalization.
- Preserve current item-level rating data and add bounded rating normalization.
  Add `style.ratingVisibility: "show" | "hide"` and bounded
  `style.ratingScale: 5 | 10` ownership in schema/defaults/normalizer/render/
  editor/tests. Normalize item ratings against the selected scale and clamp
  legacy ratings non-destructively.
- Add constrained `style.avatarShape` ownership in schema/defaults/normalizer/
  render/editor/tests; do not infer avatar shape from arbitrary classes.
- Add stable `data-widget-control` metadata for testimonial add/remove/reorder
  actions, avatar/media rows, quote/author/source/rating rows, rating
  visibility controls, and style color fields.
- Refactor `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `testimonials` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `testimonials` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/testimonials.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    `core/widgets/core/widgetSafeHref.ts` helper with identical allowed/rejected
    protocol tests before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change; include accepted-new-field, unknown-field rejection, and
  legacy-normalization assertions for this widget.
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-02_Testimonials_Grid_Spotlight_Rating_and_Attribution.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `testimonials` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
