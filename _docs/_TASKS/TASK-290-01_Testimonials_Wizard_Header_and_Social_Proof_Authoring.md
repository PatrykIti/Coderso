# TASK-290-01: Testimonials Wizard Header and Social Proof Authoring

# FileName: TASK-290-01_Testimonials_Wizard_Header_and_Social_Proof_Authoring.md

**Priority:** High
**Category:** Widgets + Testimonials + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-06-03, TASK-290
**Status:** Done (2026-05-22)

---

## Overview

Expand Testimonials Wizard authoring so first-time users can configure the
section header and essential social-proof fields without switching immediately
to Visual mode.

This leaf covers the non-avatar parts of
`REPORT_TESTIMONIALS_WIDGET.md:177-182`:

- UX-04: Wizard exposes only quote and author, while rating, role, and source
  label stay hidden in Visual.
- UX-05: Wizard exposes only the section title, while eyebrow and description
  stay hidden in Visual.

This leaf does not own BUG-02 variant/count desync; TASK-256 handles that shared
atomic editor update contract. It also does not own the avatar portion of
UX-04; TASK-290-03 implements Wizard and Visual avatar authoring together with
Media Library picking and URL validation.

## Scope Boundary

In scope:

- Add Wizard fields for section `eyebrow` and `description`.
- Add Wizard fields for testimonial `rating` and `sourceLabel`.
- Add Wizard fields for testimonial `role`.
- Preserve the current Wizard count control and repeated item structure.

Out of scope:

- Variant/count atomic updates owned by TASK-256.
- Shared editor mode IA or Advanced duplicate-token policy owned by TASK-256.
- Wizard and Visual avatar authoring, Media Library picker, and avatar URL
  validation owned by TASK-290-03.
- Rich quote formatting owned by TASK-290-06.

## Sub-Tasks

- [x] Update Wizard header copy controls to include `eyebrow`, `title`, and
  `description` in a compact beginner-friendly order.
- [x] Add per-testimonial rating controls in Wizard using the existing bounded
  `ratingOptions` model.
- [x] Add per-testimonial role and source label controls.
- [x] Ensure every Wizard field updates the same normalized
  `TestimonialsData` model used by Visual and Advanced.
- [x] Keep count and item normalization backward compatible for existing pages.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Extend `TestimonialsWizardEditor` controls and reuse `updateHeader`, `updateItem`, and rating options. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add Wizard interaction coverage for eyebrow, description, rating, role, and source label. |
| `tests/vitest/widgets/testimonials.test.tsx` | Update SSR editor smoke expectations if Wizard section labels change. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document final Wizard field coverage. |

## Implementation Pseudocode

Wizard header flow:

```tsx
function TestimonialsWizardEditor(props) {
  const normalized = normalizeValue(props.value);
  return (
    <EditorSection title="Section copy">
      <Input
        value={normalized.header?.eyebrow ?? ""}
        onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
      />
      <Input
        value={normalized.header?.title ?? ""}
        onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
      />
      <Textarea
        value={normalized.header?.description ?? ""}
        onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
      />
    </EditorSection>
  );
}
```

Repeated item flow:

```tsx
testimonials.map((testimonial, index) => (
  <Select
    value={String(testimonial.rating ?? 5)}
    onValueChange={(next) => updateItem(value, onChange, index, { rating: Number(next) })}
  />
));
```

Error handling:

- Invalid or missing rating values still normalize through
  `normalizeTestimonialsItems`.
- Empty optional strings stay empty/omitted through existing normalization.
- Wizard changes must not truncate existing Visual-only testimonial fields.

Regression test shape:

- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - Wizard updates `eyebrow`, `title`, `description`, `role`, `sourceLabel`,
    and `rating` without dropping existing item fields.
  - Switching Wizard count still preserves authored role/source/rating fields on
    surviving items.
- `tests/vitest/widgets/testimonials.test.tsx`
  - Wizard SSR smoke includes the expanded beginner-facing field labels and
    preserves normalized defaults.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless new fields are added, which is not
  expected for this leaf.
- Anti-abuse: plain text fields only; no raw HTML, arbitrary classes, or script
  data.
- Secret handling: no secrets or privileged settings in Wizard data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` Wizard mode coverage.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` UX-04 and UX-05 with
  fixed/deferred evidence after implementation.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard users can author the core header and social-proof fields without
  switching to Visual mode.
- Existing Testimonials data is not truncated when Wizard edits run.
- Focused UI tests prove the emitted payload for all new Wizard controls.

## Completion Notes (2026-05-22)

- `TestimonialsWizardEditor` now exposes `eyebrow`, `title`, `description`,
  `role`, `sourceLabel`, and bounded `rating` controls without dropping the
  existing normalized item model.
- Wizard updates still flow through the same normalized `TestimonialsData`
  helpers used by Visual and Advanced, so count changes preserve the surviving
  authored social-proof fields.
- Focused happy-dom coverage now proves the Wizard emits the expanded payload
  while preserving backward-compatible item normalization for existing pages.
