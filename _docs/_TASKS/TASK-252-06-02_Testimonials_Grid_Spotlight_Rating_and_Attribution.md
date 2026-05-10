# TASK-252-06-02: Testimonials Grid Spotlight Rating and Attribution

# FileName: TASK-252-06-02_Testimonials_Grid_Spotlight_Rating_and_Attribution.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Give testimonials grid/spotlight/rating/avatar/company controls while keeping carousel behavior opt-in and reduced-motion safe.

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

- Keep: grid, spotlight, rating, avatar shape, company/logo attribution.
- Adapt: carousel-ready list only as opt-in and reduced-motion safe.
- Reject: always-on carousel motion and raw testimonial embeds.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `testimonials`.
- `Visual`: `Layout`, `Quotes`, `Attribution`, `Rating`, `Avatar and logo`.
- `Advanced`: `Motion diagnostics`, `Legacy item mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/testimonials.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
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
function normalizeTestimonialsItem(raw: unknown, index: number) {
  return {
    id: normalizeStableId(raw.id, `testimonials-${index + 1}`),
    title: readTrimmedString(raw.title),
    href: normalizeSafeHref(raw.href),
  };
}

function TestimonialsVisualEditor(props: WidgetEditorProps<TestimonialsData>) {
  return (
    <WidgetEditorSection id="testimonials.items" title="Quotes">
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id} id={`testimonials.items.${index}.title`} label="Title">
          <Input value={item.title} onChange={...} />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/testimonials/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/testimonials.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
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
  - Link and media fields must keep existing safe URL/media validation.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
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
